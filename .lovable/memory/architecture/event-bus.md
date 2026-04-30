---
name: Event Bus
description: Tabela events + emit() helper + event-dispatcher (pg_cron 30s) com fan-out para inapp/email/slack
type: feature
---

Onda 3.2 + 4.3 + 4.5. `public.events` (status: pending/dispatched/failed, attempts<3). Helper `_shared/emit.ts`.

Dispatcher `event-dispatcher` puxa pendentes e despacha:
- `inapp` → insert direto em `notifications`
- `email` → invoca `send-transactional-email` mapeando `event_type → templateName` via `EVENT_EMAIL_TEMPLATE` (Onda 4.5). Resolve `recipientEmail` por `payload.recipient_email` ou `auth.admin.getUserById(target_user_id)`.
- `slack` → `enqueue_email('slack_outbound', ...)`

Mapa canônico evento → template:
- `feedback.shared` → `feedback-shared.tsx`
- `review.shared` → `review-shared.tsx`

Tipos canônicos em produção:
- `feedback.shared` — trigger SQL `trg_emit_feedback_shared` em `feedbacks`. Payload já no formato dos props do template (`memberName`, `actorName`, `summary`, `feedbackUrl`). Canais: inapp+email.
- `review.shared` — `notify-review-shared`. Canais: inapp+slack+email (email controlado por flag `USE_EVENT_BUS_FOR_REVIEW_SHARED`).
- `member.invited` — `admin-invite-user`, `invite-member-slack` (flag `USE_EVENT_BUS_FOR_SLACK_INVITE`), `bulk-onboard` (flag `USE_EVENT_BUS_FOR_BULK_INVITE`). Canal: inapp (auditoria). `payload.delivery_method` ∈ {`email`, `slack`, `bulk_silent`}.

Toda Edge Function nova deve usar `emit()` em vez de chamar Resend/Slack direto. Para rollback de migração, ver `mem://infrastructure/feature-flags`.
