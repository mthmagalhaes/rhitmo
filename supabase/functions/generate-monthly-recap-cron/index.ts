// Cron job: generates monthly recap drafts for all eligible (member × leader) pairs.
// Runs on day 2 of each month. Only generates when the member has ≥3 evidences in the closed month.
// Creates a leader_nudge for each draft so the leader sees "Mensal aguardando confirmação".

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
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

const MIN_EVIDENCE = 3;

function lastMonthStart(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function monthRange(periodMonth: string): { start: string; end: string } {
  const [y, m] = periodMonth.split('-').map((x) => parseInt(x, 10));
  return {
    start: new Date(Date.UTC(y, m - 1, 1)).toISOString(),
    end: new Date(Date.UTC(y, m, 1)).toISOString(),
  };
}

interface AIRecap {
  highlight: { text: string; evidence: Array<{ feedback_id?: string; meeting_id?: string; date: string }> };
  concern: { text: string; evidence: Array<{ feedback_id?: string; meeting_id?: string; date: string }> };
  dominant_pattern: string;
}

async function callAI(memberName: string, feedbacks: any[], meetings: any[]): Promise<AIRecap | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return null;

  const systemPrompt = `${RHITMO_IDENTITY}

Você é o "Rhitmo Mensal" — gera resumo estruturado de 3 elementos: HIGHLIGHT, CONCERN, DOMINANT_PATTERN. Cada um com evidência real (feedback_id ou meeting_id da lista).

${GUARDRAILS_PROMPT}

Regras: cite IDs reais, sem invenção. Se sem evidência clara, retorne text="" e evidence=[].`;

  const evidenceText = [
    feedbacks.length > 0
      ? `## NOTAS:\n${feedbacks
          .map((f) => `[feedback_id=${f.id} | data=${f.occurred_at.slice(0, 10)} | tipo=${f.type}]\n${f.content.slice(0, 800)}`)
          .join('\n\n')}`
      : '',
    meetings.length > 0
      ? `\n\n## 1:1s:\n${meetings
          .map((m) => `[meeting_id=${m.id} | data=${m.created_at.slice(0, 10)}]\n${(m.leader_notes || m.transcript || '').slice(0, 800)}`)
          .join('\n\n')}`
      : '',
  ].join('');

  const userPrompt = `Liderado: ${memberName}\n\n${evidenceText}\n\nResponda JSON: {"highlight":{"text","evidence":[]},"concern":{"text","evidence":[]},"dominant_pattern":""}`;

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
    if (!res.ok) {
      console.error('[cron-monthly] AI error', res.status);
      return null;
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    return content ? (JSON.parse(content) as AIRecap) : null;
  } catch (e) {
    console.error('[cron-monthly] AI fail', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const auth = validateCronSecret(req);
  if (!auth.valid) return auth.error!;

  const admin = getAdminClient();
  const run = await startAutomationRun(admin, 'rhitmo-monthly-recaps-generate', {
    period_month: lastMonthStart(),
  });

  let processed = 0;
  let errored = 0;
  const periodMonth = lastMonthStart();
  const { start, end } = monthRange(periodMonth);

  try {
    // Fetch all active teams + members + leader
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
          // Skip if recap already exists for the month
          const { data: existing } = await admin
            .from('monthly_recaps')
            .select('id')
            .eq('member_id', m.id)
            .eq('period_month', periodMonth)
            .maybeSingle();
          if (existing) continue;

          // Count evidence
          const [{ count: fbCount }, { count: mtCount }] = await Promise.all([
            admin
              .from('feedbacks')
              .select('id', { count: 'exact', head: true })
              .eq('member_id', m.id)
              .eq('manager_id', leaderId)
              .gte('occurred_at', start)
              .lt('occurred_at', end),
            admin
              .from('meeting_transcripts')
              .select('id', { count: 'exact', head: true })
              .eq('member_id', m.id)
              .eq('manager_id', leaderId)
              .gte('created_at', start)
              .lt('created_at', end)
              .eq('processing_status', 'completed'),
          ]);

          const total = (fbCount ?? 0) + (mtCount ?? 0);
          if (total < MIN_EVIDENCE) continue;

          // Fetch full evidence
          const [{ data: feedbacks }, { data: meetings }] = await Promise.all([
            admin
              .from('feedbacks')
              .select('id, content, type, occurred_at')
              .eq('member_id', m.id)
              .eq('manager_id', leaderId)
              .gte('occurred_at', start)
              .lt('occurred_at', end)
              .order('occurred_at', { ascending: true }),
            admin
              .from('meeting_transcripts')
              .select('id, leader_notes, transcript, created_at')
              .eq('member_id', m.id)
              .eq('manager_id', leaderId)
              .gte('created_at', start)
              .lt('created_at', end)
              .eq('processing_status', 'completed')
              .order('created_at', { ascending: true }),
          ]);

          const ai = await callAI(m.name, (feedbacks ?? []) as any[], (meetings ?? []) as any[]);
          if (!ai) {
            errored++;
            continue;
          }

          const { data: inserted, error: insErr } = await admin
            .from('monthly_recaps')
            .insert({
              member_id: m.id,
              manager_id: leaderId,
              workspace_id: workspaceId,
              period_month: periodMonth,
              status: 'draft',
              highlight_text: ai.highlight?.text ?? '',
              highlight_evidence: ai.highlight?.evidence ?? [],
              concern_text: ai.concern?.text ?? '',
              concern_evidence: ai.concern?.evidence ?? [],
              dominant_pattern: ai.dominant_pattern ?? '',
              feedbacks_count: fbCount ?? 0,
              meetings_count: mtCount ?? 0,
              low_evidence: false,
              ai_generated_at: new Date().toISOString(),
              ai_model: 'google/gemini-2.5-flash',
            })
            .select('id')
            .single();

          if (insErr) {
            console.error('[cron-monthly] insert fail', m.id, insErr.message);
            errored++;
            continue;
          }

          // Nudge — best-effort
          await admin
            .from('leader_nudges')
            .insert({
              leader_id: leaderId,
              member_id: m.id,
              nudge_type: 'monthly_recap_pending',
              severity: 'info',
              message: `Rhitmo Mensal de ${m.name} pronto para sua confirmação (~3 min).`,
              action_url: `/member/${m.id}?tab=rhitmo`,
            })
            .select('id')
            .maybeSingle();

          processed++;
        } catch (e) {
          console.error('[cron-monthly] member fail', m.id, e);
          errored++;
        }
      }
    }

    await run.finish(errored > 0 ? 'partial' : 'success', processed, errored ? `${errored} errors` : undefined);
    return new Response(
      JSON.stringify({ ok: true, processed, errored, period_month: periodMonth }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[cron-monthly] fatal', msg);
    await run.finish('error', processed, msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
