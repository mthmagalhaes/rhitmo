---
name: Quarterly Anniversary Nudge & Slack Loop
description: Cron diário 12 UTC detecta liderados ≥90 dias sem Trimestral, cria leader_nudges + DM Slack com botões/NL ("sim/pode gerar") que dispara generate-quarterly-recap via cron-secret + acting_user_id (Sprint 17)
type: feature
---

## Fluxo

1. **Cron diário** `quarterly-anniversary-cron` (`0 12 * * *`) varre `team_members`:
   - Membro está há ≥90 dias no time;
   - Nunca teve Trimestral confirmado OU último `period_end` há ≥90 dias;
   - `last_anniversary_nudge_at` nulo OU >14 dias (cooldown).
2. Para cada match: insere `leader_nudges (nudge_type='quarterly_due')` (banner web) + DM Slack ao líder com 3 botões: `generate_quarterly_confirm` (value JSON `{member_id, period_start, period_end, period_label}`), `generate_quarterly_dismiss` (push cooldown +30d), `open_quarterly_in_app`. Cria `slack_conversations(intent='awaiting_quarterly_confirmation', state_data={member_id, period_*})`.
3. Atualiza `team_members.last_anniversary_nudge_at = now()`.

## Slack interactivity (`slack-bot/index.ts`)

- Botão `generate_quarterly_confirm` → `runQuarterlyGenerationFromSlack` que chama `generate-quarterly-recap` com header `x-cron-secret` + body `acting_user_id` (substitui o JWT do líder). Posta `buildQuarterlyResultBlocks` com top-3 highlights + link `/lider/avaliacoes?recap=...`.
- Botão `generate_quarterly_dismiss` → completa conversation, empurra cooldown.
- DM em linguagem natural com intent ativo passa pelo Lovable AI Gateway (gemini-2.5-flash) que classifica yes/no/ambiguous; "yes" reaproveita o mesmo helper.
- Fallback automático: se `auto` retorna 422 (sem mensais), retenta com `mode='from_raw'`.

## `generate-quarterly-recap` (modo dual)

Aceita 2 modos de auth:
- **Padrão**: `Authorization: Bearer <jwt>` → resolve `actingUserId` via `auth.getUser()`.
- **Internal** (Sprint 17): header `x-cron-secret = CRON_SECRET` + body `acting_user_id` (uuid do líder). Necessário para invocação a partir do `slack-bot`.

`actingUserId` substitui `user.id` em todas as checagens (`team.leader_user_id`, `manager_id` em queries/insert).

## Cleanup

`slack-deliver-quarterly-recap` (cron civil 1º jan/abr/jul/out) foi removido. Cron `slack-deliver-quarterly-recap-civil` desagendado. Entrega ao Slack agora é imediata pós-geração via DM (acionada pelo próprio fluxo confirm).

## Helpers compartilhados

`_shared/quarterlyNudgeHelpers.ts`:
- `suggestPeriod(memberCreatedAt, lastConfirmedPeriodEnd)` — janela inteligente (gap real entre recaps, cap 120d, mínimo a partir de membership).
- `buildAnniversaryDmBlocks(...)` — Block Kit do DM proativo.
- `buildQuarterlyResultBlocks(...)` — DM de confirmação pós-geração com top-3 highlights.
