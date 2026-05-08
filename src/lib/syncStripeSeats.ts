import { safeFunctionInvoke } from './supabaseSafe';

/**
 * Fire-and-forget: dispara recontagem de seats no Stripe após mudança em team_members.
 * Nunca lança — a edge function update-subscription já trata grandfather
 * e ausência de assinatura ativa como no-op silencioso.
 *
 * Use SEMPRE após sucesso de INSERT/DELETE em team_members.
 */
export function syncStripeSeats(): void {
  void safeFunctionInvoke('update-subscription', { action: 'sync_seats' }).catch(
    (err) => {
      console.warn('[syncStripeSeats] best-effort failed:', err);
    },
  );
}
