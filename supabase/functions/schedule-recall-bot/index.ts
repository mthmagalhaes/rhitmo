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

    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.id;

    // Parse body
    const body = await req.json();
    const { meeting_id, meeting_url, member_id, start_time } = body;

    if (!meeting_url || !start_time) {
      return new Response(JSON.stringify({ error: "meeting_url and start_time are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check bot meeting cap based on plan
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user's workspace plan_tier and beta status
    const { data: workspaceData } = await supabaseAdmin
      .from("workspaces")
      .select("plan_tier, is_beta_user")
      .eq("owner_id", userId)
      .maybeSingle();

    // Also check if user is leader of a team in a workspace
    let planTier = workspaceData?.plan_tier || "pulse";
    let isBeta = workspaceData?.is_beta_user || false;

    if (!workspaceData) {
      const { data: teamData } = await supabaseAdmin
        .from("teams")
        .select("workspace_id, workspaces(plan_tier, is_beta_user)")
        .eq("leader_user_id", userId)
        .limit(1)
        .maybeSingle();
      if (teamData?.workspaces) {
        planTier = (teamData.workspaces as any).plan_tier || "pulse";
        isBeta = (teamData.workspaces as any).is_beta_user || false;
      }
    }

    // Define caps per plan
    const BOT_CAPS: Record<string, number> = { pulse: 0, pro: 20, business: 40 };
    const maxBotMeetings = isBeta ? Infinity : (BOT_CAPS[planTier] ?? 0);

    if (maxBotMeetings === 0) {
      return new Response(JSON.stringify({ error: "Seu plano não inclui transcrição com bot. Faça upgrade para Pro ou Business." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (maxBotMeetings !== Infinity) {
      // Count bots scheduled this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: botCount } = await supabaseAdmin
        .from("recall_bots")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .neq("status", "error")
        .gte("created_at", startOfMonth.toISOString());

      if ((botCount || 0) >= maxBotMeetings) {
        return new Response(JSON.stringify({ error: `Limite de ${maxBotMeetings} reuniões com bot atingido este mês. Faça upgrade para aumentar o limite.` }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check if bot already scheduled for this meeting (by meeting_id or meeting_url)

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

    // Fallback dedup by meeting_url (prevents duplicate bots for recurring meetings with same link)
    const { data: existingByUrl } = await supabaseAdmin
      .from("recall_bots")
      .select("id, status")
      .eq("user_id", userId)
      .eq("meeting_url", meeting_url)
      .not("status", "in", '("error","done","skipped_no_leader")')
      .maybeSingle();

    if (existingByUrl) {
      return new Response(JSON.stringify({ error: "Bot already scheduled for this meeting URL", bot: existingByUrl }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Schedule bot via Recall.ai API
    const joinAt = new Date(new Date(start_time).getTime() - 2 * 60 * 1000).toISOString();

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
        chat: {
          on_bot_join: {
            send_to: "everyone",
            message: "👋 Olá! Sou o assistente Rhitmo. Esta reunião está sendo transcrita para fins de anotações e desenvolvimento profissional. Se tiver dúvidas, fale com seu líder.",
            pin: true,
          },
          on_participant_join: {
            exclude_host: true,
            message: "👋 Olá! Esta reunião está sendo transcrita pelo Rhitmo para fins de anotações e desenvolvimento profissional.",
          },
        },
        recording_config: {
          transcript: {
            provider: {
              recallai_streaming: {
                mode: "prioritize_accuracy",
                language_code: "auto",
              },
            },
          },
        },
        automatic_leave: {
          waiting_room_timeout: 120,
          in_call_not_recording_timeout: 180,
          noone_joined_timeout: 300,
        },
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

    // Save bot record with leader email for presence detection
    const leaderEmail = authUser.email || null;

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
        leader_email: leaderEmail,
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

    console.log(`Bot scheduled: ${recallData.id} for meeting ${meeting_id || meeting_url} (provider: recallai_streaming/auto)`);

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
