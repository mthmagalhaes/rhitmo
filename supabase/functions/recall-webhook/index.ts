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
    const statusCode = body.data?.data?.code as string | undefined;

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

    // When bot is done, fetch transcript + speaker timeline
    if (event === "bot.done" && botRecord.status !== "done") {
      console.log(`Bot ${botId} done — fetching transcript + speaker timeline...`);

      const recallHeaders = { "Authorization": `Token ${RECALL_API_KEY}` };

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
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const transcriptData = await transcriptResponse.json();

      // Build speaker name map from speaker_timeline
      let speakerNameMap: Record<number, string> = {};
      let speakerTimelineData: unknown = null;
      if (speakerResponse.ok) {
        speakerTimelineData = await speakerResponse.json();
        if (Array.isArray(speakerTimelineData)) {
          for (const entry of speakerTimelineData as Array<{ speaker: number; name?: string }>) {
            if (entry.name && entry.speaker !== undefined) {
              speakerNameMap[entry.speaker] = entry.name;
            }
          }
        }
        // Also check if it's an object with a speakers array
        if ((speakerTimelineData as { speakers?: unknown[] })?.speakers) {
          for (const s of (speakerTimelineData as { speakers: Array<{ id: number; name?: string }> }).speakers) {
            if (s.name && s.id !== undefined) {
              speakerNameMap[s.id] = s.name;
            }
          }
        }
        console.log(`Speaker timeline: ${Object.keys(speakerNameMap).length} speakers mapped`);
      } else {
        console.warn(`Speaker timeline fetch failed (non-fatal): ${speakerResponse.status}`);
      }

      // Format transcript with real speaker names
      const formattedTranscript = Array.isArray(transcriptData)
        ? transcriptData
            .map((segment: { speaker: string | number; speaker_id?: number; words: Array<{ text: string }> }) => {
              // Try to resolve speaker name from timeline
              const speakerId = segment.speaker_id ?? segment.speaker;
              const speakerName = (typeof speakerId === 'number' && speakerNameMap[speakerId])
                ? speakerNameMap[speakerId]
                : (typeof segment.speaker === 'string' && segment.speaker)
                  ? segment.speaker
                  : "Participante";
              const text = segment.words?.map((w: { text: string }) => w.text).join(" ") || "";
              return `**${speakerName}:** ${text}`;
            })
            .join("\n\n")
        : JSON.stringify(transcriptData);

      // Create meeting_transcript record
      const { data: meetingTranscript, error: mtError } = await supabaseAdmin
        .from("meeting_transcripts")
        .insert({
          manager_id: botRecord.user_id,
          member_id: botRecord.member_id,
          transcript: formattedTranscript,
          processing_status: "completed",
          leader_notes: "Transcrição automática via Recall.ai",
        })
        .select("id")
        .single();

      if (mtError) {
        console.error("Failed to create meeting_transcript:", mtError);
        await supabaseAdmin
          .from("recall_bots")
          .update({ status: "error", error_message: `DB save failed: ${mtError.message}` })
          .eq("id", botRecord.id);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update bot record as done — store both transcript and speaker_timeline
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
          meeting_transcript_id: meetingTranscript.id,
        })
        .eq("id", botRecord.id);

      console.log(`Transcript saved for bot ${botId}, meeting_transcript_id: ${meetingTranscript.id}`);

      // Trigger background analysis (non-blocking)
      if (botRecord.member_id) {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/analyze-feedback-background`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              transcript_id: meetingTranscript.id,
              member_id: botRecord.member_id,
              manager_id: botRecord.user_id,
              source: "recall_bot",
            }),
          });
          console.log("Background analysis triggered");
        } catch (e) {
          console.error("Failed to trigger background analysis (non-fatal):", e);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
