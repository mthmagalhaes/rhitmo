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

    // Find our bot record
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

    // Map Recall event names to our internal statuses
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

    // When bot is done, fetch transcript + create feedbacks for all members
    if (event === "bot.done" && botRecord.status !== "done") {
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

// ── Main handler for bot.done ──────────────────────────────────────────────

async function handleBotDone(
  supabaseAdmin: ReturnType<typeof createClient>,
  botRecord: Record<string, unknown>,
  botId: string,
  recallApiKey: string,
  supabaseUrl: string,
  serviceRoleKey: string,
) {
  console.log(`Bot ${botId} done — fetching transcript + speaker timeline...`);

  const recallHeaders = { Authorization: `Token ${recallApiKey}` };

  // Fetch transcript and speaker timeline in parallel
  const [transcriptResponse, speakerResponse] = await Promise.all([
    fetch(`https://us-west-2.recall.ai/api/v1/bot/${botId}/transcript/`, { headers: recallHeaders }),
    fetch(`https://us-west-2.recall.ai/api/v1/bot/${botId}/speaker_timeline/`, { headers: recallHeaders }),
  ]);

  if (!transcriptResponse.ok) {
    const errText = await transcriptResponse.text();
    console.error(`Failed to fetch transcript: ${errText}`);
    await supabaseAdmin
      .from("recall_bots")
      .update({ status: "error", error_message: `Transcript fetch failed: ${transcriptResponse.status}` })
      .eq("id", botRecord.id);
    return;
  }

  const transcriptData = await transcriptResponse.json();

  // Parse speaker timeline data
  let speakerTimelineData: unknown = null;
  const speakerNameMap: Record<number, string> = {};
  if (speakerResponse.ok) {
    try {
      speakerTimelineData = await speakerResponse.json();
      if (Array.isArray(speakerTimelineData)) {
        for (const entry of speakerTimelineData as Array<{ speaker: number; name?: string }>) {
          if (entry.name && entry.speaker !== undefined) {
            speakerNameMap[entry.speaker] = entry.name;
          }
        }
      }
      if ((speakerTimelineData as { speakers?: unknown[] })?.speakers) {
        for (const s of (speakerTimelineData as { speakers: Array<{ id: number; name?: string }> }).speakers) {
          if (s.name && s.id !== undefined) {
            speakerNameMap[s.id] = s.name;
          }
        }
      }
      console.log(`Speaker timeline: ${Object.keys(speakerNameMap).length} speakers mapped`);
    } catch (e) {
      console.warn("Failed to parse speaker timeline:", e);
    }
  }

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
  const firstMeetingTranscriptId: string | null = null;

  // Create meeting_transcript + feedback for each member
  const createdIds: { memberId: string; transcriptId: string; feedbackId: string }[] = [];

  for (const memberId of memberIds) {
    const result = await createTranscriptAndFeedback(
      supabaseAdmin,
      botRecord.user_id as string,
      memberId,
      formattedTranscript,
      truncatedContent,
    );
    if (result) {
      createdIds.push({ memberId, ...result });
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

  // speakerTimelineData already parsed above

  // Update bot record as done
  await supabaseAdmin
    .from("recall_bots")
    .update({
      status: "done",
      transcript: formattedTranscript,
      transcript_data: {
        raw_transcript: transcriptData,
        speaker_timeline: speakerTimelineData,
        speaker_map: speakerNameMap,
      },
      meeting_transcript_id: createdIds[0]?.transcriptId || null,
    })
    .eq("id", botRecord.id);

  console.log(`Bot ${botId} done — ${createdIds.length} feedback(s) created`);

  // Trigger background analysis for each feedback (non-blocking)
  for (const { feedbackId, memberId } of createdIds) {
    triggerBackgroundAnalysis(supabaseUrl, serviceRoleKey, feedbackId, memberId, botRecord.user_id as string);
  }
}


// ── Helper: Format transcript with speaker names ───────────────────────────

function formatTranscript(
  transcriptData: unknown,
  speakerNameMap: Record<number, string>,
): string {
  if (!Array.isArray(transcriptData)) return JSON.stringify(transcriptData);

  return transcriptData
    .map((segment: { speaker: string | number; speaker_id?: number; words: Array<{ text: string }> }) => {
      const speakerId = segment.speaker_id ?? segment.speaker;
      const speakerName =
        typeof speakerId === "number" && speakerNameMap[speakerId]
          ? speakerNameMap[speakerId]
          : typeof segment.speaker === "string" && segment.speaker
            ? segment.speaker
            : "Participante";
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

  // Strategy 1: If we have a meeting_id, find all upcoming_meetings with same google_event_id
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

  // Strategy 2: Match by meeting_url
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

  // Strategy 3: Fallback to the single member_id stored on the bot record
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
  // Create meeting_transcript
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

  // Create feedback in the diary (Diário de Bordo)
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
  memberId: string,
  managerId: string,
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
