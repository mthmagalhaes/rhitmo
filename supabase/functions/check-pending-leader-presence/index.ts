// Cron-driven worker: removes Recall bots that joined an auto-scheduled
// calendar meeting but never saw the leader within the 5-minute grace window.
//
// Runs every minute via pg_cron. For each pending bot:
//   1. Calls Recall API to fetch current participants
//   2. If leader present → marks leader_detected=true, lets recording continue
//   3. If leader absent → calls bot/leave/, marks status=skipped_no_leader
//
// Manual bots (trigger_source='manual') are NEVER processed here — they trust
// the explicit leader action and are validated only at bot.done.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RECALL_API_KEY = Deno.env.get("RECALL_API_KEY");

  if (!RECALL_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RECALL_API_KEY not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Find auto_calendar bots whose grace window expired and leader still not detected
    const { data: pendingBots, error } = await supabaseAdmin
      .from("recall_bots")
      .select("id, recall_bot_id, leader_email, status, leader_detected, trigger_source, leader_check_due_at")
      .eq("status", "recording")
      .eq("leader_detected", false)
      .eq("trigger_source", "auto_calendar")
      .not("leader_check_due_at", "is", null)
      .lte("leader_check_due_at", new Date().toISOString())
      .limit(50);

    if (error) {
      console.error("Failed to query pending bots:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingBots || pendingBots.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`Processing ${pendingBots.length} bot(s) past leader-check grace window`);

    let detected = 0;
    let removed = 0;
    let errors = 0;

    for (const bot of pendingBots) {
      try {
        const result = await processBot(
          supabaseAdmin,
          bot,
          RECALL_API_KEY,
        );
        if (result === "detected") detected++;
        else if (result === "removed") removed++;
      } catch (e) {
        errors++;
        console.error(`Bot ${bot.recall_bot_id} processing failed:`, e);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed: pendingBots.length,
        detected,
        removed,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Worker error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

async function processBot(
  supabaseAdmin: ReturnType<typeof createClient>,
  bot: {
    id: string;
    recall_bot_id: string;
    leader_email: string | null;
    status: string;
    leader_detected: boolean;
  },
  recallApiKey: string,
): Promise<"detected" | "removed" | "skipped"> {
  const botId = bot.recall_bot_id;

  if (!bot.leader_email) {
    // No leader email to verify — clear the due_at so we stop retrying
    await supabaseAdmin
      .from("recall_bots")
      .update({ leader_check_due_at: null })
      .eq("id", bot.id);
    return "skipped";
  }

  const leaderEmail = bot.leader_email.toLowerCase();
  const leaderPrefix = leaderEmail.split("@")[0];

  // Fetch current participants
  const botResponse = await fetch(
    `https://us-west-2.recall.ai/api/v1/bot/${botId}/`,
    { headers: { Authorization: `Token ${recallApiKey}` } },
  );

  if (!botResponse.ok) {
    console.error(`Failed to fetch bot ${botId}: ${botResponse.status}`);
    return "skipped";
  }

  const botData = await botResponse.json();
  const participants = botData.meeting_participants || [];

  const leaderFound = participants.some(
    (p: { email?: string; name?: string }) => {
      if (p.email && p.email.toLowerCase() === leaderEmail) return true;
      if (p.name && p.name.toLowerCase().includes(leaderPrefix)) return true;
      return false;
    },
  );

  if (leaderFound) {
    console.log(`Bot ${botId}: leader detected in deferred check ✓`);
    await supabaseAdmin
      .from("recall_bots")
      .update({ leader_detected: true, leader_check_due_at: null })
      .eq("id", bot.id);
    return "detected";
  }

  // Leader still absent after grace window — remove bot
  console.log(`Bot ${botId}: leader absent after 5min grace — removing`);

  const leaveResponse = await fetch(
    `https://us-west-2.recall.ai/api/v1/bot/${botId}/leave/`,
    { method: "POST", headers: { Authorization: `Token ${recallApiKey}` } },
  );
  console.log(`Bot ${botId}: leave response ${leaveResponse.status}`);

  await supabaseAdmin
    .from("recall_bots")
    .update({
      status: "skipped_no_leader",
      leader_check_due_at: null,
      error_message:
        "Líder não detectado em 5 minutos de gravação — bot removido automaticamente",
    })
    .eq("id", bot.id);

  return "removed";
}
