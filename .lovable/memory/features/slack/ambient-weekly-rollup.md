---
name: Slack Ambient Weekly Rollup
description: Cron diário 04:30 UTC agrega slack_ambient_evidence dos últimos 7d por liderado e gera context_evidence(evidence_type='slack_activity_rollup') consumido pelo Mentor (web+Slack) via RAG; classifier roda 2x/dia (09+21 UTC) com ambient_mode ON por default em todo workspace com Slack
type: feature
---

# Slack Ambient → Mentor Weekly Rollup (Sprint 22)

## Pipeline
1. **slack-ambient-classifier** (cron `0 9,21 * * *`) — captura mensagens públicas, autojoin canais, classifica via Gemini Flash Lite, persiste em `slack_ambient_evidence` (1 row por mensagem relevante, score ≥0.6).
2. **slack-weekly-rollup** (cron `30 4 * * *`) — para cada `(workspace, member)` com ≥3 evidências em 7d:
   - Extrai mentions `<@U…>` → top colaboradores via `users.info` (cache).
   - Conta canais por frequência → top 3.
   - Chama Gemini 2.5 Flash 1x → `{themes[], narrative}`.
   - Upsert em `context_evidence` com `evidence_type='slack_activity_rollup'`, `source_table='slack_ambient_evidence'`, `source_id = SHA-256(member_id+week_start)` (determinístico, idempotente).
3. **chat-mentor** já lê `context_evidence` via `match_context_evidence` (RAG) — sem mudança de query.

## Auto-enable
- Trigger `trg_ensure_workspace_slack_settings` em `slack_integrations` insert → cria `workspace_slack_settings` com `ambient_mode_enabled=true, autojoin_public_channels=true`.
- Backfill executado para workspaces com Slack já conectado.

## Privacidade
- Rollup nunca expõe mensagens cruas no frontend; só `themes`, `top_collaborators`, `top_channels`, `narrative`.
- DMs e canais privados continuam fora (filtro do classifier).
- Líder pode excluir canais via `workspace_slack_settings.excluded_channel_ids` (UI futura).

## Prompt
- `chat-mentor/index.ts` (system prompt member-mode, ~linha 859) explica que evidências `ctx:slack_activity_rollup` são resumos agregados, não mensagens cruas.

## Custo
- ~$0.002/liderado/semana. Workspace 10 pessoas ≈ $0.08/mês.

## Out of scope
- UI de configuração ambient em /lider/configuracoes
- Card "Atividade no Slack" no DirectReportDashboard
- Bloco no briefGenerator
- DM proativa de aviso aos liderados
