# Plano: Consertar o pipeline Slack → Context Graph

Objetivo: sair de `processed: 0` para evidências reais entrando em `slack_ambient_evidence`, `context_evidence` (`slack_activity_rollup`) e `network_signals`. Só depois reativamos a navegação para "Contexto → Rede" e o `TeamPulseBento`.

## Fase 1 — Instrumentação (sem mudar lógica)

Adicionar logs estruturados em `slack-ambient-classifier` para responder, em uma única execução manual, qual das 3 causas está bloqueando:

1. **Descoberta de canais**
   - Logar: total de canais públicos no workspace, quantos o bot já é membro, quantos foram auto-joined nesta run, quantos falharam (com `error` do `conversations.join`).
2. **Leitura de mensagens**
   - Por canal: `messages_fetched`, `oldest_ts` usado, `messages_after_filter` (sem bots, sem threads se for o filtro atual).
3. **Resolução de líder/liderado**
   - Por mensagem candidata: `slack_user_id`, `matched_member_id` (ou null + motivo: `no_email`, `email_not_in_team`, `no_leader_link`).
4. **Classificação Gemini**
   - Quantas chegaram ao Gemini, quantas voltaram com `relevant: true`, quantas foram persistidas em `slack_ambient_evidence`.

Saída final do handler: um JSON `{channels, messages, matched, classified, persisted}` em vez do `{processed: 0}` atual.

Mesma instrumentação leve em `slack-weekly-rollup` e `detect-network-signals` (input rows lidas, output rows escritas, motivo se zero).

## Fase 2 — Execução controlada

- Rodar `slack-ambient-classifier` manualmente via `curl_edge_functions` com `x-cron-secret`.
- Ler logs via `edge_function_logs`.
- Cruzar com `slack_integrations`, `workspace_slack_settings`, `team_members.slack_user_id`, `team_members.email` para confirmar onde quebra.

## Fase 3 — Correção por causa identificada

Aplicar **apenas** a correção que os logs apontarem:

- **Causa A — Bot não está em canal nenhum**
  - Garantir autojoin idempotente em `conversations.list(types=public_channel)` → `conversations.join` para cada canal não-arquivado, com retry/backoff em `ratelimited`. Persistir resultado em `workspace_slack_settings.joined_channels_at`.
- **Causa B — Filtro descarta tudo antes do Gemini**
  - Revisar critérios atuais (bot_id, subtype, thread_ts, menção obrigatória ao líder). Afrouxar para: qualquer mensagem humana em canal público, sem exigir menção; deixar o Gemini decidir relevância. Manter rate-limit por canal.
- **Causa C — Resolução de membro falha**
  - Hidratar `team_members.slack_user_id` via `users.lookupByEmail` quando vazio (job único + on-demand no classifier).
  - Fallback: se mensagem cita `@U123` que mapeia a um `team_member`, atribuir ao líder dono daquele liderado.

Cada correção entra com migration própria (se mexer em schema) e edge function redeployada isoladamente.

## Fase 4 — Validação

Critérios de "verde" antes de tocar UI:
- `slack-ambient-classifier` retorna `persisted > 0` em ao menos 2 runs consecutivas.
- `slack_ambient_evidence` tem ≥ 20 linhas das últimas 48h.
- `slack-weekly-rollup` gera ≥ 1 `context_evidence` tipo `slack_activity_rollup` por liderado ativo.
- `detect-network-signals` produz ≥ 1 `network_signal` quando houver padrão real (ou retorna "no signal" com motivo claro).

## Fase 5 — Reativação da UI (escopo mínimo, separado)

Só após Fase 4:
- Descomentar item "Contexto" em `src/lib/navigation.ts`.
- Confirmar `TeamPulseBento` renderiza na Home com dados reais.
- `SlackActivityCard` no `MemberDetails` continua acessível.

Sem mudanças visuais novas nesta fase — só destravar o que já existe.

## Detalhes técnicos

- Arquivos tocados na Fase 1:
  - `supabase/functions/slack-ambient-classifier/index.ts`
  - `supabase/functions/slack-weekly-rollup/index.ts`
  - `supabase/functions/detect-network-signals/index.ts`
- Sem mudanças em frontend, sem mudanças em RLS, sem mudanças em cron schedules.
- Sem mexer em `_shared/soul/*` ou prompts de produto.
- Toda chamada Slack via gateway já existente (mesmo padrão dos outros handlers).
- Logs usam `console.log(JSON.stringify({tag, ...}))` para ficarem grep-áveis em `edge_function_logs`.

## Fora de escopo

- Redesign da aba Rede.
- Novos tipos de sinal (Sprint 15 peer-feedback já está separado).
- Mudar arquitetura para webhooks Slack em vez de polling.

## Riscos

- Auto-join em workspace com muitos canais pode bater rate-limit Slack (mitigar com backoff + processar N por run).
- Afrouxar filtro aumenta custo Gemini — manter teto por run (ex: 200 mensagens/run) e medir antes de subir.
