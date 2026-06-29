// Edge function: summarize-transcript
// -----------------------------------------------------------------------------
// Para uma transcrição de reunião:
//   1. Garante `structured_summary` (TL;DR/tópicos/decisões/ações/sentimento).
//      Quando outro feedback com o MESMO `transcript_hash` já tem resumo,
//      reusa em vez de chamar o LLM. Economia real quando o líder sobe a
//      mesma transcrição para vários liderados.
//   2. Gera `personal_lens` por liderado (foco no que ELE falou/assumiu,
//      menções, perguntas pra 1:1). Sempre roda por feedback — é a parte
//      personalizada da experiência.
//
// Triggered fire-and-forget de `recall-webhook` e `upload-meeting`.

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

// Transcrições podem ser muito longas. Cap em ~60k chars (~15k tokens).
function clipTranscript(text: string, maxChars = 60_000): string {
  if (text.length <= maxChars) return text;
  const half = Math.floor(maxChars / 2) - 200;
  return `${text.slice(0, half)}\n\n[... transcrição truncada ...]\n\n${text.slice(-half)}`;
}

// Lente pessoal usa um clip menor — só precisa do contexto suficiente pra
// extrair o que UMA pessoa falou. Mantém custo baixo.
function clipForLens(text: string, maxChars = 30_000): string {
  if (text.length <= maxChars) return text;
  const half = Math.floor(maxChars / 2) - 200;
  return `${text.slice(0, half)}\n\n[... trecho omitido ...]\n\n${text.slice(-half)}`;
}

// ---------- Tool: resumo estruturado (compartilhado) ----------
const SUMMARY_TOOL = {
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
          description: "Tópicos principais discutidos, em ordem cronológica. Máx 6.",
          items: {
            type: "object",
            required: ["title", "summary"],
            properties: {
              title: { type: "string", description: "Título curto (≤6 palavras)" },
              summary: {
                type: "string",
                description: "1-3 frases explicando o que foi falado sobre este tópico.",
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
              owner: { type: "string", description: "Nome de quem ficou responsável." },
              due: { type: "string", description: "Prazo combinado, livre." },
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
          description: "Trechos curtos memoráveis (citação literal entre aspas). Máx 3.",
          items: { type: "string" },
        },
      },
    },
  },
} as const;

// ---------- Tool: lente pessoal (por liderado) ----------
const LENS_TOOL = {
  type: "function",
  function: {
    name: "save_personal_lens",
    description:
      "Salva a lente pessoal de UM liderado específico sobre esta reunião — o que ela falou, compromissos, menções, perguntas para a próxima 1:1.",
    parameters: {
      type: "object",
      required: ["spoke", "key_points", "commitments", "mentions", "questions_for_1on1"],
      properties: {
        spoke: {
          type: "boolean",
          description:
            "True se há evidência clara da pessoa tendo falado na reunião. False se ela não se manifestou ou só foi mencionada.",
        },
        participation: {
          type: "string",
          enum: ["active", "passive", "mentioned_only", "absent"],
          description:
            "active = falou várias vezes; passive = falou pouco; mentioned_only = não falou mas foi citada; absent = não falou nem foi citada.",
        },
        key_points: {
          type: "array",
          description:
            "Bullets do que a pessoa TROUXE ou DEFENDEU. 2-4 itens curtos. Vazio se ela não falou.",
          items: { type: "string" },
        },
        commitments: {
          type: "array",
          description: "Tarefas/compromissos que ELA assumiu. Vazio se não há.",
          items: {
            type: "object",
            required: ["task"],
            properties: {
              task: { type: "string" },
              due: { type: "string", description: "Prazo se mencionado." },
            },
          },
        },
        mentions: {
          type: "array",
          description:
            "O que OUTROS falaram SOBRE essa pessoa (elogios, críticas, expectativas). Máx 3. Vazio se não há.",
          items: { type: "string" },
        },
        questions_for_1on1: {
          type: "array",
          description:
            "2 perguntas concretas que o líder pode levar para a próxima 1:1 com essa pessoa, baseadas no que aconteceu na reunião.",
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
    const { feedbackId, force, forceLens } = await req.json();
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
      .select("id, content, title, source, structured_summary, personal_lens, transcript_hash, member_id")
      .eq("id", feedbackId)
      .maybeSingle();

    if (fbErr || !fb) {
      log.warn("feedback_not_found", { feedbackId, error: fbErr?.message });
      return new Response(JSON.stringify({ error: "feedback not found" }), {
        status: 404,
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

    // ─────────────────────────────────────────────────────────────
    // 1) RESUMO BASE — reusa irmão com mesmo hash, se houver
    // ─────────────────────────────────────────────────────────────
    let summary = (fb.structured_summary as Record<string, unknown> | null) ?? null;

    if (!summary || force) {
      // Procurar irmão já resumido
      if (fb.transcript_hash) {
        const { data: sibling } = await supabase
          .from("feedbacks")
          .select("structured_summary")
          .eq("transcript_hash", fb.transcript_hash)
          .not("structured_summary", "is", null)
          .neq("id", feedbackId)
          .limit(1)
          .maybeSingle();

        if (sibling?.structured_summary) {
          summary = sibling.structured_summary as Record<string, unknown>;
          log.info("summary_reused_from_sibling", { feedbackId, hash: fb.transcript_hash });
        }
      }

      if (!summary) {
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

        summary = await aiToolCall<Record<string, unknown>>({
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          tools: [SUMMARY_TOOL],
          toolName: "save_structured_summary",
          temperature: 0.2,
          logger: log,
        });
      }

      const { error: updErr } = await supabase
        .from("feedbacks")
        .update({ structured_summary: summary })
        .eq("id", feedbackId);

      if (updErr) {
        log.error("summary_update_failed", { error: updErr.message });
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 500,
          headers: respHeaders,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2) LENTE PESSOAL — sempre por feedback (member_id obrigatório)
    // ─────────────────────────────────────────────────────────────
    let lens: Record<string, unknown> | null = (fb.personal_lens as Record<string, unknown> | null) ?? null;

    if (fb.member_id && (!lens || forceLens)) {
      // Buscar nome do liderado
      const { data: member } = await supabase
        .from("team_members")
        .select("name")
        .eq("id", fb.member_id)
        .maybeSingle();

      const memberName = (member?.name || "").trim();
      if (memberName) {
        const transcript = clipForLens(raw);
        const lensSystem = `Você é a Rhitmo. Sua tarefa é extrair a LENTE PESSOAL de UM liderado específico sobre uma reunião — o que ELE falou, o que assumiu, como foi mencionado. Seja fiel à transcrição. Não invente. Se a pessoa não falou, retorne spoke=false e foque em "mentions" e "questions_for_1on1". Português brasileiro, claro e direto.`;

        const lensUser = `Pessoa em foco: **${memberName}**
Título da reunião: ${fb.title || "(sem título)"}

Transcrição:
"""
${transcript}
"""

Gere a lente pessoal de ${memberName} chamando save_personal_lens. Use o nome dela exatamente como aparece. Se ela aparece como apelido ou primeiro nome só, considere variações próximas.`;

        try {
          lens = await aiToolCall<Record<string, unknown>>({
            messages: [
              { role: "system", content: lensSystem },
              { role: "user", content: lensUser },
            ],
            tools: [LENS_TOOL],
            toolName: "save_personal_lens",
            temperature: 0.2,
            logger: log,
          });

          // Enriquecer com identificação
          const lensWithMeta = { ...lens, member_id: fb.member_id, member_name: memberName };

          const { error: lensErr } = await supabase
            .from("feedbacks")
            .update({ personal_lens: lensWithMeta })
            .eq("id", feedbackId);

          if (lensErr) {
            log.warn("lens_update_failed", { error: lensErr.message });
          } else {
            lens = lensWithMeta;
          }
        } catch (lensCallErr) {
          // Lente é best-effort; se falhar, resumo base já foi salvo.
          log.warn("lens_generation_failed", { error: (lensCallErr as Error).message });
        }
      }
    }

    log.info("summary_saved", { feedbackId, has_lens: !!lens });
    return new Response(JSON.stringify({ ok: true, summary, personal_lens: lens }), {
      status: 200,
      headers: respHeaders,
    });
  } catch (err) {
    return gatewayErrorResponse(err, corsHeaders);
  }
});
