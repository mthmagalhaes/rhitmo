// ============================================================================
// Sprint 17.3 — Slack echo for quarterly recap confirmation (UI path)
// When the leader confirms a recap from the web app, fire-and-forget invoke
// this function. It posts a compact DM ("✅ Trimestral confirmado") to Slack
// if the leader has an integration AND the recap has not yet been echoed
// (idempotency via quarterly_recaps.slack_delivered_at).
// Soft-fail: never blocks the UI confirmation.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { buildQuarterlyResultBlocks } from '../_shared/quarterlyNudgeHelpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

async function slackDm(channel: string, text: string, blocks: unknown[]) {
  const token = Deno.env.get('SLACK_BOT_TOKEN');
  if (!token) return { ok: false, error: 'missing_token' };
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, text, blocks }),
    });
    return await res.json();
  } catch (err) {
    console.error('[SLACK-ECHO] postMessage threw:', err);
    return { ok: false, error: 'fetch_failed' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const userId = userData.user.id;

  let body: { recap_id?: string };
  try { body = await req.json(); } catch { body = {}; }
  const recapId = body.recap_id;
  if (!recapId) {
    return new Response(JSON.stringify({ error: 'recap_id required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Ownership chain: recap → team_members → teams.leader_user_id must equal userId
  const { data: recap, error: recapErr } = await admin
    .from('quarterly_recaps')
    .select('id, status, slack_delivered_at, member_id, highlights, classification, ai_suggested_classification, turnover_risk, team_members:member_id(name, team_id, teams:team_id(leader_user_id))')
    .eq('id', recapId)
    .maybeSingle();

  if (recapErr || !recap) {
    return new Response(JSON.stringify({ error: 'recap_not_found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leaderId = (recap as any)?.team_members?.teams?.leader_user_id;
  if (!leaderId || leaderId !== userId) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (recap.status !== 'confirmed') {
    return new Response(JSON.stringify({ ok: true, skipped: 'not_confirmed' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (recap.slack_delivered_at) {
    return new Response(JSON.stringify({ ok: true, skipped: 'already_delivered' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Slack integration
  const { data: integ } = await admin
    .from('slack_integrations')
    .select('slack_user_id')
    .eq('user_id', leaderId)
    .limit(1)
    .maybeSingle();

  if (!integ?.slack_user_id) {
    return new Response(JSON.stringify({ ok: true, skipped: 'no_slack' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberName = (recap as any)?.team_members?.name ?? 'liderado(a)';
  const blocks = buildQuarterlyResultBlocks(
    memberName,
    recap.id,
    Array.isArray(recap.highlights) ? (recap.highlights as Array<{ title: string; detail: string }>) : [],
    (recap.classification ?? recap.ai_suggested_classification) as string | null,
    recap.turnover_risk as string | null,
  );

  const dmRes = await slackDm(
    integ.slack_user_id,
    `✅ Rhitmo Trimestral de ${memberName} confirmado.`,
    blocks,
  );

  if (dmRes.ok) {
    await admin
      .from('quarterly_recaps')
      .update({ slack_delivered_at: new Date().toISOString() })
      .eq('id', recap.id);
  }

  return new Response(JSON.stringify({ ok: true, delivered: !!dmRes.ok }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
