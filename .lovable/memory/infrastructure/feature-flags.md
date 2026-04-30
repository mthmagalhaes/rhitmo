---
name: Feature Flags
description: Helper `flag()` em `_shared/featureFlags.ts` para rollback de migrações de bus sem redeploy
type: feature
---

Onda 4.5. Helper `flag(name, defaultValue=true)` lê env var (true/1/yes ou false/0/no). Cold start re-lê — basta atualizar o secret no projeto, sem redeploy.

Flags ativas:
- `USE_EVENT_BUS_FOR_REVIEW_SHARED` (default true) — `notify-review-shared` envia email via bus (template `review-shared`). Se false, volta pro Resend direto.
- `USE_EVENT_BUS_FOR_SLACK_INVITE` (default true) — `invite-member-slack` emite `member.invited` (auditoria in-app). Slack DM continua sempre direto.
- `USE_EVENT_BUS_FOR_BULK_INVITE` (default true) — `bulk-onboard` emite `member.invited` por usuário criado. Email continua via `dispatch-bulk-invites`.

Para reverter: setar a env como `false` no projeto. Sem redeploy.
