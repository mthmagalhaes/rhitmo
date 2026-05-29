// Slack Weekly Rollup — Sprint 23 (consolidação total)
// Cron diário 04:30 UTC: para cada (workspace, member) com >=3 evidências
// em slack_ambient_evidence nos últimos 7d, gera um resumo agregado
// (temas + top colaboradores + canais + narrativa + bullets temáticos
// atrelados a evidências reais + avaliação curta da IA) e upserta como
// context_evidence(evidence_type='slack_activity_rollup'). Esse card é
// a ÚNICA superfície que o líder vê no Diário: virou anotação editável,
// com expansão de evidências (permalinks) e ações de gestão.
//
// Privacidade: nunca expõe mensagens cruas no `summary` salvo (só na
// narrativa neutra). Os permalinks são renderizados pelo frontend sob
// demanda, buscando direto na tabela slack_ambient_evidence (cobre RLS).
// Bots/DMs/canais privados já filtrados pelo classifier.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { validateCronSecret } from '../_shared/cronAuth.ts';
import { getAdminClient, startAutomationRun } from '../_shared/automationRun.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const LOVABLE_AI = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';
const SLACK_API = 'https://slack.com/api';
const MIN_EVIDENCES = 3;
const WINDOW_DAYS = 7;

interface AmbientRow {
  id: string;
  member_id: string;
  workspace_id: string;
  manager_id: string;
  slack_channel_id: string;
  slack_channel_name: string | null;
  message_text: string;
  category: string;
  summary: string | null;
  captured_at: string;
}

interface RollupHighlight {
  bullet: string;
  subject: string;
  evidence_ids: string[];
}

interface RollupOutput {
  themes: string[];
  narrative: string;
  highlights: RollupHighlight[];
  ai_assessment: { tone: string; summary: string };
  top_collaborators: { name: string; interactions: number }[];
  top_channels: string[];
}

// Deterministic UUID v5-ish from a string (avoids extra deps)
async function deterministicUuid(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  const b = new Uint8Array(hash).slice(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function slackUserName(
  token: string,
  slackUserId: string,
  cache: Map<string, string>,
): Promise<string> {
  if (cache.has(slackUserId)) return cache.get(slackUserId)!;
  try {
    const res = await fetch(`${SLACK_API}/users.info?user=${slackUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await res.json();
    const name =
      j.user?.profile?.display_name ||
      j.user?.real_name ||
      j.user?.name ||
      slackUserId;
    cache.set(slackUserId, name);
    return name;
  } catch {
    cache.set(slackUserId, slackUserId);
    return slackUserId;
  }
}

function extractMentions(text: string): string[] {
  const out: string[] = [];
  const re = /<@([UW][A-Z0-9]+)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  return out;
}

async function generateRollup(
  apiKey: string,
  memberName: string,
  rows: AmbientRow[],
  collaborators: { name: string; interactions: number }[],
  topChannels: string[],
): Promise<RollupOutput | null> {
  // Lista de evidências com IDs para a IA referenciar
  const evidenceList = rows
    .slice(0, 60)
    .map(
      (r) =>
        `- id=${r.id} | canal=#${r.slack_channel_name ?? r.slack_channel_id} | cat=${r.category} | "${(r.summary ?? r.message_text).slice(0, 200)}"`,
    )
    .join('\n');

  const validIds = rows.slice(0, 60).map((r) => r.id);

  const prompt = `Você é um analista que sintetiza atividade pública de Slack para um líder de pessoas.
Analise os sinais agregados de ${memberName} nos últimos ${WINDOW_DAYS} dias e devolva JSON estruturado.

REGRAS:
- NÃO cite mensagens literais. NÃO invente nada.
- Cada highlight DEVE referenciar 1+ IDs de evidências reais da lista abaixo (campo evidence_ids).
- Se sinal for fraco, seja honesto na narrative ("sinal fraco esta semana") e retorne highlights vazio.
- Tom da avaliação: "construtivo" | "preocupação" | "positivo" | "neutro".

Formato esperado:
{
  "themes": ["2-4 temas/projetos concretos curtos"],
  "narrative": "2-3 frases neutras, terceira pessoa, descrevendo foco da semana",
  "highlights": [
    {
      "bullet": "Frase concreta do que aconteceu (1 frase, ~15-25 palavras)",
      "subject": "Assunto/projeto em 1-3 palavras (chip)",
      "evidence_ids": ["uuid1","uuid2"]
    }
    // 3 a 5 highlights
  ],
  "ai_assessment": {
    "tone": "construtivo|preocupação|positivo|neutro",
    "summary": "1-2 frases — leitura da IA sobre o padrão da semana"
  }
}

Top colaboradores (já calculado, NÃO altere): ${JSON.stringify(collaborators)}
Top canais (já calculado, NÃO altere): ${JSON.stringify(topChannels)}

Sinais classificados:
${evidenceList}

Retorne APENAS JSON válido.`;

  const res = await fetch(LOVABLE_AI, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    console.error('[LLM] HTTP', res.status, await res.text());
    return null;
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(content);
    const validSet = new Set(validIds);
    const highlights: RollupHighlight[] = Array.isArray(parsed.highlights)
      ? parsed.highlights
          .filter(
            (h: any) =>
              h && typeof h.bullet === 'string' && typeof h.subject === 'string',
          )
          .map((h: any) => ({
            bullet: h.bullet.slice(0, 240),
            subject: h.subject.slice(0, 40),
            evidence_ids: Array.isArray(h.evidence_ids)
              ? h.evidence_ids.filter((x: any) => typeof x === 'string' && validSet.has(x)).slice(0, 5)
              : [],
          }))
          .slice(0, 5)
      : [];
    const tone = ['construtivo', 'preocupação', 'preocupacao', 'positivo', 'neutro'].includes(
      parsed.ai_assessment?.tone,
    )
      ? parsed.ai_assessment.tone
      : 'neutro';
    return {
      themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 4) : [],
      narrative: typeof parsed.narrative === 'string' ? parsed.narrative : '',
      highlights,
      ai_assessment: {
        tone,
        summary:
          typeof parsed.ai_assessment?.summary === 'string'
            ? parsed.ai_assessment.summary
            : '',
      },
      top_collaborators: collaborators,
      top_channels: topChannels,
    };
  } catch (e) {
    console.error('[LLM] parse error', e);
    return null;
  }
}

async function processMember(
  admin: SupabaseClient,
  apiKey: string,
  slackToken: string,
  workspaceId: string,
  memberId: string,
  memberName: string,
  rows: AmbientRow[],
  windowStart: Date,
  windowEnd: Date,
  userCache: Map<string, string>,
): Promise<boolean> {
  // Collaborators from mentions in the messages
  const mentionCount: Record<string, number> = {};
  for (const r of rows) {
    for (const u of extractMentions(r.message_text)) {
      mentionCount[u] = (mentionCount[u] || 0) + 1;
    }
  }
  const topMentionIds = Object.entries(mentionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const collaborators: { name: string; interactions: number }[] = [];
  for (const [uid, count] of topMentionIds) {
    const name = await slackUserName(slackToken, uid, userCache);
    collaborators.push({ name, interactions: count });
  }

  // Top channels by frequency
  const channelCount: Record<string, number> = {};
  for (const r of rows) {
    const k = r.slack_channel_name ? `#${r.slack_channel_name}` : r.slack_channel_id;
    channelCount[k] = (channelCount[k] || 0) + 1;
  }
  const topChannels = Object.entries(channelCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  const rollup = await generateRollup(apiKey, memberName, rows, collaborators, topChannels);
  if (!rollup || !rollup.narrative) {
    console.log(`[member ${memberId}] empty rollup, skipping`);
    return false;
  }

  const weekKey = windowStart.toISOString().slice(0, 10);
  const sourceId = await deterministicUuid(`slack_rollup:${memberId}:${weekKey}`);
  const titleThemes = rollup.themes.slice(0, 2).join(' · ') || 'Atividade no Slack';

  const { error } = await admin.from('context_evidence').upsert(
    {
      id: sourceId,
      workspace_id: workspaceId,
      member_id: memberId,
      source_table: 'slack_ambient_evidence',
      source_id: sourceId,
      evidence_type: 'slack_activity_rollup',
      occurred_at: windowEnd.toISOString(),
      title: `Atividade no Slack — ${titleThemes}`.slice(0, 200),
      summary: rollup.narrative,
      sentiment: null,
      tags: ['slack', 'ambient', 'rollup', ...rollup.themes.slice(0, 3).map((t) => t.toLowerCase().slice(0, 30))],
      visibility: 'private_leader',
      metadata: {
        themes: rollup.themes,
        narrative: rollup.narrative,
        highlights: rollup.highlights,
        ai_assessment: rollup.ai_assessment,
        top_collaborators: rollup.top_collaborators,
        top_channels: rollup.top_channels,
        evidence_count: rows.length,
        window_start: windowStart.toISOString(),
        window_end: windowEnd.toISOString(),
        window_days: WINDOW_DAYS,
        schema_version: 2,
      },
    },
    { onConflict: 'source_table,source_id' },
  );

  if (error) {
    console.error(`[upsert ${memberId}]`, error.message);
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const auth = validateCronSecret(req);
  if (!auth.valid) return auth.error!;

  const slackToken = Deno.env.get('SLACK_BOT_TOKEN');
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!slackToken || !apiKey) {
    return new Response(JSON.stringify({ error: 'Missing SLACK_BOT_TOKEN or LOVABLE_API_KEY' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = getAdminClient();
  const run = await startAutomationRun(admin, 'slack-weekly-rollup');

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - WINDOW_DAYS * 24 * 3600 * 1000);

  let totalRollups = 0;
  let totalMembers = 0;

  try {
    const { data: rows, error } = await admin
      .from('slack_ambient_evidence')
      .select('id, member_id, workspace_id, manager_id, slack_channel_id, slack_channel_name, message_text, category, summary, captured_at')
      .gte('captured_at', windowStart.toISOString())
      .order('captured_at', { ascending: false })
      .limit(5000);
    if (error) throw error;

    if (!rows || rows.length === 0) {
      await run.finish('success', 0);
      return new Response(JSON.stringify({ ok: true, message: 'No ambient evidence in window' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const groups = new Map<string, AmbientRow[]>();
    for (const r of rows as AmbientRow[]) {
      const k = `${r.workspace_id}:${r.member_id}`;
      const arr = groups.get(k) ?? [];
      arr.push(r);
      groups.set(k, arr);
    }

    const memberIds = Array.from(new Set((rows as AmbientRow[]).map((r) => r.member_id)));
    const { data: members } = await admin
      .from('team_members')
      .select('id, name')
      .in('id', memberIds);
    const nameById = new Map<string, string>();
    (members ?? []).forEach((m: any) => nameById.set(m.id, m.name));

    const userCache = new Map<string, string>();

    for (const [key, evList] of groups) {
      if (evList.length < MIN_EVIDENCES) continue;
      const [workspaceId, memberId] = key.split(':');
      const memberName = nameById.get(memberId) ?? 'liderado';
      totalMembers++;

      const ok = await processMember(
        admin,
        apiKey,
        slackToken,
        workspaceId,
        memberId,
        memberName,
        evList,
        windowStart,
        windowEnd,
        userCache,
      );
      if (ok) totalRollups++;
    }

    await run.finish(totalRollups > 0 ? 'success' : 'partial', totalRollups);
    return new Response(
      JSON.stringify({
        ok: true,
        members_evaluated: totalMembers,
        rollups_upserted: totalRollups,
        window_days: WINDOW_DAYS,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await run.finish('error', totalRollups, msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
