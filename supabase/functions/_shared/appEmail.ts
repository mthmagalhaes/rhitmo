// Envio de e-mails de app pela infraestrutura gerenciada da Lovable.
//
// Envolve o helper scaffolded (`transactional-email-templates/send-email.ts`)
// e mantém o histórico em `email_send_log` — mesma tabela e mesmos status
// usados antes, para não quebrar relatórios existentes.
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  sendTemplateEmail,
  type SendTemplateEmailOptions,
  type SendTemplateEmailResult,
} from './transactional-email-templates/send-email.ts'

function logClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null
  return createClient(url, key)
}

async function writeLog(
  templateName: string,
  recipient: string,
  status: 'sent' | 'suppressed' | 'failed',
  errorMessage?: string,
) {
  const supabase = logClient()
  if (!supabase) return
  const { error } = await supabase.from('email_send_log').insert({
    message_id: null,
    template_name: templateName,
    recipient_email: recipient,
    status,
    error_message: errorMessage ? errorMessage.slice(0, 1000) : null,
  })
  if (error) {
    console.error('email_send_log insert failed', { code: error.code, message: error.message })
  }
}

/**
 * Renderiza e envia um template registrado. Retorna `{ sent: false }` quando o
 * destinatário está suprimido (bounce/reclamação/descadastro) — isso é um
 * resultado esperado, não um erro. Qualquer outra falha é relançada.
 */
export async function sendAppEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {},
): Promise<SendTemplateEmailResult> {
  let result: SendTemplateEmailResult
  try {
    result = await sendTemplateEmail(templateName, to, options)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await writeLog(templateName, to, 'failed', message)
    throw error
  }

  if (result.sent) {
    await writeLog(templateName, to, 'sent')
  } else {
    await writeLog(templateName, to, 'suppressed', 'Recipient suppressed')
  }
  return result
}
