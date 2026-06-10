// HR/Owner-scoped password reset: triggers a Supabase recovery email for a user
// who belongs to a workspace the caller administers (Owner or HR Admin).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, workspace_id } = await req.json();
    if (!email || !workspace_id) {
      return new Response(JSON.stringify({ error: "email and workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Caller must be Owner or HR Admin of this workspace.
    const { data: ws, error: wsErr } = await supabaseAdmin
      .from("workspaces")
      .select("id, owner_id, hr_admin_ids, is_active")
      .eq("id", workspace_id)
      .maybeSingle();
    if (wsErr || !ws || !ws.is_active) {
      return new Response(JSON.stringify({ error: "workspace not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerIsOwner = ws.owner_id === caller.id;
    const callerIsHr = Array.isArray(ws.hr_admin_ids) && ws.hr_admin_ids.includes(caller.id);
    if (!callerIsOwner && !callerIsHr) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Resolve target user by email and confirm they belong to this workspace.
    const { data: targetList } = await supabaseAdmin.rpc("admin_lookup_user_by_email", { p_email: email }).maybeSingle?.() ?? { data: null } as any;
    // Fallback: scan auth.users via admin API (paged) — but we can also use listUsers
    let targetId: string | null = (targetList as any)?.id ?? null;
    if (!targetId) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const found = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      targetId = found?.id ?? null;
    }
    if (!targetId) {
      return new Response(JSON.stringify({ error: "user not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Belongs to workspace if: is owner, is in hr_admin_ids, leads a team in ws, or is linked to a team_member in ws.
    const belongsToWs = ws.owner_id === targetId
      || (Array.isArray(ws.hr_admin_ids) && ws.hr_admin_ids.includes(targetId));
    let allowed = belongsToWs;
    if (!allowed) {
      const { count: leaderCount } = await supabaseAdmin
        .from("teams").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace_id).eq("leader_user_id", targetId);
      if ((leaderCount ?? 0) > 0) allowed = true;
    }
    if (!allowed) {
      const { data: tmRow } = await supabaseAdmin
        .from("team_members").select("id, teams!inner(workspace_id)")
        .eq("linked_user_id", targetId)
        .eq("teams.workspace_id", workspace_id)
        .limit(1).maybeSingle();
      if (tmRow) allowed = true;
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "user not in workspace" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Generate recovery link (Supabase sends the email automatically when generateLink type=recovery is called
    // with smtp configured; we mirror admin-reset-password behaviour).
    const origin = req.headers.get("origin") || "https://rhitmo.co";
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin}/auth` },
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: `Recovery email sent to ${email}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
