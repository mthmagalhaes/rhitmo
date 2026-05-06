// ============================================================================
// Sprint 16 — Slack Delivery: Rhitmo Trimestral
// Cron-driven proactive Slack DM to leaders summarizing each direct report's
// quarterly recap. Idempotent via quarterly_recaps.slack_delivered_at.
//
// Default schedule: 0 13 1 1,4,7,10 *  (1st of jan/apr/jul/oct, 13:00 UTC)
// Can be triggered manually via POST {force?: boolean, leader_user_id?: string}
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

const APP_BASE_URL = 'https://rhitmo.co';
const MAX_RECAPS_PER_DM = 8;
const LOOKBACK_DAYS = 7;

async function slackApi(method: string, body: Record<string, unknown>) {
  const token = Deno.env.get('SLACK_BOT_TOKEN');
  if (!token) {
    console.error('[QUARTERLY_DELIVERY] Missing SLACK_BOT_TOKEN');
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

interface RecapRow {
  id: string;
  member_id: string;
  manager_id: string;
  period_quarter: string;
  highlights: any;
  turnover_risk: string | null;
  ai_suggested_classification: string | null;
  classification: string | null;
  peer_voices: any;
  team_members: { id: string; name: string } | null;
}

function quarterLabel(periodQuarter: string): string {
  const d = new Date(periodQuarter + 'T00:00:00Z');
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} ${d.getUTCFullYear()}`;
}

function classificationLabel(c: string | null): string {
  if (!c) return '';
  const map: Record<string, string> = {
    precisa_subir: '⚠️ Precisa subir',
    dentro_esperado: '✅ Dentro do esperado',
    subindo_barra: '📈 Subindo a barra',
    acima_esperado: '⭐ Acima do esperado',
  };
  return map[c] ?? c;
}

function turnoverLabel(r: string | null): string {
  if (!r || r === 'low') return '';
  if (r === 'medium') return '🟡 risco médio';
  if (r === 'high') return '🔴 risco alto';
  return '';
}

function buildMemberBlock(recap: RecapRow): any[] {
  const memberName = recap.team_members?.name ?? 'Liderado';
  const cls = classificationLabel(recap.classification ?? recap.ai_suggested_classification);
  const turnover = turnoverLabel(recap.turnover_risk);
  const highlights = Array.isArray(recap.highlights) ? recap.highlights : [];
  const top = highlights[0];
  const voices = Array.isArray(recap.peer_voices) ? recap.peer_voices : [];
  const voice = voices[0];

  const lines: string[] = [`*${memberName}*${cls ? ` — ${cls}` : ''}${turnover ? ` · ${turnover}` : ''}`];
  if (top?.title) {
    const detail = top.detail ? ` — ${top.detail}` : '';
    lines.push(`• Destaque: ${top.title}${detail}`.slice(0, 280));
  }
  if (voice?.text) {
    const text = String(voice.text).replace(/\s+/g, ' ').slice(0, 180);
    lines.push(`• 🗣️ ${voice.peer_name || 'Par'}: "${text}"`);
  }

  const recapUrl = `${APP_BASE_URL}/lider/avaliacoes?recap=${recap.id}`;
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: lines.join('\n') },
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'Abrir' },
        url: recapUrl,
        action_id: `open_recap_${recap.id}`.slice(0, 250),
      },
    },
  ];
}

function buildHeaderBlocks(quarter: string, count: number): any[] {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📊 Rhitmo Trimestral — ${quarter}` },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          count === 1
            ? '_Tem 1 liderado com leitura nova do trimestre. Dá uma passada quando puder._'
            : `_Tem ${count} liderados com leitura nova do trimestre. Dá uma passada quando puder._`,
      },
    },
    { type: 'divider' },
  ];
}

async function deliverForLeader(leaderUserId: string, recaps: RecapRow[]): Promise<{ sent: number; errors: number }> {
  let sent = 0;
  let errors = 0;

  const { data: integ } = await supabase
    .from('slack_integrations')
    .select('slack_user_id')
    .eq('user_id', leaderUserId)
    .maybeSingle();
  const slackUserId = (integ as any)?.slack_user_id;
  if (!slackUserId) {
    console.log('[QUARTERLY_DELIVERY] leader has no Slack', leaderUserId);
    return { sent, errors };
  }

  // Use the same quarter for the header (most common) — assume all recaps in this batch share it
  const quarter = quarterLabel(recaps[0].period_quarter);

  // Chunk into batches of MAX_RECAPS_PER_DM
  const chunks: RecapRow[][] = [];
  for (let i = 0; i < recaps.length; i += MAX_RECAPS_PER_DM) {
    chunks.push(recaps.slice(i, i + MAX_RECAPS_PER_DM));
  }

  let threadTs: string | null = null;
  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    const blocks: any[] = [];
    if (idx === 0) blocks.push(...buildHeaderBlocks(quarter, recaps.length));
    for (const r of chunk) {
      blocks.push(...buildMemberBlock(r));
      blocks.push({ type: 'divider' });
    }

    const result: any = await slackApi('chat.postMessage', {
      channel: slackUserId,
      text: `Rhitmo Trimestral ${quarter}: ${recaps.length} liderado(s)`,
      blocks,
      ...(threadTs ? { thread_ts: threadTs } : {}),
    });

    if (!result.ok) {
      errors++;
      console.error('[QUARTERLY_DELIVERY] post failed', result.error);
      continue;
    }
    if (idx === 0) threadTs = result.ts;

    // Mark this chunk's recaps as delivered
    const ids = chunk.map((r) => r.id);
    const { error: updErr } = await supabase
      .from('quarterly_recaps')
      .update({ slack_delivered_at: new Date().toISOString() })
      .in('id', ids);
    if (updErr) {
      console.error('[QUARTERLY_DELIVERY] mark delivered failed', updErr.message);
      errors++;
    } else {
      sent += chunk.length;
    }
  }

  return { sent, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const cronCheck = validateCronSecret(req);
    if (!cronCheck.valid) {
      const auth = req.headers.get('Authorization') || '';
      if (!auth.startsWith('Bearer ')) {
        return cronCheck.error ?? new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    let body: { force?: boolean; leader_user_id?: string } = {};
    try {
      if (req.method === 'POST') body = await req.json();
    } catch {
      body = {};
    }

    const cutoffIso = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('quarterly_recaps')
      .select(
        'id, member_id, manager_id, period_quarter, highlights, turnover_risk, ai_suggested_classification, classification, peer_voices, team_members:member_id ( id, name )',
      )
      .gte('ai_generated_at', cutoffIso)
      .order('manager_id', { ascending: true })
      .order('period_quarter', { ascending: false });

    if (!body.force) query = query.is('slack_delivered_at', null);
    if (body.leader_user_id) query = query.eq('manager_id', body.leader_user_id);

    const { data: recaps, error } = await query.limit(500);
    if (error) {
      console.error('[QUARTERLY_DELIVERY] query error', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!recaps || recaps.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: 'no recaps to deliver' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group by manager_id
    const byLeader = new Map<string, RecapRow[]>();
    for (const r of recaps as any[]) {
      if (!r.manager_id) continue;
      const arr = byLeader.get(r.manager_id) ?? [];
      arr.push(r as RecapRow);
      byLeader.set(r.manager_id, arr);
    }

    let totalSent = 0;
    let totalErrors = 0;
    let leadersProcessed = 0;
    for (const [leaderId, leaderRecaps] of byLeader) {
      const { sent, errors } = await deliverForLeader(leaderId, leaderRecaps);
      totalSent += sent;
      totalErrors += errors;
      leadersProcessed++;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        leaders_processed: leadersProcessed,
        recaps_delivered: totalSent,
        errors: totalErrors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[QUARTERLY_DELIVERY] fatal', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
