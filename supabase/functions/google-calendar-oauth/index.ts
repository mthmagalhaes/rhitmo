import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let action = url.searchParams.get("action");

  if (!action && req.method === "POST") {
    try {
      const body = await req.json();
      action = body.action;
    } catch {
      // ignore parse errors
    }
  }

  try {
    // ═══════════════════════════════════
    // ACTION: authorize
    // ═══════════════════════════════════
    if (action === "authorize") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = user.id;

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/calendar.readonly",
        access_type: "offline",
        prompt: "consent",
        state: userId,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════
    // ACTION: callback
    // Suporta 2 modos:
    //   - GET (legado): redirect direto do Google → ?code=...&state=... → retorna 302
    //   - POST (novo): chamado pelo proxy /auth/google/callback no front com { code, state } → retorna JSON
    // ═══════════════════════════════════
    if (action === "callback") {
      const isPost = req.method === "POST";

      let code: string | null = null;
      let state: string | null = null;

      if (isPost) {
        try {
          const body = await req.json();
          code = body.code ?? null;
          state = body.state ?? null;
        } catch {
          return new Response(
            JSON.stringify({ error: "Invalid JSON body" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        code = url.searchParams.get("code");
        state = url.searchParams.get("state");
      }

      if (!code || !state) {
        if (isPost) {
          return new Response(
            JSON.stringify({ error: "Missing code or state" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response("Missing code or state", { status: 400, headers: corsHeaders });
      }

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok || !tokens.access_token) {
        console.error("Token exchange failed:", tokens);
        if (isPost) {
          return new Response(
            JSON.stringify({ error: "Token exchange failed", details: tokens }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response("Token exchange failed", { status: 400, headers: corsHeaders });
      }

      const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      let calendarEmail: string | null = null;
      try {
        const calResponse = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary",
          { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );
        if (calResponse.ok) {
          const calData = await calResponse.json();
          calendarEmail = calData.id || null;
        }
      } catch (e) {
        console.error("Failed to fetch calendar email:", e);
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { error: upsertError } = await supabaseAdmin
        .from("google_calendar_tokens")
        .upsert(
          {
            user_id: state,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expiry: tokenExpiry,
            calendar_email: calendarEmail,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        console.error("Failed to save tokens:", upsertError);
        if (isPost) {
          return new Response(
            JSON.stringify({ error: "Failed to save tokens" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response("Failed to save tokens", { status: 500, headers: corsHeaders });
      }

      // POST → retorna JSON pro front decidir navegação
      if (isPost) {
        return new Response(
          JSON.stringify({ success: true, calendar_email: calendarEmail }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // GET legado → redirect direto pro app
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: "https://rhitmo.co/dashboard?calendar=connected",
        },
      });
    }

    // ═══════════════════════════════════
    // ACTION: disconnect
    // ═══════════════════════════════════
    if (action === "disconnect") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = user.id;
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      await supabaseAdmin.from("google_calendar_tokens").delete().eq("user_id", userId);
      await supabaseAdmin.from("upcoming_meetings").delete().eq("user_id", userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
