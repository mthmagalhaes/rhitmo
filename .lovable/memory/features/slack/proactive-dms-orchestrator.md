---
name: Slack Proactive DMs Orchestrator
description: Cron-driven edge function that fires contextual Slack DMs (1:1 prep + pending Pulse) every 30 min — Sprint 11.3
type: feature
---

# Rhitmo Orchestrator (Sprint 11.3)

Edge function: `supabase/functions/slack-rhitmo-orchestrator/index.ts`
Schedule: `*/30 * * * *` (cron job `rhitmo-orchestrator-every-30min`).
Auth: `validateCronSecret` (`INTERNAL_CRON_TRIGGER`).

## Routines

1. **Leader 1:1 prep DM** — scans `upcoming_meetings` where `start_time` is between `now()+12h` and `now()+36h` and `brief_dm_sent_at IS NULL`. DMs the leader's `slack_user_id` (resolved via `slack_integrations.user_id = upcoming_meetings.user_id`) with a Block Kit message and a primary button `action_id: 'prep_1on1_brief'`, value `<meeting_id>:<member_id>`.
2. **Direct report Pulse DM** — scans `pulse_surveys` where `status='pending'`, `sent_at > now()-7d`, not expired, `dm_sent_at IS NULL`. Resolves `team_members.linked_user_id → slack_integrations.slack_user_id` and DMs the member with `action_id: 'answer_pulse'` (+ secondary `snooze_pulse`), value `<pulse_id>`.

## Idempotency

Two columns guarantee single-DM-per-event:
- `upcoming_meetings.brief_dm_sent_at timestamptz`
- `pulse_surveys.dm_sent_at timestamptz`

Each row is only marked sent **after** `chat.postMessage` returns `ok:true`. On Slack failures, the row stays unmarked and is retried next tick.

## Caps & safety

- Max 100 briefs and 100 pulses per run.
- Per-row try/catch — one bad row never blocks the batch.
- Reuses `SLACK_BOT_TOKEN` and the same `slackApi(method, body)` shape as `slack-bot/index.ts` (no shared import — copy in to keep the bot decoupled).
- `slack-bot/index.ts` is **not modified** in this sprint. The `prep_1on1_brief` / `answer_pulse` / `snooze_pulse` actions currently fall through to the existing `default` log in the `block_actions` switch and will be wired in the next sprint.
