/**
 * Product analytics (PostHog). Single entry point for product events.
 * Privacy: no autocapture, no session recording, text masked, never send
 * note/review/transcript content — only IDs, roles and counts.
 * No-op when the project token is absent.
 */
import posthog from 'posthog-js';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TOKEN = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY as string | undefined;
const REGION = (import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION as string | undefined) || 'eu';

let ready = false;

function init() {
  if (ready || !TOKEN || typeof window === 'undefined') return ready;
  try {
    posthog.init(TOKEN, {
      api_host: REGION === 'us' ? 'https://us.i.posthog.com' : 'https://eu.i.posthog.com',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: true,
      disable_session_recording: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      persistence: 'localStorage+cookie',
    });
    ready = true;
  } catch (err) {
    console.warn('[productAnalytics] init failed', err);
  }
  return ready;
}

type Props = Record<string, string | number | boolean | null | undefined>;

export function capture(event: string, props: Props = {}) {
  if (!init()) return;
  try { posthog.capture(event, props); } catch { /* never throw */ }
}

export function identify(userId: string, props: Props) {
  if (!init()) return;
  try { posthog.identify(userId, props); } catch { /* noop */ }
}

export function resetIdentity() {
  if (!ready) return;
  try { posthog.reset(); } catch { /* noop */ }
}

/** Mount once inside the router: tracks pageviews by path (no query string). */
export function PageviewTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    capture('$pageview', { $current_url: window.location.origin + pathname, path: pathname });
  }, [pathname]);
  return null;
}
