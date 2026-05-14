/**
 * Google Ads conversion tracking + Onboarding funnel telemetry.
 */
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const SIGNUP_CONVERSION_SEND_TO = 'AW-18112506634/4nEzCObf6KAcEIrW27xD';
const SIGNUP_CONVERSION_VALUE = 89;
const SIGNUP_CONVERSION_CURRENCY = 'BRL';

/**
 * Fires the Google Ads "Inscrição" (signup) conversion exactly once per
 * browser, identified by user email. Safe to call multiple times.
 */
export function trackSignupConversion(email?: string | null) {
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
      return;
    }
    const key = email
      ? `gads_signup_fired:${email.toLowerCase().trim()}`
      : 'gads_signup_fired:anon';
    if (localStorage.getItem(key)) return;
    window.gtag('event', 'conversion', {
      send_to: SIGNUP_CONVERSION_SEND_TO,
      value: SIGNUP_CONVERSION_VALUE,
      currency: SIGNUP_CONVERSION_CURRENCY,
    });
    localStorage.setItem(key, new Date().toISOString());
  } catch (err) {
    console.warn('[analytics] trackSignupConversion failed:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Sprint 3.4 — Onboarding funnel telemetry
// ─────────────────────────────────────────────────────────────────────

export type FunnelEvent =
  | 'leader_signup_started'
  | 'leader_signup_completed'
  | 'workspace_created'
  | 'first_member_invited'
  | 'first_invite_sent'
  | 'member_sync_started'
  | 'member_sync_completed'
  | 'member_account_linked'
  | 'member_onboarding_started'
  | 'member_onboarding_completed'
  | 'invite_resent'
  | 'invite_bounced'
  | 'auth_email_resent'
  | 'account_load_failed'
  | 'account_load_slow'
  | 'account_load_delayed'
  | 'tour_step_missing'
  | 'plan_limit_hit'
  | 'wizard_draft_restored'
  | 'leader_signup_failed'
  | 'member_email_edited'
  | 'invite_cancelled';

interface FunnelEventPayload {
  workspaceId?: string | null;
  memberId?: string | null;
  payload?: Record<string, unknown>;
}

/**
 * Fire-and-forget funnel event. Never throws, never blocks.
 * userId is auto-resolved from the current session when available.
 */
export function trackFunnel(event: FunnelEvent, opts: FunnelEventPayload = {}) {
  try {
    void supabase.auth.getUser().then(({ data }) => {
      const userId = data?.user?.id ?? null;
      void supabase
        .from('onboarding_funnel_events')
        .insert({
          event_type: event,
          user_id: userId,
          workspace_id: opts.workspaceId ?? null,
          member_id: opts.memberId ?? null,
          payload: (opts.payload ?? {}) as never,
        })
        .then(({ error }) => {
          if (error) {
            console.warn(`[analytics] trackFunnel(${event}) failed:`, error.message);
          }
        });
    });
  } catch (err) {
    console.warn('[analytics] trackFunnel error:', err);
  }
}

/**
 * Wrap an async operation with funnel telemetry: fires `${event}_started`
 * before, then either `_completed` or `_failed` after. Returns the
 * underlying result/throw — purely additive.
 *
 * Designed for short, descriptive event roots like 'leader_signup'.
 */
export async function withFunnel<T>(
  event: string,
  fn: () => Promise<T>,
  opts: FunnelEventPayload = {},
): Promise<T> {
  trackFunnel(`${event}_started` as FunnelEvent, opts);
  try {
    const result = await fn();
    trackFunnel(`${event}_completed` as FunnelEvent, opts);
    return result;
  } catch (err) {
    trackFunnel(`${event}_failed` as FunnelEvent, {
      ...opts,
      payload: { ...(opts.payload ?? {}), error: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}
