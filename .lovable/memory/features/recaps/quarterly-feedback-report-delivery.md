---
name: Rhitmo Trimestral — entrega via Slack
description: Sprint 16 — quarterly_recaps enriquecido com peer_voices/network_context + edge slack-deliver-quarterly-recap (cron 0 13 1 1,4,7,10 *) que faz DM ao líder com botão "Abrir" para /lider/avaliacoes?recap={id}; idempotência via slack_delivered_at
type: feature
---

# Sprint 16 — Rhitmo Trimestral Feedback Report

## Schema (`quarterly_recaps`)
- `peer_voices jsonb` (default `[]`) — top 3 peer_feedback_requests answered no trimestre.
- `network_context jsonb` (default `{}`) — top 3 network_signals do trimestre + total_active.
- `slack_delivered_at timestamptz` — idempotência da DM.

## Geração
`generate-quarterly-recap` busca, do range `[startMonth, endMonth)` do trimestre:
- `peer_feedback_requests` `status=answered`, join `team_members:peer_member_id` para nome.
- `network_signals` por `member_id`, ordenados por `detected_at desc`.
Soft-fail: se enrichment falhar, recap é salvo mesmo assim com arrays vazios.

## UI
`QuarterlyRecapSection.tsx` renderiza, abaixo de `evolution_vs_previous`:
- "Vozes de pares no trimestre" — cards teal com nome do par + data + texto entre aspas.
- "Contexto de rede" — Badges coloridos por severity (high=red, medium=amber, low=muted).
Render condicional: recap legado sem campos → seção escondida.

## Entrega Slack
Edge `slack-deliver-quarterly-recap`:
- Cron `0 13 1 1,4,7,10 *` (1º de jan/abr/jul/out, 10h BRT).
- Lookback 7d: pega recaps com `ai_generated_at >= now()-7d AND slack_delivered_at IS NULL`.
- Agrupa por `manager_id`, busca `slack_integrations.slack_user_id`.
- DM com header + 1 bloco section por liderado (classificação + risco + 1 highlight + 1 peer voice se houver) + botão "Abrir" → `https://rhitmo.co/lider/avaliacoes?recap={id}`.
- Chunk de 8 liderados/mensagem; chunks adicionais vão em `thread_ts`.
- Marca `slack_delivered_at = now()` por chunk.
- Trigger manual: POST `{force?: bool, leader_user_id?: uuid}`.

## Reuso
- Mesmo SLACK_BOT_TOKEN do `slack-rhitmo-orchestrator` e `slack-bot`.
- Mesmo padrão de idempotência das DMs proativas (Sprint 11.3 / 14 / 15).
