import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { validateCronSecret } from '../_shared/cronAuth.ts';
import { getAdminClient, startAutomationRun } from '../_shared/automationRun.ts';
import { dispatchNotification } from '../_shared/notifications.ts';
import {
  RHITMO_IDENTITY,
  GUARDRAILS_PROMPT,
} from '../_shared/rhitmo-constitution.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface ManagerWorkspace {
  manager_id: string;
  workspace_id: string;
}

interface MirrorAnalysis {
  contradiction_score: number;
  summary: string;
  declared_priorities: string[];
  observed_themes: string[];
  evidence: Array<{ transcript_id: string; quote: string; date: string }>;
  recommended_action: string;
}

function getWeekStarting(d: Date = new Date()): string {
  // ISO week: Monday as first day
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

async function callMirrorAI(
  declaredPriorities: string[],
  transcriptThemes: Array<{ id: string; themes: string[]; notes: string; date: string }>,
): Promise<MirrorAnalysis | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

  const systemPrompt = `${RHITMO_IDENTITY}

Você é o "Mirror" — uma função especializada em detectar contradições entre o que o líder declarou como prioridade estratégica e o que de fato apareceu nas conversas 1:1 da semana.

${GUARDRAILS_PROMPT}

REGRAS ESPECÍFICAS DA MIRROR:
1. Compare prioridades declaradas (metas) com temas observados (1:1s).
2. Score de contradição (0-100): 0 = perfeito alinhamento, 100 = total desconexão.
3. Só gere insight se score >= 30. Caso contrário, retorne null.
4. Para evidências: cite IDs reais de transcrições e datas. NUNCA invente.
5. Resposta deve ser JSON válido, em português brasileiro, com a estrutura solicitada.`;

  const userPrompt = `Prioridades declaradas (metas ativas do time):
${declaredPriorities.length > 0 ? declaredPriorities.map((p, i) => `${i + 1}. ${p}`).join('\n') : '(nenhuma meta ativa registrada)'}

Temas observados nas conversas 1:1 desta semana:
${transcriptThemes.length > 0
  ? transcriptThemes
      .map(
        (t) =>
          `- Transcrição ${t.id} (${t.date}): temas=[${t.themes.join(', ')}]; trecho: "${t.notes.slice(0, 200)}"`,
      )
      .join('\n')
  : '(nenhuma transcrição na semana)'}

Responda APENAS com JSON no formato:
{
  "contradiction_score": number,
  "summary": "resumo curto em 2-3 frases",
  "declared_priorities": ["..."],
  "observed_themes": ["..."],
  "evidence": [{"transcript_id":"...","quote":"...","date":"YYYY-MM-DD"}],
  "recommended_action": "1 ação concreta para a próxima semana"
}

Se não houver dados suficientes, retorne: {"contradiction_score": 0, "summary": "Dados insuficientes para análise"}`;

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    console.error('[mirror-weekly] AI gateway error', res.status, await res.text());
    return null;
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return JSON.parse(content) as MirrorAnalysis;
  } catch (e) {
    console.error('[mirror-weekly] failed to parse AI JSON', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const auth = validateCronSecret(req);
  if (!auth.valid) return auth.error!;

  const admin = getAdminClient();
  const run = await startAutomationRun(admin, 'mirror-weekly');
  const weekStarting = getWeekStarting();
  const weekStartDate = new Date(weekStarting + 'T00:00:00Z');
  const lastWeekDate = new Date(weekStartDate);
  lastWeekDate.setUTCDate(lastWeekDate.getUTCDate() - 7);

  let processed = 0;
  let insightsCreated = 0;

  try {
    // 1) Get all active workspaces with their owners (leaders)
    const { data: workspaces, error: wsErr } = await admin
      .from('workspaces')
      .select('id, owner_id')
      .eq('is_active', true);
    if (wsErr) throw wsErr;

    const managerWs: ManagerWorkspace[] = (workspaces || [])
      .filter((w) => w.owner_id)
      .map((w) => ({ manager_id: w.owner_id as string, workspace_id: w.id as string }));

    for (const { manager_id, workspace_id } of managerWs) {
      processed++;
      try {
        // Skip if we already have an insight for this manager/week
        const { data: existing } = await admin
          .from('mirror_insights')
          .select('id')
          .eq('manager_id', manager_id)
          .eq('week_starting', weekStarting)
          .maybeSingle();
        if (existing) continue;

        // 2) Get last week's transcripts
        const { data: transcripts } = await admin
          .from('meeting_transcripts')
          .select('id, extracted_themes, leader_notes, transcript, created_at')
          .eq('manager_id', manager_id)
          .gte('created_at', lastWeekDate.toISOString())
          .lt('created_at', weekStartDate.toISOString())
          .eq('processing_status', 'completed');

        if (!transcripts || transcripts.length === 0) continue;

        // 3) Get active goals (declared priorities) — via team_members of this manager
        const { data: members } = await admin
          .from('team_members')
          .select('id, teams!inner(leader_user_id)')
          .eq('teams.leader_user_id', manager_id);

        const memberIds = (members || []).map((m) => m.id);
        let priorities: string[] = [];
        if (memberIds.length > 0) {
          const { data: goals } = await admin
            .from('goals')
            .select('title, description')
            .in('member_id', memberIds)
            .eq('status', 'active');
          priorities = (goals || []).map(
            (g) => g.title + (g.description ? ` — ${g.description.slice(0, 100)}` : ''),
          );
        }

        const themes = transcripts.map((t) => ({
          id: t.id as string,
          themes: (t.extracted_themes as string[] | null) ?? [],
          notes: ((t.leader_notes as string | null) ?? (t.transcript as string | null) ?? '').slice(0, 500),
          date: (t.created_at as string).slice(0, 10),
        }));

        const analysis = await callMirrorAI(priorities, themes);
        if (!analysis || analysis.contradiction_score < 30) continue;

        const { error: insertErr } = await admin.from('mirror_insights').insert({
          manager_id,
          workspace_id,
          week_starting: weekStarting,
          summary: analysis.summary,
          contradiction_score: Math.min(100, Math.max(0, analysis.contradiction_score)),
          declared_priorities: analysis.declared_priorities,
          observed_themes: analysis.observed_themes,
          evidence: analysis.evidence,
          recommended_action: analysis.recommended_action,
        });

        if (insertErr) {
          console.error('[mirror-weekly] insert failed', manager_id, insertErr);
          continue;
        }

        insightsCreated++;

        // Dispatch notification
        await dispatchNotification(admin, {
          userId: manager_id,
          notificationType: 'ai_pattern',
          inApp: {
            leaderId: manager_id,
            nudgeType: 'mirror_insight',
            message: `Espelho semanal: ${analysis.summary.slice(0, 140)}`,
            actionUrl: '/',
            severity: analysis.contradiction_score >= 60 ? 'warning' : 'info',
          },
        });
      } catch (e) {
        console.error('[mirror-weekly] manager loop error', manager_id, e);
      }
    }

    await run.finish('success', insightsCreated);
    return new Response(
      JSON.stringify({ ok: true, processed, insightsCreated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[mirror-weekly] fatal', msg);
    await run.finish('error', insightsCreated, msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
