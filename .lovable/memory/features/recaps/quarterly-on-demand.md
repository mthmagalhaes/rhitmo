---
name: Rhitmo Trimestral on-demand
description: Sprint 17 — quarterly_recaps suporta período flexível (period_start/period_end/period_label); UI tem GenerateQuarterlyDialog igual ao Formal (Último mês / Último trimestre / Personalizado); aceita ?suggest=quarterly&start=&end= via querystring (ponte futura para o lembrete por aniversário no Slack)
type: feature
---

# Sprint 17 — Trimestral on-demand

## Schema (`quarterly_recaps`)
- `period_start date`, `period_end date`, `period_label text` — Sprint 17.
- `period_quarter` agora **nullable** (mantido para compat).
- Unique antigo `(member_id, period_quarter)` removido; novo unique `(member_id, period_start, period_end)`.
- `team_members.last_anniversary_nudge_at timestamptz` — placeholder p/ futura idempotência do lembrete.

## Edge `generate-quarterly-recap`
- Body aceita `period_start` + `period_end` (+ opcional `period_label`). Se ausentes, cai no caminho legado `period_quarter`.
- Lookup de "trimestre anterior" agora pega o último recap **confirmed** com `period_end <= periodStart` (não mais alinhado a trimestre civil).
- Persiste `period_start`, `period_end`, `period_label`. `period_quarter` é gravado só quando entrada veio quarter-aligned.
- Mensagem 422 atualizada quando não há mensais confirmados no período.

## UI
- Novo `src/components/recaps/GenerateQuarterlyDialog.tsx`: 3 botões (Último mês / Último trimestre / Personalizado) + 2 modos (a partir dos mensais / modo rápido).
- `QuarterlyRecapSection` ganhou botão "Gerar Trimestral" no header e renderiza recaps on-demand sob "Trimestres anteriores" (qualquer recap com `period_quarter` ≠ trimestre civil atual/passado, ou nulo).
- Querystring `?suggest=quarterly&start=YYYY-MM-DD&end=YYYY-MM-DD` abre o dialog automaticamente — preparado p/ o futuro botão Slack.

## Pendente p/ Sprint 17.2
- Cron diário de aniversário (90/180/270 dias) que cria `leader_nudges` + DM Slack com botão "Gerar".
- Handler `generate_quarterly` em `slack-bot` (block_actions + state machine `awaiting_quarterly_confirmation`).
- Aposentar `slack-deliver-quarterly-recap` (cron civil) em favor da DM imediata pós-geração.
