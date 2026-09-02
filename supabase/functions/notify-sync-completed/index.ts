// Avisa o líder que o liderado concluiu o Rhitmo Sync.
// Público (o liderado responde a pesquisa sem sessão), mas o destinatário é
// sempre resolvido no servidor a partir do time do liderado.
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { sendAppEmail } from '../_shared/appEmail.ts'
import { APP_URL, adminClient, corsHeaders, json } from '../_shared/memberEmailAccess.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { memberId } = await req.json()
    if (!memberId) return json({ error: 'memberId é obrigatório' }, 400)

    const admin = adminClient()
    const { data: member } = await admin
      .from('team_members')
      .select('id, name, team_id, skills_data')
      .eq('id', memberId)
      .maybeSingle()
    if (!member) return json({ error: 'Liderado não encontrado' }, 404)

    // Só notifica quando a pesquisa realmente foi respondida.
    if (!member.skills_data) return json({ success: false, reason: 'sync_not_completed' })

    const { data: team } = await admin
      .from('teams')
      .select('id, name, leader_user_id, workspace_id')
      .eq('id', member.team_id)
      .maybeSingle()
    if (!team) return json({ error: 'Time não encontrado' }, 404)

    let leaderId = team.leader_user_id
    if (!leaderId) {
      const { data: workspace } = await admin
        .from('workspaces')
        .select('owner_id')
        .eq('id', team.workspace_id)
        .maybeSingle()
      leaderId = workspace?.owner_id ?? null
    }
    if (!leaderId) return json({ success: false, reason: 'leader_not_found' })

    const { data: authUser } = await admin.auth.admin.getUserById(leaderId)
    const leaderEmail = authUser?.user?.email
    if (!leaderEmail) return json({ success: false, reason: 'leader_without_email' })

    const result = await sendAppEmail('sync-completed', leaderEmail, {
      idempotencyKey: `sync-completed-${member.id}`,
      templateData: {
        memberName: member.name,
        leaderName:
          (authUser?.user?.user_metadata?.full_name as string | undefined) || 'Líder',
        teamName: team.name,
        profileUrl: `${APP_URL}/member/${member.id}`,
      },
    })

    return json({ success: result.sent, reason: result.sent ? null : result.reason })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[notify-sync-completed] failed:', message)
    return json({ error: message }, 500)
  }
})
