import { validateCronSecret } from '../_shared/cronAuth.ts';
import { getAdminClient, startAutomationRun } from '../_shared/automationRun.ts';
import { dispatchNotification } from '../_shared/notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

function getWeekStarting(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

interface RiskRow {
  manager_id: string;
  manager_name: string;
  manager_email: string;
  members_without_note_30d: number;
  last_mentor_chat_at: string | null;
  last_activity_at: string | null;
  risk_reason: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const auth = validateCronSecret(req);
  if (!auth.valid) return auth.error!;

  const admin = getAdminClient();
  const run = await startAutomationRun(admin, 'hr-risk-alerts');
  const weekStarting = getWeekStarting();

  let processed = 0;
  let alertsCreated = 0;

  try {
    const { data: workspaces } = await admin
      .from('workspaces')
      .select('id, name, hr_admin_ids')
      .eq('is_active', true);

    for (const ws of workspaces || []) {
      const hrIds = (ws.hr_admin_ids as string[] | null) ?? [];
      if (hrIds.length === 0) continue;

      // Use existing RPC
      const { data: risks, error: rpcErr } = await admin.rpc('get_leaders_at_risk', {
        _workspace_id: ws.id,
      });

      if (rpcErr) {
        console.error('[hr-risk-alerts] rpc failed', ws.id, rpcErr);
        continue;
      }

      const riskList = (risks as RiskRow[] | null) ?? [];
      if (riskList.length === 0) continue;

      for (const hrId of hrIds) {
        processed++;
        for (const risk of riskList) {
          // Dedupe: skip if alert already created this week for this leader
          const { data: existing } = await admin
            .from('leader_nudges')
            .select('id')
            .eq('leader_id', hrId)
            .eq('nudge_type', 'hr_auto_alert')
            .gte('created_at', weekStarting + 'T00:00:00Z')
            .ilike('message', `%${risk.manager_name}%`)
            .maybeSingle();
          if (existing) continue;

          const message = `🚨 Líder em risco: ${risk.manager_name} — ${risk.risk_reason}`;
          const result = await dispatchNotification(admin, {
            userId: hrId,
            notificationType: 'hr_alerts',
            inApp: {
              leaderId: hrId,
              nudgeType: 'hr_auto_alert',
              message,
              actionUrl: '/hr',
              severity: risk.members_without_note_30d >= 3 ? 'critical' : 'warning',
            },
            slack: { text: message },
          });
          if (result.delivered) alertsCreated++;
        }
      }
    }

    await run.finish('success', alertsCreated);
    return new Response(
      JSON.stringify({ ok: true, processed, alertsCreated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await run.finish('error', alertsCreated, msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
