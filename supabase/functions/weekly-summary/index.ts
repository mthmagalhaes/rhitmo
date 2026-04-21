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

async function buildLeaderSummary(
  admin: ReturnType<typeof getAdminClient>,
  managerId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<string | null> {
  const { count: notesCount } = await admin
    .from('feedbacks')
    .select('id', { count: 'exact', head: true })
    .eq('manager_id', managerId)
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString());

  if (!notesCount || notesCount === 0) return null;

  const { count: meetingsCount } = await admin
    .from('meeting_transcripts')
    .select('id', { count: 'exact', head: true })
    .eq('manager_id', managerId)
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString());

  const { data: members } = await admin
    .from('team_members')
    .select('id, name, teams!inner(leader_user_id)')
    .eq('teams.leader_user_id', managerId);

  const totalMembers = members?.length ?? 0;

  // Members without a note in 14d
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400 * 1000).toISOString();
  let staleCount = 0;
  if (members) {
    for (const m of members) {
      const { count } = await admin
        .from('feedbacks')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', m.id)
        .gte('created_at', fourteenDaysAgo);
      if (!count || count === 0) staleCount++;
    }
  }

  return JSON.stringify({
    notes: notesCount,
    meetings: meetingsCount ?? 0,
    members: totalMembers,
    stale: staleCount,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const auth = validateCronSecret(req);
  if (!auth.valid) return auth.error!;

  const admin = getAdminClient();
  const run = await startAutomationRun(admin, 'weekly-summary');
  const weekStarting = getWeekStarting();
  const weekStartDate = new Date(weekStarting + 'T00:00:00Z');
  const lastWeekDate = new Date(weekStartDate);
  lastWeekDate.setUTCDate(lastWeekDate.getUTCDate() - 7);

  let processed = 0;
  let delivered = 0;

  try {
    const { data: workspaces } = await admin
      .from('workspaces')
      .select('id, name, owner_id, hr_admin_ids')
      .eq('is_active', true);

    for (const ws of workspaces || []) {
      const ownerId = ws.owner_id as string | null;
      if (ownerId) {
        processed++;
        try {
          const summary = await buildLeaderSummary(admin, ownerId, lastWeekDate, weekStartDate);
          if (summary) {
            const stats = JSON.parse(summary);
            const message = `Resumo semanal: ${stats.notes} notas, ${stats.meetings} 1:1s com ${stats.members} liderados${stats.stale > 0 ? `. ⚠️ ${stats.stale} sem atividade há 14d+` : ''}.`;

            const result = await dispatchNotification(admin, {
              userId: ownerId,
              notificationType: 'weekly_summary',
              inApp: {
                leaderId: ownerId,
                nudgeType: 'weekly_summary',
                message,
                actionUrl: '/',
                severity: 'info',
              },
              email: {
                templateName: 'weekly-summary',
                templateData: {
                  weekStarting,
                  workspaceName: ws.name ?? 'seu time',
                  notesCount: stats.notes,
                  meetingsCount: stats.meetings,
                  membersCount: stats.members,
                  staleCount: stats.stale,
                },
              },
              slack: {
                text: message,
              },
            });
            if (result.delivered) delivered++;
          }
        } catch (e) {
          console.error('[weekly-summary] leader loop', ownerId, e);
        }
      }

      // HR admins
      const hrIds = (ws.hr_admin_ids as string[] | null) ?? [];
      for (const hrId of hrIds) {
        processed++;
        try {
          const message = `Resumo semanal HR — workspace "${ws.name}". Veja Health Score atualizado e líderes em risco.`;
          const result = await dispatchNotification(admin, {
            userId: hrId,
            notificationType: 'hr_alerts',
            inApp: {
              leaderId: hrId,
              nudgeType: 'weekly_hr_summary',
              message,
              actionUrl: '/hr',
              severity: 'info',
            },
            email: {
              templateName: 'weekly-summary',
              templateData: {
                weekStarting,
                workspaceName: ws.name,
                isHrAdmin: true,
              },
            },
            slack: { text: message },
          });
          if (result.delivered) delivered++;
        } catch (e) {
          console.error('[weekly-summary] hr loop', hrId, e);
        }
      }
    }

    await run.finish('success', delivered);
    return new Response(
      JSON.stringify({ ok: true, processed, delivered }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await run.finish('error', delivered, msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
