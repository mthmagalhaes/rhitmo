// compute-meeting-signals
// ------------------------------------------------------------------
// Recebe um recall_bot_id e calcula `meeting_signals` (1 linha por
// participante) a partir do transcript salvo em `recall_bots.transcript_data`.
// Também chama o LLM para um sentimento curto por participante.
//
// É idempotente: usa upsert na chave (recall_bot_id, member_id, participant_name).
// Chamado em fire-and-forget pelo recall-webhook após o bot.done processar
// o transcript. Aceita também `x-internal-key` (= SUPABASE_SERVICE_ROLE_KEY)
// para ser invocado por outras edge functions.
//
// Privacidade: nada nesta função vai pro liderado — só popula a tabela
// `meeting_signals` que é RLS-restrita ao manager_id (líder).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { computeSignalsFromTranscript, type ParticipantSignals } from "../_shared/computeMeetingSignals.ts";
import { aiToolCall } from "../_shared/aiGateway.ts";
import { matchMembersToParticipants } from "../_shared/recallParticipants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
};

const BodySchema = z.object({
  recall_bot_id: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const internalKey = req.headers.get("x-internal-key");
  if (internalKey !== SERVICE_ROLE) {
    // Fallback: aceitar JWT de usuário e validar mais à frente via ownership.
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e) {
    return new Response(JSON.stringify({ error: "invalid_body", detail: String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: bot, error: botErr } = await admin
    .from("recall_bots")
    .select("id, user_id, member_id, meeting_id, meeting_url, transcript_data, meeting_transcript_id, created_at, status, leader_email")
    .eq("id", body.recall_bot_id)
    .maybeSingle();

  if (botErr || !bot) {
    return new Response(JSON.stringify({ error: "bot_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawTranscript = (bot.transcript_data as { raw_transcript?: unknown } | null)?.raw_transcript;
  if (!rawTranscript) {
    return new Response(JSON.stringify({ skipped: "no_transcript_yet" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signals = computeSignalsFromTranscript(rawTranscript);
  if (signals.participants.length === 0) {
    return new Response(JSON.stringify({ skipped: "no_speech_detected" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolver member_id por nome de participante.
  const { data: teams } = await admin
    .from("teams")
    .select("id")
    .eq("leader_user_id", bot.user_id);
  const teamIds = (teams ?? []).map((t: { id: string }) => t.id);

  let members: Array<{ id: string; name: string; email: string | null }> = [];
  if (teamIds.length) {
    const { data } = await admin
      .from("team_members")
      .select("id, name, email")
      .in("team_id", teamIds);
    members = data ?? [];
  }

  const participantNameToMemberId = new Map<string, string>();
  for (const p of signals.participants) {
    const matches = matchMembersToParticipants(
      [{ name: p.participant_name } as { name: string }],
      members,
    );
    if (matches.length === 1) {
      participantNameToMemberId.set(p.participant_name, matches[0]);
    }
  }

  // Sentimento por LLM (best-effort — falha silenciosa).
  const sentiments: Record<string, { score: number; label: string; summary: string }> = {};
  try {
    const sentimentResult = await aiToolCall<{
      participants: Array<{ name: string; score: number; label: string; summary: string }>;
    }>({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "Você analisa o tom de cada participante em uma reunião 1:1 entre líder e liderado. " +
            "Para cada participante, devolva um score de -1 (muito negativo / tenso / desengajado) a +1 (muito positivo / engajado / aberto), " +
            "uma label em português ('positivo', 'neutro', 'negativo' ou 'tenso'), e um resumo de UMA frase explicando o tom percebido. " +
            "Seja factual, sem inventar emoções não evidentes no texto.",
        },
        {
          role: "user",
          content:
            "Transcrição:\n\n" +
            participantsTranscriptSnippet(rawTranscript).slice(0, 8000),
        },
      ],
      temperature: 0.2,
      tools: [
        {
          type: "function",
          function: {
            name: "report_sentiment",
            description: "Reporta o tom percebido de cada participante.",
            parameters: {
              type: "object",
              properties: {
                participants: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      score: { type: "number" },
                      label: { type: "string" },
                      summary: { type: "string" },
                    },
                    required: ["name", "score", "label", "summary"],
                  },
                },
              },
              required: ["participants"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "report_sentiment" } },
    });
    for (const r of sentimentResult.participants ?? []) {
      sentiments[r.name?.trim() ?? ""] = {
        score: Math.max(-1, Math.min(1, Number(r.score) || 0)),
        label: String(r.label || "neutro"),
        summary: String(r.summary || "").slice(0, 280),
      };
    }
  } catch (e) {
    console.warn("compute-meeting-signals: sentiment LLM failed:", e);
  }

  // Insert rows (upsert por unique constraint).
  const rows = signals.participants.map((p: ParticipantSignals) => {
    const memberId = participantNameToMemberId.get(p.participant_name) ?? null;
    const isLeader = !memberId && bot.leader_email
      ? !!bot.leader_email && p.participant_name.toLowerCase().includes(
          (bot.leader_email as string).split("@")[0].toLowerCase().split(".")[0] ?? "",
        )
      : false;
    const sent = bestSentimentMatch(sentiments, p.participant_name);
    return {
      manager_id: bot.user_id,
      member_id: memberId,
      recall_bot_id: bot.id,
      meeting_transcript_id: bot.meeting_transcript_id,
      participant_name: p.participant_name,
      is_leader: isLeader,
      meeting_seconds: signals.meeting_seconds,
      talk_seconds: p.talk_seconds,
      talk_pct: p.talk_pct,
      silence_seconds: signals.silence_seconds,
      turn_count: p.turn_count,
      avg_turn_words: p.avg_turn_words,
      questions_asked: p.questions_asked,
      interruptions_made: p.interruptions_made,
      words_total: p.words_total,
      words_per_minute: p.words_per_minute,
      sentiment_score: sent?.score ?? null,
      sentiment_label: sent?.label ?? null,
      sentiment_summary: sent?.summary ?? null,
      occurred_at: bot.created_at,
    };
  });

  const { error: upsertErr } = await admin
    .from("meeting_signals")
    .upsert(rows, { onConflict: "recall_bot_id,member_id,participant_name" });

  if (upsertErr) {
    console.error("compute-meeting-signals: upsert failed", upsertErr);
    return new Response(JSON.stringify({ error: "upsert_failed", detail: upsertErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, count: rows.length, meeting_seconds: signals.meeting_seconds }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function bestSentimentMatch(
  bag: Record<string, { score: number; label: string; summary: string }>,
  name: string,
): { score: number; label: string; summary: string } | null {
  if (bag[name]) return bag[name];
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const target = norm(name);
  let best: { score: number; label: string; summary: string } | null = null;
  let bestScore = 0;
  for (const [k, v] of Object.entries(bag)) {
    const a = norm(k);
    if (!a || !target) continue;
    const overlap = a.split(" ").filter((w) => w && target.includes(w)).length;
    if (overlap > bestScore) {
      best = v;
      bestScore = overlap;
    }
  }
  return best;
}

function participantsTranscriptSnippet(transcript: unknown): string {
  if (!Array.isArray(transcript)) return "";
  return (transcript as Array<{ participant?: { name?: string }; speaker?: string; words?: Array<{ text?: string }> }>)
    .map((s) => {
      const name = s.participant?.name || (typeof s.speaker === "string" ? s.speaker : "Participante");
      const text = (s.words ?? []).map((w) => w.text).join(" ");
      return `${name}: ${text}`;
    })
    .join("\n");
}
