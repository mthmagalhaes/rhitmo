// Envia (ou reenvia) o convite da pesquisa Rhitmo Sync para um liderado.
// Um gatilho, um destinatário — o e-mail vem do cadastro do liderado.
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { sendAppEmail } from '../_shared/appEmail.ts'
import {
  APP_URL,
  adminClient,
  corsHeaders,
  getCallerId,
  json,
  loadMemberForEmail,
} from '../_shared/memberEmailAccess.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const callerId = await getCallerId(req)
    if (!callerId) return json({ error: 'Não autenticado' }, 401)

    const { memberId } = await req.json()
    if (!memberId) return json({ error: 'memberId é obrigatório' }, 400)

    const admin = adminClient()
    const member = await loadMemberForEmail(admin, memberId, callerId)
    if (!member) return json({ error: 'Liderado não encontrado ou sem permissão' }, 403)
    if (!member.email) return json({ error: 'Liderado sem e-mail cadastrado' }, 400)

    const result = await sendAppEmail('sync-invite', member.email, {
      idempotencyKey: `sync-invite-${member.id}-${Date.now()}`,
      templateData: {
        memberName: member.name,
        syncUrl: `${APP_URL}/sync/${member.id}`,
      },
    })

    return json({ success: result.sent, reason: result.sent ? null : result.reason })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[send-sync-invite] failed:', message)
    return json({ error: message }, 500)
  }
})
