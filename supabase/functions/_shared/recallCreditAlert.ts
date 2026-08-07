// Alerta o super admin no Slack quando a Recall.ai recusa a criação de um bot
// por falta de saldo. Sem isso, a falha só aparece como "o bot não entrou".
//
// Throttle: só alerta se não houve outro registro de erro de crédito na última
// hora (usamos a própria tabela recall_bots como fonte, sem tabela nova).

const SUPER_ADMIN_EMAIL = "matheus@rhitmo.co";

export function isCreditError(payload: unknown): boolean {
  const raw = JSON.stringify(payload ?? {}).toLowerCase();
  return raw.includes("insufficient_credit_balance") || raw.includes("credit");
}

export async function alertRecallCreditIfNeeded(
  supabaseAdmin: any,
  details: { status: number; payload: unknown; meetingUrl?: string | null },
): Promise<void> {
  try {
    if (!isCreditError(details.payload)) return;

    const slackToken = Deno.env.get("SLACK_BOT_TOKEN");
    if (!slackToken) return;

    // Throttle de 1h: procura erro de crédito anterior recente.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("recall_bots")
      .select("id", { count: "exact", head: true })
      .eq("status", "error")
      .ilike("error_message", "%credit%")
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) > 1) return; // já alertamos por essa janela

    const { data: admin } = await supabaseAdmin
      .from("slack_integrations")
      .select("slack_user_id, user_id")
      .limit(50);

    // Resolve o user_id do super admin por e-mail.
    let slackUserId: string | null = null;
    for (const row of admin ?? []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
      if (u?.user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL) {
        slackUserId = row.slack_user_id;
        break;
      }
    }
    if (!slackUserId) return;

    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${slackToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        channel: slackUserId,
        text:
          `:rotating_light: *Recall.ai sem saldo* — a criação de bots está falhando (HTTP ${details.status}).\n` +
          `Nenhuma reunião está sendo transcrita até o top-up.` +
          (details.meetingUrl ? `\nÚltima reunião afetada: ${details.meetingUrl}` : ""),
      }),
    });
  } catch (e) {
    console.error("[recallCreditAlert] falhou:", e);
  }
}
