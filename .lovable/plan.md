## Sprint 11.3 — Rhitmo Orchestrator (Proactive Slack DMs)

A new cron-driven Edge Function scans the system every 30 min and fires contextual DMs to leaders (1:1 prep) and direct reports (pending Pulse). Reuses **all** infrastructure from Sprints 11.1/11.2 (`SLACK_BOT_TOKEN`, `slackApi` pattern, `slack_integrations` mapping). The existing `general_chat` flow and slash commands are not touched.

### Stability guarantees (untouched)
- `slack-bot/index.ts` — no changes.
- `general_chat`, `start_rhitmo_chat`, all slash commands, App Home flow.
- `slack_conversations` table and RPCs.
- Button clicks (`prep_1on1_brief`, `answer_pulse`) are **not** wired in this sprint — they fall through to the `default` log in the existing `block_actions` switch. Wiring is the next sprint's scope.

---

### 1. New Edge Function: `slack-rhitmo-orchestrator`

**Path**: `supabase/functions/slack-rhitmo-orchestrator/index.ts`

Standard cron pattern, mirroring `generate-monthly-recap-cron`:
- `validateCronSecret(req)` for auth (`x-cron-secret` header).
- Service-role `supabase` client.
- Inline `slackApi(method, body)` helper using `SLACK_BOT_TOKEN` (identical to slack-bot's helper — copy in, no shared import to avoid coupling).
- Idempotency key columns added by migration (see §3) so each meeting / pulse only triggers once.

Returns `{ ok, processed: { briefs: N, pulses: M }, errors: [...] }`.

### 2. Routine 1 — Leader 1:1 prep DMs

Query window: meetings starting between **now + 12h and now + 36h** (covers the "tomorrow" framing without being noisy on edge cases of hourly runs).

```text
SELECT um.id, um.user_id (=leader), um.member_id, um.title, um.start_time,
       tm.name AS member_name,
       si.slack_user_id
  FROM upcoming_meetings um
  JOIN team_members tm        ON tm.id = um.member_id
  JOIN slack_integrations si  ON si.user_id = um.user_id
 WHERE um.start_time BETWEEN now() + interval '12 hours'
                          AND now() + interval '36 hours'
   AND um.brief_dm_sent_at IS NULL
```

For each row → DM the leader's `slack_user_id` with Block Kit:

```text
section: "👋 Olá! Vi que você tem uma 1:1 com *{member_name}* {amanhã/em X horas}.
         Quer que eu puxe o Context Graph e monte uma sugestão de pauta?"
context: "📅 {dia/hora formatada pt-BR}"
actions: [
  { type: button, style: primary, text: "🧠 Gerar Pauta",
    action_id: "prep_1on1_brief",
    value: "<meeting_id>:<member_id>" }
]
```

After successful `chat.postMessage`, mark `upcoming_meetings.brief_dm_sent_at = now()`.

### 3. Routine 2 — Direct report Pulse alerts

```text
SELECT ps.id, ps.member_id, ps.type, ps.sent_at,
       tm.name AS member_name, tm.linked_user_id,
       si.slack_user_id
  FROM pulse_surveys ps
  JOIN team_members tm        ON tm.id = ps.member_id
  JOIN slack_integrations si  ON si.user_id = tm.linked_user_id
 WHERE ps.status = 'pending'
   AND ps.sent_at > now() - interval '7 days'   -- avoid resurrecting stale ones
   AND (ps.expires_at IS NULL OR ps.expires_at > now())
   AND ps.dm_sent_at IS NULL
```

DM the member's `slack_user_id`:

```text
section: "🌀 Oi! Seu líder enviou um *Pulse rápido* sobre *{tipo legível}*.
         Quer responder agora por aqui mesmo?"
context: "⏱️ Leva ~2 minutos"
actions: [
  { type: button, style: primary, text: "✍️ Responder Pulse",
    action_id: "answer_pulse",
    value: "<pulse_id>" },
  { type: button, text: "Mais tarde",
    action_id: "snooze_pulse",
    value: "<pulse_id>" }
]
```

After successful send, mark `pulse_surveys.dm_sent_at = now()`.

### 4. DB migration — idempotency columns

```sql
ALTER TABLE public.upcoming_meetings
  ADD COLUMN IF NOT EXISTS brief_dm_sent_at timestamptz;

ALTER TABLE public.pulse_surveys
  ADD COLUMN IF NOT EXISTS dm_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_upcoming_meetings_brief_dm
  ON public.upcoming_meetings (start_time)
  WHERE brief_dm_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pulse_surveys_dm_pending
  ON public.pulse_surveys (sent_at)
  WHERE dm_sent_at IS NULL AND status = 'pending';
```

### 5. Cron schedule (separate INSERT, not migration)

Runs every 30 minutes — frequent enough to feel proactive, cheap enough not to spam. Calls the function with `INTERNAL_CRON_TRIGGER` and the project anon key.

```sql
SELECT cron.schedule(
  'rhitmo-orchestrator-every-30min',
  '*/30 * * * *',
  $$ SELECT net.http_post(
       url:='https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/slack-rhitmo-orchestrator',
       headers:='{"Content-Type":"application/json","x-cron-secret":"INTERNAL_CRON_TRIGGER","Authorization":"Bearer <anon>"}'::jsonb,
       body:='{}'::jsonb
     ) $$
);
```

### 6. Error handling & observability
- Per-row try/catch — one failure never blocks the whole batch.
- Skip rows where `slackApi` returns `ok:false` (don't mark as sent → retried next tick), with the standard `[SLACK_API]` log line we already use.
- Top-level `console.log('[ORCHESTRATOR] briefs=X pulses=Y errors=Z')` for log greppability.
- Hard cap: process at most 100 briefs + 100 pulses per run.

### 7. Files

**Created**
- `supabase/functions/slack-rhitmo-orchestrator/index.ts`
- Migration: `ALTER TABLE` for the two `*_dm_sent_at` columns + indexes.
- `mem://features/slack/proactive-dms-orchestrator.md`

**Edited**
- `mem://index.md` — add new memory reference.
- `.lovable/plan.md` — replace 11.2 entry with 11.3.

**No changes**: `slack-bot/index.ts`, frontend, `slack_conversations`, secrets.

### Out of scope (next sprint)
- `prep_1on1_brief`, `answer_pulse`, `snooze_pulse` button handlers (will live in `slack-bot` and bridge to `generate-brief` / open a `pulse_survey` intent conversation).
- Quiet hours / per-user notification preferences for proactive DMs.
- Aggregating multiple same-day 1:1s into a single digest DM.
