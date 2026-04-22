/**
 * Google Ads conversion tracking helpers.
 *
 * The base gtag tag is loaded in index.html (AW-18112506634).
 * These helpers fire conversion events for specific actions.
 */

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

    // Idempotency: never fire twice for the same user on the same browser.
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
    // Never let analytics break the signup flow.
    console.warn('[analytics] trackSignupConversion failed:', err);
  }
}
