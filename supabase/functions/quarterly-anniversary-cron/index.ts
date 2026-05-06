// ============================================================================
// Sprint 17 — Quarterly Anniversary Cron
// Daily 12:00 UTC (09:00 BRT). Detects team members who:
//   - have been on the team ≥ 90 days, AND
//   - either never had a confirmed Rhitmo Trimestral OR the most recent
//     confirmed recap ended ≥ 90 days ago, AND
//   - have NOT received an anniversary nudge in the last 14 days (cooldown).
// For each match: insert a leader_nudges row + DM the leader on Slack
// (when integration exists) with buttons to generate-now / dismiss / open app.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { validateCronSecret } from '../_shared/cronAuth.ts';
import { suggestPeriod, buildAnniversaryDmBlocks } from '../_shared/quarterlyNudgeHelpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const COOLDOWN_DAYS = 14;
const MIN_DAYS_SINCE_CREATION = 90;
const MIN_DAYS_SINCE_LAST = 90;
const MAX_PER_RUN = 100;

async function slackDm(slackUserId: string, text: string, blocks: unknown[]) {
  const token = Deno.env.get('SLACK_BOT_TOKEN');
  if (!token) return { ok: false, error: 'missing_token' };
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: slackUserId, text, blocks }),
    });
    return await res.json();
  } catch (err) {
    console.error('[ANNIV] slackDm threw:', err);
    return { ok: false, error: 'fetch_failed' };
  }
}

interface MemberRow {
  id: string;
  name: string;
  created_at: string;
  last_anniversary_nudge_at: string | null;
  team_id: string;
  teams: { leader_user_id: string } | null;
}

async function processMember(m: MemberRow): Promise<'sent' | 'skipped' | 'error'> {
  try {
    const leaderId = m.teams?.leader_user_id;
    if (!leaderId) return 'skipped';

    const today = Date.now();
    const created = new Date(m.created_at).getTime();
    const daysSinceCreation = Math.floor((today - created) / (1000 * 60 * 60 * 24));
    if (daysSinceCreation < MIN_DAYS_SINCE_CREATION) return 'skipped';

    if (m.last_anniversary_nudge_at) {
      const lastNudge = new Date(m.last_anniversary_nudge_at).getTime();
      const daysSinceNudge = Math.floor((today - lastNudge) / (1000 * 60 * 60 * 24));
      if (daysSinceNudge < COOLDOWN_DAYS) return 'skipped';
    }

    // Last confirmed quarterly
    const { data: lastRecap } = await supabase
      .from('quarterly_recaps')
      .select('period_end')
      .eq('member_id', m.id)
      .eq('status', 'confirmed')
      .order('period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    let daysSinceLast: number | null = null;
    if (lastRecap?.period_end) {
      const end = new Date(lastRecap.period_end + 'T00:00:00Z').getTime();
      daysSinceLast = Math.floor((today - end) / (1000 * 60 * 60 * 24));
      if (daysSinceLast < MIN_DAYS_SINCE_LAST) return 'skipped';
    }

    const suggested = suggestPeriod(m.created_at, lastRecap?.period_end ?? null);

    // 1) leader_nudges row (in-app banner)
    await supabase.from('leader_nudges').insert({
      leader_id: leaderId,
      member_id: m.id,
      nudge_type: 'quarterly_due',
      severity: 'info',
      message:
        daysSinceLast === null
          ? `${m.name} já está há ${daysSinceCreation} dias no time. Que tal o primeiro Rhitmo Trimestral?`
          : `Já passou ${daysSinceLast} dias desde o último Rhitmo Trimestral de ${m.name}.`,
      action_url: `/lider/avaliacoes?member=${m.id}&suggest=quarterly&start=${suggested.period_start}&end=${suggested.period_end}`,
    });

    // 2) Slack DM (best-effort)
    const { data: integ } = await supabase
      .from('slack_integrations')
      .select('slack_user_id, workspace_id')
      .eq('user_id', leaderId)
      .limit(1)
      .maybeSingle();

    if (integ?.slack_user_id && integ.workspace_id) {
      const blocks = buildAnniversaryDmBlocks(
        m.name,
        m.id,
        daysSinceCreation,
        daysSinceLast,
        suggested,
      );
      const dmRes = await slackDm(
        integ.slack_user_id,
        `Sugestão da Rhitmo: gerar Trimestral de ${m.name}.`,
        blocks,
      );
      if (dmRes.ok) {
        // Set conversational state so a natural-language "sim/pode gerar" reply
        // routes to generate_quarterly_confirm.
        await supabase.from('slack_conversations').insert({
          workspace_id: integ.workspace_id,
          slack_user_id: integ.slack_user_id,
          intent: 'awaiting_quarterly_confirmation',
          status: 'active',
          state_data: {
            member_id: m.id,
            member_name: m.name,
            period_start: suggested.period_start,
            period_end: suggested.period_end,
            period_label: suggested.period_label,
            turns: [],
          },
        });
      }
    }

    // 3) cooldown stamp
    await supabase
      .from('team_members')
      .update({ last_anniversary_nudge_at: new Date().toISOString() })
      .eq('id', m.id);

    return 'sent';
  } catch (err) {
    console.error('[ANNIV] processMember error', m.id, err);
    return 'error';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const auth = validateCronSecret(req);
  if (!auth.valid && auth.error) return auth.error;

  const startedAt = Date.now();
  const fourteenDaysAgo = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(Date.now() - MIN_DAYS_SINCE_CREATION * 24 * 60 * 60 * 1000).toISOString();

  // Fetch candidate members: created ≥ 90 days ago + cooldown OK
  const { data: members, error } = await supabase
    .from('team_members')
    .select('id, name, created_at, last_anniversary_nudge_at, team_id, teams!inner(leader_user_id)')
    .lte('created_at', ninetyDaysAgo)
    .or(`last_anniversary_nudge_at.is.null,last_anniversary_nudge_at.lte.${fourteenDaysAgo}`)
    .limit(MAX_PER_RUN);

  if (error) {
    console.error('[ANNIV] query error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let sent = 0, skipped = 0, errored = 0;
  for (const m of (members ?? []) as MemberRow[]) {
    const r = await processMember(m);
    if (r === 'sent') sent++;
    else if (r === 'skipped') skipped++;
    else errored++;
  }

  const elapsedMs = Date.now() - startedAt;
  console.log(`[ANNIV] Done in ${elapsedMs}ms — candidates=${members?.length ?? 0} sent=${sent} skipped=${skipped} errored=${errored}`);

  return new Response(
    JSON.stringify({ ok: true, elapsed_ms: elapsedMs, sent, skipped, errored, candidates: members?.length ?? 0 }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
  );
});
