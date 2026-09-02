// Boas-vindas ao líder logo após a criação do workspace.
// Destinatário = e-mail da conta autenticada que criou o workspace.
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendAppEmail } from '../_shared/appEmail.ts'
import { adminClient, corsHeaders, getCallerId, json } from '../_shared/memberEmailAccess.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const callerId = await getCallerId(req)
    if (!callerId) return json({ error: 'Não autenticado' }, 401)

    const { workspaceId } = await req.json()
    if (!workspaceId) return json({ error: 'workspaceId é obrigatório' }, 400)

    const admin = adminClient()
    const { data: workspace } = await admin
      .from('workspaces')
      .select('id, name, owner_id, plan_tier')
      .eq('id', workspaceId)
      .maybeSingle()
    if (!workspace || workspace.owner_id !== callerId) {
      return json({ error: 'Workspace não encontrado ou sem permissão' }, 403)
    }

    const { data: authUser } = await admin.auth.admin.getUserById(callerId)
    const leaderEmail = authUser?.user?.email
    if (!leaderEmail) return json({ success: false, reason: 'leader_without_email' })

    const meta = authUser?.user?.user_metadata ?? {}
    const result = await sendAppEmail('leader-welcome', leaderEmail, {
      idempotencyKey: `leader-welcome-${callerId}`,
      templateData: {
        leaderName:
          (meta.full_name as string | undefined) || (meta.display_name as string | undefined),
        workspaceName: workspace.name,
        dashboardUrl: 'https://rhitmo.co/dashboard',
        isFounderProgram: workspace.plan_tier === 'founder',
      },
    })

    return json({ success: result.sent, reason: result.sent ? null : result.reason })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[notify-leader-welcome] failed:', message)
    return json({ error: message }, 500)
  }
})
