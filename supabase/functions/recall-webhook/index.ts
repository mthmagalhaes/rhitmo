import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  fetchAllRecallParticipants,
  fetchAllRecallParticipantsDetailed,
  isLeaderPresent,
  matchMembersToParticipants,
  type RecallParticipant,
} from "../_shared/recallParticipants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, webhook-id, webhook-timestamp, webhook-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RECALL_API_KEY = Deno.env.get("RECALL_API_KEY")!;

  try {
    // SECURITY (recall_webhook_no_sig): verify Svix-style HMAC signature
    // before trusting the payload. Without this, anyone who knows the URL
    // can spoof bot.done events, trigger transcript reprocessing, and waste
    // AI credits. Recall.ai uses Svix headers: webhook-id / -timestamp / -signature.
    const rawBody = await req.text();
    const webhookSecret = Deno.env.get("RECALL_WEBHOOK_SECRET");
    if (webhookSecret) {
      const sigHeader = req.headers.get("webhook-signature");
      const msgId = req.headers.get("webhook-id");
      const msgTs = req.headers.get("webhook-timestamp");
      if (!sigHeader || !msgId || !msgTs) {
        console.warn("recall-webhook: missing Svix signature headers");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Reject events older than 5 minutes (replay protection)
      const tsNum = Number(msgTs);
      if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
        console.warn("recall-webhook: stale or invalid timestamp");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Svix secret format: "whsec_<base64>" — strip the prefix if present.
      const secretB64 = webhookSecret.startsWith("whsec_")
        ? webhookSecret.slice(6)
        : webhookSecret;
      let keyBytes: Uint8Array;
      try {
        keyBytes = Uint8Array.from(atob(secretB64), (c) => c.charCodeAt(0));
      } catch {
        keyBytes = new TextEncoder().encode(secretB64);
      }
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBytes as BufferSource,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const toSign = new TextEncoder().encode(`${msgId}.${msgTs}.${rawBody}`);
      const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, toSign);
      const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
      // Header may carry several space-separated "v1,<sig>" values; accept any match.
      const provided = sigHeader
        .split(" ")
        .map((p) => p.split(",")[1])
        .filter(Boolean);
      const valid = provided.some((p) => {
        if (p.length !== expected.length) return false;
        let diff = 0;
        for (let i = 0; i < p.length; i++) diff |= p.charCodeAt(i) ^ expected.charCodeAt(i);
        return diff === 0;
      });
      if (!valid) {
        console.warn("recall-webhook: invalid signature");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Soft-fail in dev when secret isn't configured: log loudly so it gets
      // wired up in prod (the Supabase secrets UI). Do not block events.
      console.warn(
        "recall-webhook: RECALL_WEBHOOK_SECRET not set — accepting unauthenticated webhook (insecure, configure in production)",
      );
    }

    const body = JSON.parse(rawBody);
    console.log("Recall webhook received:", JSON.stringify(body).slice(0, 800));

    const event = body.event as string | undefined;
    const botId = body.data?.bot?.id as string | undefined;

    if (!botId) {
      console.log("No bot_id in webhook payload, ignoring");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin: any = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: botRecord, error: findError } = await supabaseAdmin
      .from("recall_bots")
      .select("*")
      .eq("recall_bot_id", botId)
      .maybeSingle();

    if (findError || !botRecord) {
      console.log(`Bot ${botId} not found in our records, ignoring`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventStatusMap: Record<string, string> = {
      "bot.joining_call": "joining",
      "bot.in_waiting_room": "in_waiting_room",
      "bot.in_call_not_recording": "joining",
      "bot.recording_permission_allowed": "joining",
      "bot.in_call_recording": "recording",
      "bot.call_ended": "processing",
      "bot.done": "processing",
      "bot.fatal": "error",
    };

    if (event && eventStatusMap[event]) {
      const newStatus = eventStatusMap[event];
      const isFatal = event === "bot.fatal";
      const subCode = body.data?.data?.sub_code;
      const statusCode = body.data?.data?.code as string | undefined;

      // Treat "kicked from waiting room" as an error (not skipped_no_leader),
      // so dedup logic can still tell the difference between "leader missed it"
      // and "host actively rejected the bot".
      const isKickedFromWaitingRoom =
        subCode === "bot_kicked_from_waiting_room" ||
        statusCode === "bot_kicked_from_waiting_room";

      const finalStatus = isFatal || isKickedFromWaitingRoom ? "error" : newStatus;
      const errorMessage = isFatal
        ? `Bot falhou: ${subCode || statusCode || "erro desconhecido"}`
        : isKickedFromWaitingRoom
        ? "Host rejeitou o bot na sala de espera. Tente enviar de novo após aceitar."
        : null;

      await supabaseAdmin
        .from("recall_bots")
        .update({
          status: finalStatus,
          error_message: errorMessage,
        })
        .eq("id", botRecord.id);

      console.log(`Bot ${botId} status: ${event} → ${finalStatus}${subCode ? ` (sub_code=${subCode})` : ""}`);
    }


    // ── Leader presence detection ─────────────────────────────────────────
    // When recording starts:
    //  - auto_calendar bots → schedule a deferred check 5min from now (handled by check-pending-leader-presence cron).
    //    The Recall participant roster takes 30-60s to populate, so synchronous checks fail.
    //  - manual bots → trust the explicit leader action, no auto-leave. Validate only at bot.done.
    if (event === "bot.in_call_recording" && botRecord.leader_email && !botRecord.leader_detected) {
      const triggerSource = (botRecord.trigger_source as string) || "auto_calendar";
      if (triggerSource === "auto_calendar" && !botRecord.leader_check_due_at) {
        const dueAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        await supabaseAdmin
          .from("recall_bots")
          .update({ leader_check_due_at: dueAt })
          .eq("id", botRecord.id);
        console.log(`Bot ${botId}: scheduled deferred leader check for ${dueAt}`);
      } else {
        console.log(`Bot ${botId}: trigger_source=${triggerSource}, no auto-leave check (validates at bot.done)`);
      }
    }

    // ── Re-check leader presence on bot.done if not yet detected ──
    // Manual bots: NEVER discard the transcript on missing leader (the leader
    // explicitly clicked "Transcrever"). We still try to detect presence so the
    // flag is informative, but the transcript is always processed.
    // Auto-calendar bots: keep the cost-protective behavior (discard if leader
    // never showed up to a meeting we transcribed proactively).
    if (event === "bot.done" && botRecord.leader_email && !botRecord.leader_detected) {
      const triggerSource = (botRecord.trigger_source as string) || "auto_calendar";
      try {
        await checkLeaderPresence(supabaseAdmin, botRecord, botId, RECALL_API_KEY, triggerSource === "manual");
      } catch (e) {
        console.error(`Final leader presence check failed for bot ${botId}:`, e);
      }
      // Re-fetch bot record after presence check for handleBotDone
      const { data: updatedBot } = await supabaseAdmin
        .from("recall_bots")
        .select("*")
        .eq("id", botRecord.id)
        .single();
      if (updatedBot) {
        Object.assign(botRecord, updatedBot);
      }
    }

    // When bot is done, fetch transcript via API v1 bot retrieve endpoint
    if ((event === "bot.done" || event === "bot.recording_done") && botRecord.status !== "done") {
      await handleBotDone(supabaseAdmin, botRecord, botId, RECALL_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Leader presence check ──────────────────────────────────────────────────
//
// `skipDiscard = true` is used for manual bots: we still try to detect the
// leader (so the flag is informative), but we NEVER mark the bot as
// `skipped_no_leader` — the leader explicitly clicked "Transcrever", we trust
// that and process the transcript regardless.
async function checkLeaderPresence(
  supabaseAdmin: any,
  botRecord: any,
  botId: string,
  recallApiKey: string,
  skipDiscard = false,
) {
  const leaderEmail = (botRecord.leader_email as string).toLowerCase();

  // Re-check bot status (might have ended already)
  const { data: currentBot } = await supabaseAdmin
    .from("recall_bots")
    .select("status, leader_detected")
    .eq("id", botRecord.id)
    .single();

  if (!currentBot || currentBot.status === "done" || currentBot.status === "error" || currentBot.leader_detected) {
    console.log(`Bot ${botId}: skipping leader check — status=${currentBot?.status}, leader_detected=${currentBot?.leader_detected}`);
    return;
  }

  // Resolve leader display-name candidates so we can match by NAME
  // (Google Meet hides emails for non-Calendar attendees).
  const nameCandidates: string[] = [];
  try {
    const { data: leaderUser } = await supabaseAdmin.auth.admin.getUserById(botRecord.user_id);
    const meta = leaderUser?.user?.user_metadata ?? {};
    if (meta.full_name) nameCandidates.push(meta.full_name as string);
    if (meta.name) nameCandidates.push(meta.name as string);
  } catch (e) {
    console.warn(`Bot ${botId}: could not load leader user_metadata:`, e);
  }
  // Also include any team_member row whose email matches the leader (some leaders
  // appear as their own member for testing).
  try {
    const { data: selfMember } = await supabaseAdmin
      .from("team_members")
      .select("name")
      .eq("email", leaderEmail)
      .limit(5);
    for (const m of selfMember ?? []) if (m.name) nameCandidates.push(m.name);
  } catch { /* non-fatal */ }

  // Fetch participants from BOTH legacy field and participant_events,
  // with the detailed resolver so we can also tell apart "truly empty" from "still loading".
  const detailed = await fetchAllRecallParticipantsDetailed(botId, recallApiKey);
  const participants = detailed.participants;
  console.log(
    `Bot ${botId}: ${participants.length} participant(s) resolved (status=${detailed.status}) | leader email=${leaderEmail} | name candidates=${JSON.stringify(nameCandidates)}`,
  );

  const leaderFound = isLeaderPresent(participants, {
    email: leaderEmail,
    names: nameCandidates,
  });

  if (leaderFound) {
    console.log(`Bot ${botId}: leader detected ✓`);
    await supabaseAdmin
      .from("recall_bots")
      .update({ leader_detected: true })
      .eq("id", botRecord.id);
    return;
  }

  if (skipDiscard) {
    // Manual trigger: trust the leader's click. Do NOT discard transcript.
    console.warn(
      `Bot ${botId}: leader NOT detected by name/email, but trigger_source=manual — keeping transcript (leader_detected stays false).`,
    );
    return;
  }

  // ── Defense for auto-calendar bots ───────────────────────────────────────
  // If the bot actually recorded ≥60s of media, NEVER discard the transcript.
  // The resolver may be blind (legacy empty + participant_events not flushed)
  // but the recording itself is real and useful to the leader.
  try {
    const botResp = await fetch(`https://us-west-2.recall.ai/api/v1/bot/${botId}/`, {
      headers: { Authorization: `Token ${recallApiKey}` },
    });
    if (botResp.ok) {
      const data = await botResp.json();
      const rec = (data.recordings ?? [])[0];
      const startedAt = rec?.started_at ? new Date(rec.started_at).getTime() : null;
      const endedAt = rec?.ended_at ? new Date(rec.ended_at).getTime() : null;
      const recordedMs = startedAt && endedAt ? endedAt - startedAt : 0;
      if (recordedMs >= 60_000) {
        console.warn(
          `Bot ${botId}: leader NOT detected but recording lasted ${Math.round(recordedMs / 1000)}s — keeping transcript (would be wasteful to discard).`,
        );
        return;
      }
    }
  } catch (e) {
    console.warn(`Bot ${botId}: recording-duration safety check failed:`, e);
  }

  // Auto-calendar bot, no real recording: leader never showed up. Remove + mark.
  console.log(`Bot ${botId}: leader NOT detected after grace period — removing bot`);

  const leaveResponse = await fetch(`https://us-west-2.recall.ai/api/v1/bot/${botId}/leave/`, {
    method: "POST",
    headers: { Authorization: `Token ${recallApiKey}` },
  });

  console.log(`Bot ${botId}: leave response: ${leaveResponse.status}`);

  await supabaseAdmin
    .from("recall_bots")
    .update({
      status: "skipped_no_leader",
      error_message: "Líder não detectado na reunião — bot removido automaticamente",
    })
    .eq("id", botRecord.id);
}

// ── Fetch transcript via Recall API v1 bot retrieve → media_shortcuts ──────

async function fetchTranscriptFromRecall(
  botId: string,
  recallApiKey: string,
): Promise<{ transcriptData: unknown; speakerNameMap: Record<number, string> } | "not_ready" | "error"> {
  const recallHeaders = { Authorization: `Token ${recallApiKey}` };

  // Retrieve the full bot object which contains recordings + media_shortcuts
  const botResponse = await fetch(
    `https://us-west-2.recall.ai/api/v1/bot/${botId}/`,
    { headers: recallHeaders },
  );

  if (!botResponse.ok) {
    const errText = await botResponse.text();
    console.error(`Failed to retrieve bot ${botId}: ${botResponse.status} ${errText}`);
    return "error";
  }

  const botData = await botResponse.json();
  const recordings = botData.recordings;

  if (!recordings || recordings.length === 0) {
    console.log(`Bot ${botId}: no recordings yet, will retry`);
    return "not_ready";
  }

  const recording = recordings[0];
  const transcriptShortcut = recording?.media_shortcuts?.transcript;

  if (!transcriptShortcut) {
    console.log(`Bot ${botId}: no transcript in media_shortcuts, will retry`);
    return "not_ready";
  }

  // Check transcript status — could be a string or nested object
  const transcriptStatus = typeof transcriptShortcut.status === "string"
    ? transcriptShortcut.status
    : transcriptShortcut.status?.code || transcriptShortcut.status?.status;
  console.log(`Bot ${botId}: transcript shortcut keys: ${Object.keys(transcriptShortcut).join(", ")}, status raw: ${JSON.stringify(transcriptShortcut.status)}`);
  if (transcriptStatus && transcriptStatus !== "done") {
    console.log(`Bot ${botId}: transcript status is '${transcriptStatus}', will retry`);
    return "not_ready";
  }

  const downloadUrl = transcriptShortcut.data?.download_url;
  if (!downloadUrl) {
    console.log(`Bot ${botId}: transcript done but no download_url, will retry`);
    return "not_ready";
  }

  // Download the transcript JSON
  console.log(`Bot ${botId}: downloading transcript from media_shortcuts...`);
  const transcriptResponse = await fetch(downloadUrl);
  if (!transcriptResponse.ok) {
    console.error(`Failed to download transcript: ${transcriptResponse.status}`);
    return "error";
  }

  const transcriptData = await transcriptResponse.json();

  if (Array.isArray(transcriptData) && transcriptData.length === 0) {
    console.log(`Bot ${botId}: transcript downloaded but empty, will retry`);
    return "not_ready";
  }

  // Build speaker name map from transcript data (v2 format has participant.name)
  const speakerNameMap: Record<number, string> = {};
  if (Array.isArray(transcriptData)) {
    for (const segment of transcriptData) {
      const participantId = segment.participant?.id;
      const participantName = segment.participant?.name;
      if (participantId !== undefined && participantName) {
        speakerNameMap[participantId] = participantName;
      }
    }
  }

  console.log(`Bot ${botId}: transcript downloaded, ${Array.isArray(transcriptData) ? transcriptData.length : 0} segments, ${Object.keys(speakerNameMap).length} speakers`);
  return { transcriptData, speakerNameMap };
}

// ── Main handler for bot.done ──────────────────────────────────────────────

async function handleBotDone(
  supabaseAdmin: any,
  botRecord: any,
  botId: string,
  recallApiKey: string,
  supabaseUrl: string,
  serviceRoleKey: string,
) {
  // Skip processing only for AUTO_CALENDAR bots whose leader was absent
  // (manual bots are always processed — leader explicitly clicked Transcribe).
  const triggerSource = (botRecord.trigger_source as string) || "auto_calendar";
  const leaderAbsent = !botRecord.leader_detected && botRecord.leader_email;
  if (
    botRecord.status === "skipped_no_leader" ||
    (triggerSource === "auto_calendar" && leaderAbsent)
  ) {
    console.log(`Bot ${botId} done but leader was not detected (trigger=${triggerSource}) — skipping transcript processing`);
    await supabaseAdmin
      .from("recall_bots")
      .update({ status: "skipped_no_leader" })
      .eq("id", botRecord.id);
    return;
  }
  if (triggerSource === "manual" && leaderAbsent) {
    console.warn(`Bot ${botId}: trigger=manual, leader not auto-detected — processing transcript anyway.`);
  }

  console.log(`Bot ${botId} done — fetching transcript via API...`);
  const result = await fetchTranscriptFromRecall(botId, recallApiKey);

  if (result === "not_ready") {
    console.log(`Bot ${botId}: transcript not ready yet, will retry on next webhook event`);
    return;
  }

  if (result === "error") {
    await supabaseAdmin
      .from("recall_bots")
      .update({ status: "error", error_message: "Failed to fetch transcript from Recall API" })
      .eq("id", botRecord.id);
    return;
  }

  const { transcriptData, speakerNameMap } = result;

  // Format transcript with real speaker names
  const formattedTranscript = formatTranscript(transcriptData, speakerNameMap);

  // Resolve participants once and reuse for member matching.
  const participants = await fetchAllRecallParticipants(botId, recallApiKey);

  // Find all member_ids for this meeting
  const memberIds = await findAllMeetingMembers(
    supabaseAdmin,
    botRecord.user_id as string,
    botRecord.meeting_url as string,
    botRecord.meeting_id as string | null,
    botRecord.member_id as string | null,
    participants,
  );

  console.log(`Found ${memberIds.length} member(s) for this meeting`);

  // Resolve meeting title from upcoming_meetings (fallback to default)
  const meetingTitle = await resolveMeetingTitle(
    supabaseAdmin,
    botRecord.user_id as string,
    botRecord.meeting_id as string | null,
    botRecord.meeting_url as string | null,
  );

  // Save full transcript to feedbacks (no truncation — leaders/members read this directly)
  const createdIds: { memberId: string; transcriptId: string; feedbackId: string }[] = [];

  for (const memberId of memberIds) {
    const created = await createTranscriptAndFeedback(
      supabaseAdmin,
      botRecord.user_id as string,
      memberId,
      formattedTranscript,
      formattedTranscript,
      meetingTitle,
    );
    if (created) {
      createdIds.push({ memberId, ...created });
    }
  }

  // If no members found, create a single transcript with null member
  if (memberIds.length === 0) {
    const { data: mt } = await supabaseAdmin
      .from("meeting_transcripts")
      .insert({
        manager_id: botRecord.user_id,
        member_id: null,
        transcript: formattedTranscript,
        processing_status: "completed",
        leader_notes: `Transcrição automática via Recall.ai — ${meetingTitle}`,
      })
      .select("id")
      .single();

    console.log(`No members matched — created orphan transcript ${mt?.id}`);
  }

  // Update bot record as done
  await supabaseAdmin
    .from("recall_bots")
    .update({
      status: "done",
      transcript: formattedTranscript,
      transcript_data: {
        raw_transcript: transcriptData,
        speaker_map: speakerNameMap,
      },
      meeting_transcript_id: createdIds[0]?.transcriptId || null,
    })
    .eq("id", botRecord.id);

  console.log(`Bot ${botId} done — ${createdIds.length} feedback(s) created`);

  // Trigger background analysis for each feedback (non-blocking)
  for (const { feedbackId } of createdIds) {
    triggerBackgroundAnalysis(supabaseUrl, serviceRoleKey, feedbackId);
  }

  // Camada de Ambiente (Fase 1+2): computa sinais objetivos da reunião + sentimento.
  // Fire-and-forget — não bloqueia a resposta do webhook.
  try {
    const computeUrl = `${supabaseUrl}/functions/v1/compute-meeting-signals`;
    const p = fetch(computeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ recall_bot_id: botRecord.id }),
    }).catch((e) => console.warn("compute-meeting-signals trigger failed:", e));
    // @ts-ignore EdgeRuntime is provided by Deno Deploy
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(p);
    }
  } catch (e) {
    console.warn("compute-meeting-signals dispatch error:", e);
  }
}

// ── Helper: Format transcript with speaker names ───────────────────────────

function formatTranscript(
  transcriptData: unknown,
  speakerNameMap: Record<number, string>,
): string {
  if (!Array.isArray(transcriptData)) return JSON.stringify(transcriptData);

  return transcriptData
    .map((segment: { participant?: { id?: number; name?: string }; speaker?: string | number; speaker_id?: number; words: Array<{ text: string }> }) => {
      // v2 format: participant.name; v1 fallback: speaker_id / speaker
      const speakerName =
        segment.participant?.name ||
        (segment.speaker_id !== undefined && speakerNameMap[segment.speaker_id]
          ? speakerNameMap[segment.speaker_id]
          : typeof segment.speaker === "string" && segment.speaker
            ? segment.speaker
            : "Participante");
      const text = segment.words?.map((w: { text: string }) => w.text).join(" ") || "";
      return `**${speakerName}:** ${text}`;
    })
    .join("\n\n");
}

// ── Helper: Find all member_ids associated with this meeting ───────────────
//
// Resolution order (union of all sources, deduplicated):
//   1. upcoming_meetings rows that share the same google_event_id
//   2. upcoming_meetings rows with the exact same meet_link
//   3. NAME-matching: Recall participants ↔ leader's team_members (the
//      authoritative source for ad-hoc / non-calendar meetings, which is the
//      common case for manually triggered bots)
//   4. fallbackMemberId (the member from whose card the leader clicked Transcribe)

async function findAllMeetingMembers(
  supabaseAdmin: any,
  userId: string,
  meetingUrl: string,
  meetingId: string | null,
  fallbackMemberId: string | null,
  participants: RecallParticipant[] = [],
): Promise<string[]> {
  const memberIds = new Set<string>();

  if (meetingId) {
    const { data: sourceMeeting } = await supabaseAdmin
      .from("upcoming_meetings")
      .select("google_event_id")
      .eq("id", meetingId)
      .maybeSingle();

    if (sourceMeeting?.google_event_id) {
      const { data: relatedMeetings } = await supabaseAdmin
        .from("upcoming_meetings")
        .select("member_id")
        .eq("google_event_id", sourceMeeting.google_event_id)
        .eq("user_id", userId)
        .not("member_id", "is", null);

      if (relatedMeetings) {
        for (const m of relatedMeetings) {
          if (m.member_id) memberIds.add(m.member_id);
        }
      }
    }
  }

  if (meetingUrl) {
    const { data: urlMatches } = await supabaseAdmin
      .from("upcoming_meetings")
      .select("member_id")
      .eq("user_id", userId)
      .eq("meet_link", meetingUrl)
      .not("member_id", "is", null);

    if (urlMatches) {
      for (const m of urlMatches) {
        if (m.member_id) memberIds.add(m.member_id);
      }
    }
  }

  // Name matching from Recall participants against this leader's team_members.
  if (participants.length > 0) {
    try {
      const { data: leaderTeams } = await supabaseAdmin
        .from("teams")
        .select("id")
        .eq("leader_user_id", userId);
      const teamIds = (leaderTeams ?? []).map((t: { id: string }) => t.id);
      if (teamIds.length > 0) {
        const { data: members } = await supabaseAdmin
          .from("team_members")
          .select("id, name, email")
          .in("team_id", teamIds);
        const matched = matchMembersToParticipants(participants, members ?? []);
        const beforeCount = memberIds.size;
        for (const id of matched) memberIds.add(id);
        if (matched.length > 0) {
          console.log(`[findAllMeetingMembers] name-matched ${matched.length} member(s) from ${participants.length} participant(s) (added ${memberIds.size - beforeCount} new).`);
        }
      }
    } catch (e) {
      console.error("[findAllMeetingMembers] name-matching failed:", e);
    }
  }

  if (memberIds.size === 0 && fallbackMemberId) {
    memberIds.add(fallbackMemberId);
  }

  return Array.from(memberIds);
}

// ── Helper: Create meeting_transcript + feedback for a member ──────────────

async function createTranscriptAndFeedback(
  supabaseAdmin: any,
  managerId: string,
  memberId: string,
  fullTranscript: string,
  truncatedContent: string,
  meetingTitle: string,
): Promise<{ transcriptId: string; feedbackId: string } | null> {
  const { data: mt, error: mtError } = await supabaseAdmin
    .from("meeting_transcripts")
    .insert({
      manager_id: managerId,
      member_id: memberId,
      transcript: fullTranscript,
      processing_status: "completed",
      leader_notes: `Transcrição automática via Recall.ai — ${meetingTitle}`,
    })
    .select("id")
    .single();

  if (mtError || !mt) {
    console.error(`Failed to create meeting_transcript for member ${memberId}:`, mtError);
    return null;
  }

  const { data: fb, error: fbError } = await supabaseAdmin
    .from("feedbacks")
    .insert({
      manager_id: managerId,
      member_id: memberId,
      content: truncatedContent,
      type: "neutral",
      source: "recall_bot",
      title: meetingTitle,
      meeting_transcript_id: mt.id,
      visibility: "private_leader",
    })
    .select("id")
    .single();

  if (fbError || !fb) {
    console.error(`Failed to create feedback for member ${memberId}:`, fbError);
    return { transcriptId: mt.id, feedbackId: "" };
  }

  console.log(`Created transcript ${mt.id} + feedback ${fb.id} for member ${memberId}`);
  return { transcriptId: mt.id, feedbackId: fb.id };
}

// ── Helper: Resolve meeting title from upcoming_meetings ───────────────────
// Falls back to a generic default when title can't be found, so naming is
// never broken even for ad-hoc bots that have no calendar event.
async function resolveMeetingTitle(
  supabaseAdmin: any,
  userId: string,
  meetingId: string | null,
  meetingUrl: string | null,
): Promise<string> {
  const DEFAULT_TITLE = "Transcrição de reunião";
  const sanitize = (raw: unknown): string | null => {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
  };

  try {
    if (meetingId) {
      const { data } = await supabaseAdmin
        .from("upcoming_meetings")
        .select("title")
        .eq("id", meetingId)
        .maybeSingle();
      const t = sanitize(data?.title);
      if (t) return t;
    }
    if (meetingUrl && userId) {
      const { data } = await supabaseAdmin
        .from("upcoming_meetings")
        .select("title")
        .eq("user_id", userId)
        .eq("meet_link", meetingUrl)
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();
      const t = sanitize(data?.title);
      if (t) return t;
    }
  } catch (e) {
    console.error("[resolveMeetingTitle] lookup failed:", e);
  }
  return DEFAULT_TITLE;
}

// ── Helper: Trigger background analysis (non-blocking) ─────────────────────

function triggerBackgroundAnalysis(
  supabaseUrl: string,
  serviceRoleKey: string,
  feedbackId: string,
) {
  if (!feedbackId) return;

  fetch(`${supabaseUrl}/functions/v1/analyze-feedback-background`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ feedbackId }),
  })
    .then(() => console.log(`Background analysis triggered for feedback ${feedbackId}`))
    .catch((e) => console.error(`Failed to trigger analysis for ${feedbackId}:`, e));
}
