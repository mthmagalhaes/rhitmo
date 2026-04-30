---
name: Event Bus Architecture
description: Centralized notification dispatch via events table + event-dispatcher edge function
type: feature
---
Notifications (email, slack, in-app) flow through a single event bus.

**Producer:** edge functions call `emit(supabaseAdmin, { type, workspace_id, actor_user_id, target_user_id, channels, payload })` from `supabase/functions/_shared/emit.ts`. Each call inserts a row into `public.events` with `status='pending'`.

**Dispatcher:** `event-dispatcher` edge function (verify_jwt=false), called every 30s by 2 staggered pg_cron jobs (`event-dispatcher-30s-a` and `-b`). Pulls up to 50 pending events, fans out to channels:
- `inapp` → INSERT into `notifications` table
- `email` → `pgmq.send('emails_outbound', payload)` via `enqueue_email` RPC
- `slack` → `pgmq.send('slack_outbound', payload)`

Retries up to 3 attempts; after that status becomes `failed` with `error` populated.

**RLS:** Only super_admin can read/write `events` from API. Service role (used by dispatcher) bypasses RLS.

**Migration policy:** New features should use `emit()`. Existing inline notifications migrate gradually in feature PRs — no big-bang.
