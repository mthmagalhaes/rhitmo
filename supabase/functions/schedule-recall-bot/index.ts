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

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RECALL_API_KEY = Deno.env.get("RECALL_API_KEY");

  if (!RECALL_API_KEY) {
    return new Response(JSON.stringify({ error: "RECALL_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Parse body
    const body = await req.json();
    const { meeting_id, meeting_url, member_id, start_time } = body;

    if (!meeting_url || !start_time) {
      return new Response(JSON.stringify({ error: "meeting_url and start_time are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if bot already scheduled for this meeting
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (meeting_id) {
      const { data: existing } = await supabaseAdmin
        .from("recall_bots")
        .select("id, status")
        .eq("user_id", userId)
        .eq("meeting_id", meeting_id)
        .not("status", "eq", "error")
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "Bot already scheduled for this meeting", bot: existing }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Schedule bot via Recall.ai API
    const joinAt = new Date(new Date(start_time).getTime() - 60 * 1000).toISOString();

    const recallResponse = await fetch("https://us-west-2.recall.ai/api/v1/bot/", {
      method: "POST",
      headers: {
        "Authorization": `Token ${RECALL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meeting_url: meeting_url,
        join_at: joinAt,
        bot_name: "Rhitmo",
        transcription_options: {
          provider: "default",
        },
        recording_mode: "speaker_view",
      }),
    });

    const recallData = await recallResponse.json();

    if (!recallResponse.ok) {
      console.error("Recall.ai API error:", recallData);
      return new Response(JSON.stringify({ error: "Failed to schedule bot", details: recallData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save bot record
    const { data: botRecord, error: insertError } = await supabaseAdmin
      .from("recall_bots")
      .insert({
        user_id: userId,
        meeting_id: meeting_id || null,
        member_id: member_id || null,
        recall_bot_id: recallData.id,
        meeting_url: meeting_url,
        status: "scheduled",
        scheduled_at: joinAt,
      })
      .select("id, status, scheduled_at")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Bot scheduled but failed to save record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Bot scheduled: ${recallData.id} for meeting ${meeting_id || meeting_url}`);

    return new Response(JSON.stringify({ success: true, bot: botRecord, recall_bot_id: recallData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
