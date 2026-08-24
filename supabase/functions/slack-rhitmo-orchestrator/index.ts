// ============================================================================
// Sprint 11.3 — Rhitmo Orchestrator
// Cron-driven proactive Slack DMs:
//   1) Direct report Pulse alerts (status='pending', not yet DM'd)
//
// Proactive 1:1 prep DMs were removed — agendas are generated on demand only
// (/rhitmo command, DM to Rhitmo, or the brief button inside the platform).
//
// Reuses SLACK_BOT_TOKEN and the same Slack API pattern as slack-bot/index.ts.
// Idempotency is enforced via the dm_sent_at column.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { validateCronSecret } from '../_shared/cronAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const MAX_PULSES_PER_RUN = 100;

// ── Slack API helper (mirrors slack-bot/index.ts) ───────────
async function slackApi(method: string, body: Record<string, unknown>) {
  const token = Deno.env.get('SLACK_BOT_TOKEN');
  if (!token) {
    console.error('[ORCHESTRATOR] Missing SLACK_BOT_TOKEN');
    return { ok: false, error: 'missing_token' };
  }
  try {
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    console.log('[SLACK_API]', method, '| ok:', json.ok, '| error:', json.error || 'none');
    return json;
  } catch (err) {
    console.error('[SLACK_API] threw for', method, err);
    return { ok: false, error: 'fetch_failed' };
  }
}

// ── Pulse type → human label ────────────────────────────────
function pulseTypeLabel(type: string | null | undefined): string {
  if (!type) return 'um tema rápido';
  const map: Record<string, string> = {
    well_being: 'bem-estar',
    workload: 'carga de trabalho',
    motivation: 'motivação',
    clarity: 'clareza de prioridades',
    relationship: 'relacionamento com a liderança',
    growth: 'crescimento',
    feedback: 'feedback',
    custom: 'um tema personalizado',
  };
  return map[type] ?? type.replace(/_/g, ' ');
}

// ── Block Kit builders ──────────────────────────────────────
function buildPulseDmBlocks(pulseId: string, type: string | null) {
  const label = pulseTypeLabel(type);
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🌀 Oi! Seu líder enviou um *Pulse rápido* sobre *${label}*.\nQuer responder agora por aqui mesmo?`,
      },
    },
    { type: 'context', elements: [{ type: 'mrkdwn', text: '⏱️ Leva ~2 minutos' }] },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          style: 'primary',
          text: { type: 'plain_text', text: '✍️ Responder Pulse' },
          action_id: 'answer_pulse',
          value: pulseId,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Mais tarde' },
          action_id: 'snooze_pulse',
          value: pulseId,
        },
      ],
    },
  ];
}

// ── Routine 2: Pulse DMs ────────────────────────────────────
async function runPulseRoutine(): Promise<{ sent: number; errors: number }> {
  let sent = 0;
  let errors = 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  const { data: pulses, error } = await supabase
    .from('pulse_surveys')
    .select(`
      id,
      member_id,
      type,
      sent_at,
      expires_at,
      dm_sent_at,
      status,
      team_members:member_id ( id, name, linked_user_id )
    `)
    .eq('status', 'pending')
    .gte('sent_at', sevenDaysAgo)
    .is('dm_sent_at', null)
    .not('member_id', 'is', null)
    .order('sent_at', { ascending: true })
    .limit(MAX_PULSES_PER_RUN);

  if (error) {
    console.error('[ORCHESTRATOR] pulses query error:', error.message);
    return { sent, errors: 1 };
  }
  if (!pulses || pulses.length === 0) {
    console.log('[ORCHESTRATOR] No pending pulses.');
    return { sent, errors };
  }

  // Filter expired in JS (PostgREST OR-with-NULL is awkward)
  const eligible = (pulses as any[]).filter(
    (p) => !p.expires_at || new Date(p.expires_at).getTime() > Date.now(),
  );

  // Resolve member -> linked_user_id -> slack_user_id
  const linkedUserIds = [
    ...new Set(eligible.map((p) => p.team_members?.linked_user_id).filter(Boolean)),
  ];
  if (linkedUserIds.length === 0) {
    console.log('[ORCHESTRATOR] No pulses with linked members.');
    return { sent, errors };
  }

  const { data: integrations } = await supabase
    .from('slack_integrations')
    .select('user_id, slack_user_id')
    .in('user_id', linkedUserIds);

  const slackByUserId = new Map<string, string>();
  for (const row of integrations ?? []) {
    if (row.user_id && row.slack_user_id) slackByUserId.set(row.user_id, row.slack_user_id);
  }

  for (const pulse of eligible) {
    try {
      const linkedUserId = pulse.team_members?.linked_user_id;
      const slackUserId = linkedUserId ? slackByUserId.get(linkedUserId) : undefined;
      if (!slackUserId) continue; // member not connected to Slack — silently skip

      const blocks = buildPulseDmBlocks(pulse.id, pulse.type);
      const result = await slackApi('chat.postMessage', {
        channel: slackUserId,
        text: 'Você tem um Pulse Survey pendente.',
        blocks,
      });

      if (!result.ok) {
        errors++;
        continue;
      }

      const { error: updErr } = await supabase
        .from('pulse_surveys')
        .update({ dm_sent_at: new Date().toISOString() })
        .eq('id', pulse.id);
      if (updErr) {
        console.error('[ORCHESTRATOR] mark dm_sent_at failed for', pulse.id, updErr.message);
      }
      sent++;
    } catch (err) {
      errors++;
      console.error('[ORCHESTRATOR] pulse row error:', err);
    }
  }

  // surface used variables for the linter (nowIso is for documentation)
  void nowIso;

  return { sent, errors };
}

// ── HTTP entrypoint ─────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = validateCronSecret(req);
  if (!auth.valid && auth.error) return auth.error;

  const startedAt = Date.now();
  console.log('[ORCHESTRATOR] Starting run');

  let pulses = { sent: 0, errors: 0 };

  try {
    pulses = await runPulseRoutine();
  } catch (err) {
    console.error('[ORCHESTRATOR] pulses routine threw:', err);
    pulses.errors++;
  }

  const elapsedMs = Date.now() - startedAt;
  console.log(
    `[ORCHESTRATOR] Done in ${elapsedMs}ms — pulses sent=${pulses.sent} err=${pulses.errors}`,
  );

  return new Response(
    JSON.stringify({
      ok: true,
      elapsed_ms: elapsedMs,
      processed: { pulses: pulses.sent },
      errors: { pulses: pulses.errors },
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
  );
});
