// Cron job: generates quarterly recap drafts on day 2 of Jan/Apr/Jul/Oct.
// Only runs for members with ≥1 confirmed monthly recap in the closed quarter.

import { startAutomationRun, getAdminClient } from '../_shared/automationRun.ts';
import { validateCronSecret } from '../_shared/cronAuth.ts';
import {
  RHITMO_IDENTITY,
  GUARDRAILS_PROMPT,
} from '../_shared/rhitmo-constitution.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

function firstDayOfQuarter(d: Date): string {
  const m = Math.floor(d.getUTCMonth() / 3) * 3;
  return `${d.getUTCFullYear()}-${String(m + 1).padStart(2, '0')}-01`;
}

function lastQuarterStart(): string {
  const now = new Date();
  const m = Math.floor(now.getUTCMonth() / 3) * 3 - 3;
  const y = m < 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const realMonth = ((m % 12) + 12) % 12;
  return firstDayOfQuarter(new Date(Date.UTC(y, realMonth, 1)));
}

function quarterRange(periodQuarter: string): { startMonth: string; endMonth: string } {
  const [y, m] = periodQuarter.split('-').map((x) => parseInt(x, 10));
  const startMonth = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = new Date(Date.UTC(y, m + 2, 1));
  const endMonth = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, '0')}-01`;
  return { startMonth, endMonth };
}

async function callAI(memberName: string, monthlies: any[]): Promise<any | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return null;

  const systemPrompt = `${RHITMO_IDENTITY}

Você é o "Rhitmo Trimestral" — consolida 1-3 mensais confirmados em uma calibração.

${GUARDRAILS_PROMPT}

Regras: highlights (2-3 com source_month), recurring_patterns (em 2+ meses), evolution_vs_previous, suggested_classification (precisa_subir|dentro_esperado|subindo_barra|acima_esperado), suggested_turnover_risk (low|medium|high), suggested_next_action_key (chave de matriz).`;

  const text = monthlies
    .map((m) => `[mês=${m.period_month}] Highlight: ${m.highlight_text || '(-)'} | Concern: ${m.concern_text || '(-)'} | Padrão: ${m.dominant_pattern || '(-)'}`)
    .join('\n');

  const userPrompt = `Liderado: ${memberName}\n\nMensais confirmados (${monthlies.length}):\n${text}\n\nJSON: {"highlights":[],"recurring_patterns":[],"evolution_vs_previous":null,"suggested_classification":"","suggested_turnover_risk":"","suggested_next_action_key":""}`;

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    return content ? JSON.parse(content) : null;
  } catch (e) {
    console.error('[cron-quarterly] AI fail', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const auth = validateCronSecret(req);
  if (!auth.valid) return auth.error!;

  const admin = getAdminClient();
  const periodQuarter = lastQuarterStart();
  const run = await startAutomationRun(admin, 'rhitmo-quarterly-recaps-generate', {
    period_quarter: periodQuarter,
  });

  let processed = 0;
  let errored = 0;
  const { startMonth, endMonth } = quarterRange(periodQuarter);

  try {
    const { data: teams } = await admin
      .from('teams')
      .select('id, leader_user_id, workspace_id, team_members(id, name)');

    if (!teams) {
      await run.finish('success', 0);
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const team of teams as any[]) {
      const leaderId = team.leader_user_id as string | null;
      const workspaceId = team.workspace_id as string;
      if (!leaderId) continue;

      for (const m of (team.team_members ?? []) as any[]) {
        try {
          const { data: existing } = await admin
            .from('quarterly_recaps')
            .select('id')
            .eq('member_id', m.id)
            .eq('period_quarter', periodQuarter)
            .maybeSingle();
          if (existing) continue;

          const { data: monthlies } = await admin
            .from('monthly_recaps')
            .select('id, period_month, highlight_text, concern_text, dominant_pattern, feedbacks_count, meetings_count')
            .eq('member_id', m.id)
            .eq('manager_id', leaderId)
            .eq('status', 'confirmed')
            .gte('period_month', startMonth)
            .lt('period_month', endMonth)
            .order('period_month', { ascending: true });

          if (!monthlies || monthlies.length === 0) continue;

          const ai = await callAI(m.name, monthlies as any[]);
          if (!ai) {
            errored++;
            continue;
          }

          const totalFb = (monthlies as any[]).reduce((acc, x) => acc + (x.feedbacks_count ?? 0), 0);
          const totalMt = (monthlies as any[]).reduce((acc, x) => acc + (x.meetings_count ?? 0), 0);

          const { error: insErr } = await admin.from('quarterly_recaps').insert({
            member_id: m.id,
            manager_id: leaderId,
            workspace_id: workspaceId,
            period_quarter: periodQuarter,
            status: 'draft',
            highlights: ai.highlights ?? [],
            recurring_patterns: ai.recurring_patterns ?? [],
            evolution_vs_previous: ai.evolution_vs_previous ?? null,
            ai_suggested_classification: ai.suggested_classification ?? null,
            classification: null,
            ai_suggested_next_action_key: ai.suggested_next_action_key ?? null,
            next_action_key: null,
            turnover_risk: ai.suggested_turnover_risk ?? null,
            source_monthly_recap_ids: (monthlies as any[]).map((x) => x.id),
            source_feedbacks_count: totalFb,
            source_meetings_count: totalMt,
            ai_generated_at: new Date().toISOString(),
            ai_model: 'google/gemini-2.5-flash',
          });

          if (insErr) {
            console.error('[cron-quarterly] insert fail', m.id, insErr.message);
            errored++;
            continue;
          }

          await admin.from('leader_nudges').insert({
            leader_id: leaderId,
            member_id: m.id,
            nudge_type: 'quarterly_recap_pending',
            severity: 'info',
            message: `Rhitmo Trimestral de ${m.name} pronto para calibração (~5 min).`,
            action_url: `/member/${m.id}?tab=rhitmo`,
          });

          processed++;
        } catch (e) {
          console.error('[cron-quarterly] member fail', m.id, e);
          errored++;
        }
      }
    }

    await run.finish(errored > 0 ? 'partial' : 'success', processed, errored ? `${errored} errors` : undefined);
    return new Response(
      JSON.stringify({ ok: true, processed, errored, period_quarter: periodQuarter }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[cron-quarterly] fatal', msg);
    await run.finish('error', processed, msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
