// E-mails do teste de 14 dias, um por líder e por marco (nunca em lista):
//  - trial-first-evidence: primeira anotação/conversa registrada pelo líder
//  - trial-ending-4d: faltam ~4 dias
//  - trial-last-day: falta ~1 dia
// Só para workspaces v3 em teste ativo e sem assinatura. Idempotente via
// trial_email_log (unique user_id+template) + idempotencyKey.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { validateCronSecret } from '../_shared/cronAuth.ts'
import { sendAppEmail } from '../_shared/appEmail.ts'

const DAY = 86400000

Deno.serve(async (req) => {
  const { valid, error } = validateCronSecret(req)
  if (!valid) return error!

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const now = Date.now()
  const results: Record<string, number> = { sent: 0, skipped: 0, failed: 0 }

  const { data: workspaces, error: wsErr } = await admin
    .from('workspaces')
    .select('id, owner_id, trial_ends_at')
    .eq('billing_model', 'v3')
    .gt('trial_ends_at', new Date(now).toISOString())
    .lt('trial_ends_at', new Date(now + 15 * DAY).toISOString())
    .limit(500)
  if (wsErr) {
    return new Response(JSON.stringify({ error: wsErr.message }), { status: 500 })
  }

  for (const ws of workspaces ?? []) {
    try {
      const { data: subs } = await admin
        .from('subscriptions').select('id')
        .eq('workspace_id', ws.id).in('status', ['active', 'trialing', 'past_due']).limit(1)
      if (subs && subs.length > 0) { results.skipped++; continue }

      const userId = ws.owner_id as string
      const { data: u } = await admin.auth.admin.getUserById(userId)
      const email = u?.user?.email
      if (!email) { results.skipped++; continue }
      const leaderName = (u.user.user_metadata?.full_name as string | undefined)?.split(' ')[0]

      const { data: sentRows } = await admin.from('trial_email_log').select('template').eq('user_id', userId)
      const sent = new Set((sentRows ?? []).map((r: { template: string }) => r.template))

      const daysLeft = (new Date(ws.trial_ends_at as string).getTime() - now) / DAY
      const due: string[] = []

      if (!sent.has('trial-first-evidence')) {
        const { count: fb } = await admin.from('feedbacks').select('id', { count: 'exact', head: true }).eq('manager_id', userId)
        const { count: mt } = await admin.from('meeting_transcripts').select('id', { count: 'exact', head: true }).eq('manager_id', userId)
        if ((fb ?? 0) + (mt ?? 0) > 0) due.push('trial-first-evidence')
      }
      if (daysLeft <= 1.5 && !sent.has('trial-last-day')) due.push('trial-last-day')
      else if (daysLeft <= 4.5 && daysLeft > 1.5 && !sent.has('trial-ending-4d')) due.push('trial-ending-4d')

      if (due.length === 0) { results.skipped++; continue }

      let stats = {}
      if (due.some((t) => t !== 'trial-first-evidence')) {
        const { data: teams } = await admin.from('teams').select('id').eq('workspace_id', ws.id).eq('leader_user_id', userId)
        const teamIds = (teams ?? []).map((t: { id: string }) => t.id)
        const { count: members } = teamIds.length
          ? await admin.from('team_members').select('id', { count: 'exact', head: true }).in('team_id', teamIds)
          : { count: 0 }
        const { count: notes } = await admin.from('feedbacks').select('id', { count: 'exact', head: true }).eq('manager_id', userId)
        const { count: meetings } = await admin.from('meeting_transcripts').select('id', { count: 'exact', head: true }).eq('manager_id', userId)
        stats = { members: members ?? 0, notes: notes ?? 0, meetings: meetings ?? 0 }
      }

      for (const template of due) {
        // Reserva antes de enviar: o unique impede envio duplo em execuções concorrentes.
        const { error: insErr } = await admin.from('trial_email_log').insert({ workspace_id: ws.id, user_id: userId, template })
        if (insErr) { results.skipped++; continue }
        try {
          await sendAppEmail(template, email, {
            templateData: { leaderName, ...stats },
            idempotencyKey: `${template}:${userId}`,
          })
          results.sent++
        } catch (e) {
          console.error('[trial-drip] send failed', template, e instanceof Error ? e.message : e)
          await admin.from('trial_email_log').delete().eq('user_id', userId).eq('template', template)
          results.failed++
        }
      }
    } catch (e) {
      console.error('[trial-drip] workspace failed', ws.id, e)
      results.failed++
    }
  }

  console.log('[trial-drip] done', results)
  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } })
})
