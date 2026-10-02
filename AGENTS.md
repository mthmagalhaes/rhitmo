
- Bot entitlement (trial/add-on hours) lives only in `supabase/functions/_shared/botEntitlement.ts`; every bot-sending path must call it — why: the auto-calendar path once bypassed the cap.
- Trial lifecycle emails are sent only by `trial-drip-cron`, deduped by `trial_email_log` — why: one email per leader per milestone.
