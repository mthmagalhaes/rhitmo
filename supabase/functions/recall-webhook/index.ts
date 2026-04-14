import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
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
    console.log("Recall webhook received:", JSON.stringify(body).slice(0, 500));

    const event = body.event || body.data?.event;
    const botId = body.data?.bot_id || body.bot_id;

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

    // Handle status changes
    const statusCode = body.data?.status?.code || body.status?.code;
    if (statusCode) {
      const statusMap: Record<string, string> = {
        ready: "scheduled",
        joining_call: "joining",
        in_waiting_room: "joining",
        in_call_not_recording: "joining",
        in_call_recording: "recording",
        call_ended: "processing",
        done: "processing",
        fatal: "error",
        analysis_done: "processing",
      };

      const newStatus = statusMap[statusCode] || botRecord.status;
      const errorMessage = statusCode === "fatal"
        ? (body.data?.status?.message || "Bot encountered a fatal error")
        : null;

      await supabaseAdmin
        .from("recall_bots")
        .update({
          status: errorMessage ? "error" : newStatus,
          error_message: errorMessage,
        })
        .eq("id", botRecord.id);

      console.log(`Bot ${botId} status updated to: ${newStatus}`);
    }

    // Handle transcript complete
    if (event === "bot.transcription_complete" || event === "transcript.done" || statusCode === "done") {
      console.log(`Fetching transcript for bot ${botId}...`);

      // Fetch transcript from Recall.ai
      const transcriptResponse = await fetch(
        `https://us-east-1.recall.ai/api/v1/bot/${botId}/transcript/`,
        {
          headers: { "Authorization": `Token ${RECALL_API_KEY}` },
        }
      );

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

      // Format transcript as readable text
      const formattedTranscript = Array.isArray(transcriptData)
        ? transcriptData.map((segment: { speaker: string; words: Array<{ text: string }> }) => {
            const speaker = segment.speaker || "Unknown";
            const text = segment.words?.map((w: { text: string }) => w.text).join(" ") || "";
            return `${speaker}: ${text}`;
          }).join("\n\n")
        : JSON.stringify(transcriptData);

      // Create meeting_transcript record
      const { data: meetingTranscript, error: mtError } = await supabaseAdmin
        .from("meeting_transcripts")
        .insert({
          manager_id: botRecord.user_id,
          member_id: botRecord.member_id,
          transcript: formattedTranscript,
          processing_status: "completed",
          leader_notes: `Transcrição automática via Recall.ai`,
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

      // Update bot record
      await supabaseAdmin
        .from("recall_bots")
        .update({
          status: "done",
          transcript: formattedTranscript,
          transcript_data: transcriptData,
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
