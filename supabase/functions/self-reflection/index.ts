import { validateCronSecret } from '../_shared/cronAuth.ts';
import { getAdminClient, startAutomationRun } from '../_shared/automationRun.ts';
import { dispatchNotification } from '../_shared/notifications.ts';
import { pickPromptForWeek } from './prompts.ts';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const auth = validateCronSecret(req);
  if (!auth.valid) return auth.error!;

  const admin = getAdminClient();
  const run = await startAutomationRun(admin, 'self-reflection');
  const weekStarting = getWeekStarting();

  let processed = 0;
  let promptsCreated = 0;

  try {
    // All linked + accepted members
    const { data: members } = await admin
      .from('team_members')
      .select('id, name, linked_user_id, invite_status, teams!inner(workspaces!inner(default_locale))')
      .not('linked_user_id', 'is', null)
      .eq('invite_status', 'accepted');

    for (const m of members || []) {
      processed++;
      const userId = m.linked_user_id as string;
      try {
        // Skip if prompt already exists for this week
        const { data: existing } = await admin
          .from('member_prompts')
          .select('id')
          .eq('member_id', m.id)
          .eq('week_starting', weekStarting)
          .maybeSingle();
        if (existing) continue;

        const teamRel = m.teams as unknown as { workspaces?: { default_locale?: string } } | null;
        const locale = teamRel?.workspaces?.default_locale ?? 'pt-BR';
        const prompt = pickPromptForWeek(locale, weekStarting);

        const { error: insertErr } = await admin.from('member_prompts').insert({
          member_id: m.id,
          linked_user_id: userId,
          prompt_key: prompt.key,
          prompt_text: prompt.text,
          week_starting: weekStarting,
        });
        if (insertErr) {
          console.error('[self-reflection] insert failed', m.id, insertErr);
          continue;
        }
        promptsCreated++;

        await dispatchNotification(admin, {
          userId,
          notificationType: 'self_reflection',
          inApp: {
            leaderId: userId,
            memberId: m.id as string,
            nudgeType: 'self_reflection',
            message: `Reflexão da semana: ${prompt.text}`,
            actionUrl: '/',
            severity: 'info',
          },
          email: {
            templateName: 'weekly-summary', // reuse template, can be specialized later
            templateData: {
              isReflection: true,
              promptText: prompt.text,
              weekStarting,
            },
          },
          slack: {
            text: `🪞 *Reflexão da semana*\n${prompt.text}`,
          },
        });
      } catch (e) {
        console.error('[self-reflection] member loop', m.id, e);
      }
    }

    await run.finish('success', promptsCreated);
    return new Response(
      JSON.stringify({ ok: true, processed, promptsCreated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await run.finish('error', promptsCreated, msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
