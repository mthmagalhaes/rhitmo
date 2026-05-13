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
import {
  fetchAllRecallParticipantsDetailed,
  isLeaderPresent,
} from "../_shared/recallParticipants.ts";

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
      .select("id, recall_bot_id, leader_email, status, leader_detected, trigger_source, leader_check_due_at, leader_check_attempts, user_id")
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
          supabaseAdmin as any,
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
  supabaseAdmin: any,
  bot: {
    id: string;
    recall_bot_id: string;
    leader_email: string | null;
    status: string;
    leader_detected: boolean;
    leader_check_attempts?: number;
    user_id?: string;
  },
  recallApiKey: string,
): Promise<"detected" | "removed" | "skipped" | "deferred"> {
  const botId = bot.recall_bot_id;

  if (!bot.leader_email) {
    await supabaseAdmin
      .from("recall_bots")
      .update({ leader_check_due_at: null })
      .eq("id", bot.id);
    return "skipped";
  }

  const leaderEmail = bot.leader_email.toLowerCase();
  const leaderPrefix = leaderEmail.split("@")[0];

  // Resolve leader display-name candidates (Google Meet hides emails for non-Calendar attendees)
  const nameCandidates: string[] = [leaderPrefix];
  try {
    if (bot.user_id) {
      const { data: leaderUser } = await supabaseAdmin.auth.admin.getUserById(bot.user_id);
      const meta = leaderUser?.user?.user_metadata ?? {};
      if (meta.full_name) nameCandidates.push(meta.full_name as string);
      if (meta.name) nameCandidates.push(meta.name as string);
    }
  } catch (e) {
    console.warn(`Bot ${botId}: could not load leader user_metadata:`, e);
  }

  // Use the detailed resolver (legacy + participant_events + inconclusive flag)
  const result = await fetchAllRecallParticipantsDetailed(botId, recallApiKey);

  const leaderFound = isLeaderPresent(result.participants, {
    email: leaderEmail,
    names: nameCandidates,
  });

  if (leaderFound) {
    console.log(`Bot ${botId}: leader detected in deferred check ✓`);
    await supabaseAdmin
      .from("recall_bots")
      .update({ leader_detected: true, leader_check_due_at: null })
      .eq("id", bot.id);
    return "detected";
  }

  // Resolver couldn't see anything reliable yet → defer, do NOT kill the bot.
  if (result.status === "inconclusive") {
    const attempts = (bot.leader_check_attempts ?? 0) + 1;
    const MAX_ATTEMPTS = 3;
    if (attempts < MAX_ATTEMPTS) {
      const nextDue = new Date(Date.now() + 3 * 60 * 1000).toISOString();
      console.log(
        `Bot ${botId}: resolver inconclusive (attempt ${attempts}/${MAX_ATTEMPTS}) — deferring to ${nextDue}`,
      );
      await supabaseAdmin
        .from("recall_bots")
        .update({
          leader_check_due_at: nextDue,
          leader_check_attempts: attempts,
        })
        .eq("id", bot.id);
      return "deferred";
    }
    console.warn(
      `Bot ${botId}: resolver still inconclusive after ${attempts} attempts — falling through to remove`,
    );
  }

  // Leader truly absent (or out of retries) — remove bot
  console.log(`Bot ${botId}: leader absent after grace window — removing`);

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
