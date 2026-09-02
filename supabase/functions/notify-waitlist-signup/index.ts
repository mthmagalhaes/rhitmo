// Confirmação para o lead da waitlist + aviso interno para o time Rhitmo.
// Público: o lead ainda não tem conta. Os dados vêm do registro salvo em
// `waitlist_leads`, nunca diretamente do corpo da requisição.
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { sendAppEmail } from '../_shared/appEmail.ts'
import { adminClient, corsHeaders, json } from '../_shared/memberEmailAccess.ts'

const ADMIN_RECIPIENT = 'matheus@rhitmo.co'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'E-mail inválido' }, 400)
    }

    const admin = adminClient()
    const { data: lead } = await admin
      .from('waitlist_leads')
      .select('email, name, phone, team_size')
      .eq('email', email)
      .maybeSingle()
    if (!lead) return json({ error: 'Lead não encontrado' }, 404)

    // Aviso interno (não bloqueia a confirmação do lead).
    try {
      await sendAppEmail('admin-new-lead', ADMIN_RECIPIENT, {
        idempotencyKey: `admin-lead-${lead.email}`,
        templateData: {
          leadEmail: lead.email,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadTeamSize: lead.team_size,
        },
      })
    } catch (err) {
      console.error('[notify-waitlist-signup] admin notice failed:', err instanceof Error ? err.message : String(err))
    }

    const result = await sendAppEmail('waitlist-confirmation', lead.email, {
      idempotencyKey: `waitlist-confirm-${lead.email}`,
      templateData: { leadName: lead.name },
    })

    return json({ success: result.sent, reason: result.sent ? null : result.reason })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[notify-waitlist-signup] failed:', message)
    return json({ error: message }, 500)
  }
})
