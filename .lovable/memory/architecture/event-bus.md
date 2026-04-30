---
name: Event Bus
description: Tabela events + emit() helper + event-dispatcher (pg_cron 30s) com fan-out para inapp/email/slack
type: feature
---

Onda 3.2 + 4.3. `public.events` (status: pending/dispatched/failed, attempts<3). Helper `_shared/emit.ts` insere com `event_type`, `channels[]`, `payload jsonb`. Dispatcher `event-dispatcher` puxa pendentes e despacha:
- `inapp` → insert direto em `notifications`
- `email` → `enqueue_email('emails_outbound', ...)`
- `slack` → `enqueue_email('slack_outbound', ...)`

Tipos canônicos em produção (Onda 4.3):
- `feedback.shared` — disparado por trigger SQL `trg_emit_feedback_shared` em `feedbacks` (AFTER INSERT/UPDATE OF visibility) quando `visibility='shared'`. Canais: inapp+email. Target: `team_members.linked_user_id`.
- `review.shared` — emitido pela função `notify-review-shared` em paralelo ao email Resend. Canais: inapp+slack (email continua direto via Resend para preservar template).
- `member.invited` — emitido por `admin-invite-user` após `auth.admin.inviteUserByEmail`. Canais: inapp. Email do convite via Supabase Auth nativo.

Toda Edge Function nova deve usar `emit()` em vez de chamar Resend/Slack direto.
