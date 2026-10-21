
- Bot entitlement (trial/add-on hours) lives only in `supabase/functions/_shared/botEntitlement.ts`; every bot-sending path must call it — why: the auto-calendar path once bypassed the cap.
- Trial lifecycle emails are sent only by `trial-drip-cron`, deduped by `trial_email_log` — why: one email per leader per milestone.
- Connector hub entries live only in `src/lib/connectorsCatalog.ts`; BYOK note takers must also be registered in `_shared/notetakers/index.ts` and `noteTakerProviders.ts` — why: one source for the Connectors page and sync.
- Note-taker credentials resolve only via `supabase/functions/_shared/noteTakerCredential.ts` (BYOK key or the leader's Google token for `google_meet`) — why: Meet reuses the Google login instead of a stored key.
- Company culture/scale (values, behaviors, rating scale) lives only in `org_context_*` versions and is read via `supabase/functions/_shared/orgContext.ts`; reviews store the version used — why: editing the scale must never rewrite past reviews.
- Review Mirror findings live in `review_mirror_checks`, never on `performance_reviews` — why: members can read shared reviews and must not see the Mirror.
- Culture-guided review signal cards (Slack/ONA) live only in `review_signal_items`, never on `performance_reviews`; assembly includes only accepted/edited cards — why: members must not see raw signals and an empty signal set keeps the prompt unchanged.
