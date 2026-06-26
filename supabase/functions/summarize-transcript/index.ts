// Edge function: summarize-transcript
// -----------------------------------------------------------------------------
// Reads a feedback row that contains a meeting transcript and produces a
// structured summary (TL;DR, topics, decisions, action items, sentiment).
// Stored back in `feedbacks.structured_summary` (jsonb).
//
// Triggered fire-and-forget from `recall-webhook` (after a Recall bot finishes)
// and from `upload-meeting` (after Whisper transcription).
//
// Frontend (DiaryFeedItem → TranscriptExpandedView) reads this column and shows
// a Granola-style summary card before the raw transcript.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiToolCall, gatewayErrorResponse } from "../_shared/aiGateway.ts";
import { createLogger, getOrCreateRequestId } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Expose-Headers": "x-request-id",
};

// Transcripts can be very long. We cap the prompt at ~60k chars (~15k tokens)
// to stay well inside the model context window. Long meetings get truncated
// from the middle — beginning and end usually carry the most context.
function clipTranscript(text: string, maxChars = 60_000): string {
  if (text.length <= maxChars) return text;
  const half = Math.floor(maxChars / 2) - 200;
  return `${text.slice(0, half)}\n\n[... transcrição truncada ...]\n\n${text.slice(-half)}`;
}

const TOOL = {
  type: "function",
  function: {
    name: "save_structured_summary",
    description:
      "Salva o resumo estruturado da transcrição da reunião 1:1 para exibir no Diário de Bordo.",
    parameters: {
      type: "object",
      required: ["tldr", "topics", "decisions", "action_items", "sentiment"],
      properties: {
        tldr: {
          type: "string",
          description:
            "Resumo executivo em 2-4 frases curtas. Português brasileiro, tom de coach.",
        },
        topics: {
          type: "array",
          description:
            "Tópicos principais discutidos, em ordem cronológica. Máx 6.",
          items: {
            type: "object",
            required: ["title", "summary"],
            properties: {
              title: { type: "string", description: "Título curto (≤6 palavras)" },
              summary: {
                type: "string",
                description:
                  "1-3 frases explicando o que foi falado sobre este tópico.",
              },
            },
          },
        },
        decisions: {
          type: "array",
          description: "Decisões tomadas durante a reunião. Vazio se não houve.",
          items: { type: "string" },
        },
        action_items: {
          type: "array",
          description: "Próximos passos / tarefas combinadas.",
          items: {
            type: "object",
            required: ["task"],
            properties: {
              task: { type: "string" },
              owner: {
                type: "string",
                description:
                  "Nome de quem ficou responsável (use o nome citado na transcrição). Pode ser vazio.",
              },
              due: {
                type: "string",
                description:
                  "Prazo combinado, livre (ex.: 'até sexta', 'próxima sprint'). Pode ser vazio.",
              },
            },
          },
        },
        sentiment: {
          type: "string",
          enum: ["positive", "neutral", "concerned", "tense"],
          description: "Tom geral percebido na conversa.",
        },
        highlights: {
          type: "array",
          description:
            "Trechos curtos memoráveis (citação literal entre aspas). Opcional, máx 3.",
          items: { type: "string" },
        },
      },
    },
  },
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ functionName: "summarize-transcript", requestId });
  const respHeaders = { ...corsHeaders, "Content-Type": "application/json", "x-request-id": requestId };

  try {
    const { feedbackId, force } = await req.json();
    if (!feedbackId) {
      return new Response(JSON.stringify({ error: "feedbackId required" }), {
        status: 400,
        headers: respHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: fb, error: fbErr } = await supabase
      .from("feedbacks")
      .select("id, content, title, source, structured_summary")
      .eq("id", feedbackId)
      .maybeSingle();

    if (fbErr || !fb) {
      log.warn("feedback_not_found", { feedbackId, error: fbErr?.message });
      return new Response(JSON.stringify({ error: "feedback not found" }), {
        status: 404,
        headers: respHeaders,
      });
    }

    if (fb.structured_summary && !force) {
      return new Response(JSON.stringify({ ok: true, cached: true }), {
        status: 200,
        headers: respHeaders,
      });
    }

    const raw = (fb.content || "").trim();
    if (raw.length < 200) {
      return new Response(JSON.stringify({ ok: true, skipped: "too_short" }), {
        status: 200,
        headers: respHeaders,
      });
    }

    const transcript = clipTranscript(raw);

    const system = `Você é a Rhitmo, assistente de líderes que organiza transcrições de reuniões 1:1.
Sua tarefa é extrair uma estrutura clara e fiel ao que foi falado. Sem inventar. Sem aconselhar.
Tom: jornalístico, claro, em português brasileiro. Se a transcrição tiver marcações **Nome:**, preserve os nomes nos action_items quando aplicável.`;

    const user = `Título da reunião: ${fb.title || "(sem título)"}

Transcrição:
"""
${transcript}
"""

Gere o resumo estruturado chamando a função save_structured_summary.`;

    const summary = await aiToolCall<Record<string, unknown>>({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [TOOL],
      toolName: "save_structured_summary",
      temperature: 0.2,
      logger: log,
    });

    const { error: updErr } = await supabase
      .from("feedbacks")
      .update({ structured_summary: summary })
      .eq("id", feedbackId);

    if (updErr) {
      log.error("update_failed", { error: updErr.message });
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500,
        headers: respHeaders,
      });
    }

    log.info("summary_saved", { feedbackId });
    return new Response(JSON.stringify({ ok: true, summary }), {
      status: 200,
      headers: respHeaders,
    });
  } catch (err) {
    return gatewayErrorResponse(err, corsHeaders);
  }
});
