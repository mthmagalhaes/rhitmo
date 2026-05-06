---
name: Quarterly Anniversary Nudge
description: Sprint 17 + 17.3 — cron diário 12 UTC detecta liderados com ≥90 dias sem Trimestral; cria leader_nudges (quarterly_due) + DM Slack com botões/NL ("sim/pode gerar"); banner in-app no QuarterlyRecapSection garante paridade sem Slack; eco DM ao confirmar recap pela UI via slack-echo-quarterly-confirmed (idempotência slack_delivered_at)
type: feature
---

# Sprint 17 — Anniversary Nudge + Conversational Slack Loop

## Cron diário (`quarterly-anniversary-cron`)
- Roda 12:00 UTC. Filtros: `created_at <= now()-90d` E `last_anniversary_nudge_at IS NULL OR <= now()-14d`.
- Para cada candidato: checa último `quarterly_recaps confirmed` → ignora se `period_end > now()-90d`.
- Ações: INSERT `leader_nudges` (`nudge_type='quarterly_due'`, `action_url=/lider/avaliacoes?member=...&suggest=quarterly&start=...&end=...`) + DM Slack (best-effort) + UPDATE `team_members.last_anniversary_nudge_at`.
- DM cria `slack_conversations.intent='awaiting_quarterly_confirmation'` com `state_data` (member_id, period_start/end/label) — habilita NL fallback.

## Slack — Botões + NL (slack-bot)
- Botões `generate_quarterly_confirm` / `generate_quarterly_dismiss` chamam `runQuarterlyGenerationFromSlack` que invoca `generate-quarterly-recap` com `x-cron-secret` + `acting_user_id`.
- Fallback 422 (sem mensais): retry com `mode='from_raw'`.
- NL: gemini-2.5-flash classifica resposta livre ("sim/pode gerar/manda" → confirm; "depois/agora não" → dismiss; ambíguo → pede confirmação).
- Resposta no thread via `buildQuarterlyResultBlocks` (top 3 highlights + classificação + risco + botão "Calibrar no Rhitmo").
- `slack_conversations.status='completed'` ao final.

## generate-quarterly-recap — dual-mode auth
Aceita `x-cron-secret` header + `acting_user_id` body para bypass de JWT em fluxos service-side (cron, slack-bot). JWT path padrão preservado.

## Sprint 17.3 — UI banner + UI echo

### Banner `quarterly_due` em `QuarterlyRecapSection`
- Hook `useQuarterlyDueNudge(memberId)` busca o nudge ativo mais recente (RLS: líder vê só os seus).
- Card primary/5 com Sparkles + "A Rhy sugere gerar o Trimestral" + CTAs:
  - "Gerar agora" → abre `GenerateQuarterlyDialog` pré-preenchido com `period_start/end` extraídos do `action_url` do nudge.
  - "Mais tarde" → `useDismissQuarterlyDueNudge` faz UPDATE `dismissed_at=now()` (cron volta após 14d).
- Garante paridade para líder **sem Slack**: ele vê o sinal dentro da feature, não só em centro de notificações.

### Eco Slack pós-confirmação UI (`slack-echo-quarterly-confirmed`)
- `useConfirmQuarterlyRecap` invoca a edge fire-and-forget após `UPDATE status='confirmed'`.
- Edge valida ownership via cadeia recap → team_members → teams.leader_user_id == JWT user.
- Soft-checks: pula se `status != confirmed`, `slack_delivered_at != null`, ou sem `slack_integrations`.
- Posta DM com `buildQuarterlyResultBlocks` reusado e marca `slack_delivered_at=now()`.
- Falha de Slack nunca bloqueia confirmação (fire-and-forget client-side + soft-fail server-side).

## Cleanup (Sprint 17.2)
`slack-deliver-quarterly-recap` (cron civil 1º jan/abr/jul/out) deletado em favor da entrega imediata e do nudge por aniversário.

## Arquivos-chave
- `supabase/functions/quarterly-anniversary-cron/index.ts`
- `supabase/functions/_shared/quarterlyNudgeHelpers.ts` (suggestPeriod, buildAnniversaryDmBlocks, buildQuarterlyResultBlocks)
- `supabase/functions/slack-echo-quarterly-confirmed/index.ts` (Sprint 17.3)
- `supabase/functions/generate-quarterly-recap/index.ts` (dual-mode auth)
- `supabase/functions/slack-bot/index.ts` (handlers + NL)
- `src/hooks/useQuarterlyDueNudge.ts` (Sprint 17.3)
- `src/components/recaps/QuarterlyRecapSection.tsx` (banner + dialog wiring)
- `src/hooks/useRecaps.ts` (echo invoke)
