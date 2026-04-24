// supabase/functions/send-evidence-digest/index.ts
// Daily cron: sends Slack DM digest of pending evidence to leaders, respecting cadence preferences.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
const APP_URL = 'https://app-rhitmo.lovable.app';

// ── Cadence eligibility check ─────────────────────────────
function isDueForCadence(
  cadence: 'weekly' | 'biweekly' | 'monthly',
  dayOfWeek: number,
  lastSentAt: string | null,
  now: Date,
): boolean {
  // Day of week match (0 = Sunday)
  if (now.getUTCDay() !== dayOfWeek) return false;

  if (!lastSentAt) return true;
  const last = new Date(lastSentAt);
  const diffMs = now.getTime() - last.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (cadence === 'weekly') return diffDays >= 6.5;
  if (cadence === 'biweekly') return diffDays >= 13.5;
  if (cadence === 'monthly') return diffDays >= 27;
  return false;
}

async function slackPostDM(slackUserId: string, blocks: unknown[], text: string) {
  if (!SLACK_BOT_TOKEN) return { ok: false, error: 'no_token' };
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({ channel: slackUserId, blocks, text }),
  });
  return await res.json();
}

interface EvidenceRow {
  id: string;
  manager_id: string;
  member_id: string;
  category: string;
  slack_channel_id: string;
}

interface MemberLite { id: string; name: string }

interface DigestPref {
  user_id: string;
  cadence: 'weekly' | 'biweekly' | 'monthly';
  channel: 'slack' | 'in_app' | 'both';
  day_of_week: number;
  last_sent_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const runStart = new Date();
  console.log('[DIGEST] Started at', runStart.toISOString());

  // Log start in automation_runs
  const { data: run } = await supabase
    .from('automation_runs')
    .insert({ job_name: 'send_evidence_digest', status: 'running' })
    .select('id')
    .single();
  const runId = run?.id;

  let processed = 0;
  let sent = 0;
  let errors = 0;

  try {
    // 1. Load all digest preferences (default = weekly + both for everyone with at least 1 pending)
    const { data: prefs } = await supabase
      .from('leader_digest_preferences')
      .select('*');

    const prefsList = (prefs || []) as DigestPref[];
    console.log('[DIGEST] Loaded', prefsList.length, 'preferences');

    // 2. For each leader, decide if they should receive the digest now
    for (const pref of prefsList) {
      processed++;
      try {
        const due = isDueForCadence(pref.cadence, pref.day_of_week, pref.last_sent_at, runStart);
        if (!due) {
          console.log('[DIGEST] Not due:', pref.user_id, '| cadence:', pref.cadence);
          continue;
        }

        // Pending evidence for this leader, grouped by member
        const { data: evidences } = await supabase
          .from('slack_ambient_evidence')
          .select('id, manager_id, member_id, category, slack_channel_id')
          .eq('manager_id', pref.user_id)
          .eq('status', 'pending');

        const evList = (evidences || []) as EvidenceRow[];
        if (evList.length === 0) {
          console.log('[DIGEST] No pending evidence for', pref.user_id);
          continue;
        }

        // Group by member
        const byMember = new Map<string, EvidenceRow[]>();
        for (const e of evList) {
          if (!byMember.has(e.member_id)) byMember.set(e.member_id, []);
          byMember.get(e.member_id)!.push(e);
        }

        // Resolve member names
        const memberIds = Array.from(byMember.keys());
        const { data: members } = await supabase
          .from('team_members')
          .select('id, name')
          .in('id', memberIds);
        const memberMap = new Map<string, string>();
        for (const m of (members || []) as MemberLite[]) memberMap.set(m.id, m.name);

        const lines = Array.from(byMember.entries()).slice(0, 8).map(([memId, list]) => {
          const name = memberMap.get(memId) || 'Liderado';
          const cats = list.map((l) => l.category);
          const dominantCat = cats.sort((a, b) => cats.filter((c) => c === a).length - cats.filter((c) => c === b).length).pop();
          return `• *${name}*: ${list.length} ${list.length === 1 ? 'evidência' : 'evidências'} (${dominantCat || 'mensagens'})`;
        });

        // Send Slack DM if channel allows
        if (pref.channel === 'slack' || pref.channel === 'both') {
          // Resolve user's slack_user_id
          const { data: slackInt } = await supabase
            .from('slack_integrations')
            .select('slack_user_id')
            .eq('user_id', pref.user_id)
            .limit(1)
            .maybeSingle();

          if (slackInt?.slack_user_id) {
            const blocks = [
              {
                type: 'header',
                text: { type: 'plain_text', text: '📊 Resumo Rhitmo', emoji: true },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `Você tem *${evList.length} evidências* esperando revisão sobre *${memberIds.length} liderado${memberIds.length === 1 ? '' : 's'}*:\n\n${lines.join('\n')}`,
                },
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Revisar agora', emoji: true },
                    style: 'primary',
                    url: `${APP_URL}/evidence`,
                    action_id: 'open_evidence',
                  },
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Mudar cadência', emoji: true },
                    url: `${APP_URL}/dashboard/perfil`,
                    action_id: 'open_settings',
                  },
                ],
              },
              {
                type: 'context',
                elements: [
                  { type: 'mrkdwn', text: `Cadência atual: *${pref.cadence}*. Powered by Rhitmo 💜` },
                ],
              },
            ];

            const slackRes = await slackPostDM(
              slackInt.slack_user_id,
              blocks,
              `Você tem ${evList.length} evidências do Slack para revisar`,
            );
            console.log('[DIGEST] Slack DM ok:', slackRes.ok, '| user:', pref.user_id);
            if (!slackRes.ok) errors++;
          } else {
            console.log('[DIGEST] No slack_user_id for', pref.user_id);
          }
        }

        // Mark as sent (in_app card always counts as "sent" since it just renders from DB)
        await supabase
          .from('leader_digest_preferences')
          .update({ last_sent_at: runStart.toISOString() })
          .eq('user_id', pref.user_id);

        sent++;
      } catch (err) {
        console.error('[DIGEST] Error processing', pref.user_id, err);
        errors++;
      }
    }

    if (runId) {
      await supabase
        .from('automation_runs')
        .update({
          status: 'completed',
          finished_at: new Date().toISOString(),
          items_processed: processed,
          metadata: { sent, errors, prefs_total: prefsList.length },
        })
        .eq('id', runId);
    }

    return new Response(
      JSON.stringify({ ok: true, processed, sent, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[DIGEST] Fatal', err);
    if (runId) {
      await supabase
        .from('automation_runs')
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          error: String(err),
        })
        .eq('id', runId);
    }
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
