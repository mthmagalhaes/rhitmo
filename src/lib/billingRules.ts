/** Regras puras de cobrança v3 (sem teste grátis para contas novas). */

export const REFUND_GUARANTEE_DAYS = 7;

export interface GateInput {
  locked: boolean;
  trialEndsAt: string | null;
}

/** Ação de escrita liberada? Só quando o workspace não está travado. */
export const canPerformAction = (b: GateInput | null | undefined) => !b?.locked;

/** Prefixo da mensagem quando a ação é bloqueada. */
export const gateMessagePrefix = (b: GateInput) =>
  b.trialEndsAt ? 'Assinatura necessária.' : 'Escolha um plano mensal ou anual.';

/** Garantia vale para a primeira assinatura até N dias após o pagamento. */
export const isWithinRefundWindow = (paidAt: Date, now: Date = new Date()) => {
  const ms = now.getTime() - paidAt.getTime();
  return ms >= 0 && ms <= REFUND_GUARANTEE_DAYS * 24 * 60 * 60 * 1000;
};

/** Resultado do retorno do Stripe a partir da query string. */
export const checkoutReturnEvent = (search: string): 'checkout_completed' | 'checkout_canceled' | null => {
  const p = new URLSearchParams(search);
  if (p.get('success') === 'true') return 'checkout_completed';
  if (p.get('canceled') === 'true') return 'checkout_canceled';
  return null;
};
