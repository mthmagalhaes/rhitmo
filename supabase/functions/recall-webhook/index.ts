import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const body = await req.json();
    console.log("Recall webhook received:", JSON.stringify(body).slice(0, 800));

    const event = body.event as string | undefined;
    const botId = body.data?.bot?.id as string | undefined;

    if (!botId) {
      console.log("No bot_id in webhook payload, ignoring");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      "bot.in_waiting_room": "joining",
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
      const errorMessage = isFatal
        ? `Fatal error: ${subCode || statusCode || "unknown"}`
        : null;

      await supabaseAdmin
        .from("recall_bots")
        .update({
          status: isFatal ? "error" : newStatus,
          error_message: errorMessage,
        })
        .eq("id", botRecord.id);

      console.log(`Bot ${botId} status: ${event} → ${isFatal ? "error" : newStatus}`);
    }

    // ── Leader presence detection: check synchronously when recording starts ──
    if (event === "bot.in_call_recording" && botRecord.leader_email) {
      // Synchronous check — no setTimeout (Deno Edge Functions terminate after response)
      try {
        await checkLeaderPresence(supabaseAdmin, botRecord, botId, RECALL_API_KEY);
      } catch (e) {
        console.error(`Leader presence check failed for bot ${botId}:`, e);
      }
    }

    // ── Re-check leader presence on bot.done if not yet detected ──
    if (event === "bot.done" && botRecord.leader_email && !botRecord.leader_detected) {
      try {
        await checkLeaderPresence(supabaseAdmin, botRecord, botId, RECALL_API_KEY);
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

async function checkLeaderPresence(
  supabaseAdmin: ReturnType<typeof createClient>,
  botRecord: Record<string, unknown>,
  botId: string,
  recallApiKey: string,
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

  // Fetch participants from Recall API
  const botResponse = await fetch(`https://us-west-2.recall.ai/api/v1/bot/${botId}/`, {
    headers: { Authorization: `Token ${recallApiKey}` },
  });

  if (!botResponse.ok) {
    console.error(`Failed to fetch bot ${botId} for leader check: ${botResponse.status}`);
    return;
  }

  const botData = await botResponse.json();
  const participants = botData.meeting_participants || [];

  console.log(`Bot ${botId}: checking ${participants.length} participants for leader email ${leaderEmail}`);

  // Check if leader is among participants (by email or name containing email prefix)
  const leaderPrefix = leaderEmail.split("@")[0].toLowerCase();
  const leaderFound = participants.some((p: { email?: string; name?: string }) => {
    if (p.email && p.email.toLowerCase() === leaderEmail) return true;
    if (p.name && p.name.toLowerCase().includes(leaderPrefix)) return true;
    return false;
  });

  if (leaderFound) {
    console.log(`Bot ${botId}: leader detected ✓`);
    await supabaseAdmin
      .from("recall_bots")
      .update({ leader_detected: true })
      .eq("id", botRecord.id);
    return;
  }

  // Leader not found — remove bot from call
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
  supabaseAdmin: ReturnType<typeof createClient>,
  botRecord: Record<string, unknown>,
  botId: string,
  recallApiKey: string,
  supabaseUrl: string,
  serviceRoleKey: string,
) {
  // Skip processing if leader was not detected (bot was removed or call ended without leader)
  if (botRecord.status === "skipped_no_leader" || (!botRecord.leader_detected && botRecord.leader_email)) {
    console.log(`Bot ${botId} done but leader was not detected — skipping transcript processing`);
    await supabaseAdmin
      .from("recall_bots")
      .update({ status: "skipped_no_leader" })
      .eq("id", botRecord.id);
    return;
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

  // Find all member_ids for this meeting
  const memberIds = await findAllMeetingMembers(
    supabaseAdmin,
    botRecord.user_id as string,
    botRecord.meeting_url as string,
    botRecord.meeting_id as string | null,
    botRecord.member_id as string | null,
  );

  console.log(`Found ${memberIds.length} member(s) for this meeting`);

  // Truncate content for feedbacks (15k chars max to save on analysis tokens)
  const truncatedContent = formattedTranscript.slice(0, 15000);

  // Create meeting_transcript + feedback for each member
  const createdIds: { memberId: string; transcriptId: string; feedbackId: string }[] = [];

  for (const memberId of memberIds) {
    const created = await createTranscriptAndFeedback(
      supabaseAdmin,
      botRecord.user_id as string,
      memberId,
      formattedTranscript,
      truncatedContent,
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
        leader_notes: "Transcrição automática via Recall.ai",
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

async function findAllMeetingMembers(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  meetingUrl: string,
  meetingId: string | null,
  fallbackMemberId: string | null,
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

  if (memberIds.size === 0 && fallbackMemberId) {
    memberIds.add(fallbackMemberId);
  }

  return Array.from(memberIds);
}

// ── Helper: Create meeting_transcript + feedback for a member ──────────────

async function createTranscriptAndFeedback(
  supabaseAdmin: ReturnType<typeof createClient>,
  managerId: string,
  memberId: string,
  fullTranscript: string,
  truncatedContent: string,
): Promise<{ transcriptId: string; feedbackId: string } | null> {
  const { data: mt, error: mtError } = await supabaseAdmin
    .from("meeting_transcripts")
    .insert({
      manager_id: managerId,
      member_id: memberId,
      transcript: fullTranscript,
      processing_status: "completed",
      leader_notes: "Transcrição automática via Recall.ai",
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
      title: "Transcrição de reunião",
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
