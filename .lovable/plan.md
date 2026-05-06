## Sprint 15 — Proactive Peer Feedback (Windy-style, leve)

Sprint 14 fechou ONA + sinais + Pulse na Home. O próximo passo natural, alinhado à referência Windmill (`mem://product/continuous-feedback-windmill-reference`), é fechar o loop de **continuous feedback**: usar o grafo de colaboração (`team_network_edges`) para a Rhitmo perguntar **proativamente** a pares — via Slack DM — sobre pessoas com quem eles realmente trabalham, e materializar as respostas como evidência nominal no `/lider/contexto` e nos briefs de 1:1.

Hoje só temos Pulse Surveys (líder → liderado) e peer reviews formais (ciclo). Falta a coleta **leve, contínua, baseada em colaboração detectada**.

### Objetivo
Quando a ONA detecta que A colabora forte com B nos últimos 14d, a Rhitmo pode pedir a A — uma vez por quinzena, no máximo — uma nota curta sobre B ("o que B fez bem? algo a melhorar?"). Resposta vira `ctx_evidence` (source `peer_feedback`), entra no Contexto do líder de B e enriquece o brief da próxima 1:1.

### Escopo (5 entregas)

1. **Schema — `peer_feedback_requests`**
   - Migration nova: `id, requester_workspace, leader_user_id, subject_member_id, peer_user_id, peer_member_id (nullable), edge_strength_at_request, sent_at, responded_at, status ('pending'|'answered'|'declined'|'expired'), response_text, expires_at`.
   - Unique parcial: `(subject_member_id, peer_user_id)` onde `sent_at >= now() - 14d` (evita spam).
   - RLS: líder de `subject_member_id` lê tudo; `peer_user_id` lê/atualiza apenas a própria linha; service_role escreve.
   - Trigger: ao virar `answered`, insere `ctx_evidence` (source=`peer_feedback`, payload com nome do par + texto + edge_strength).

2. **Edge function `request-peer-feedback` (cron diário, 04:00 UTC após detect-network-signals)**
   - Para cada `team_network_edges` com `edge_strength >= threshold` nos últimos 14d:
     - Se par tem `slack_integrations` e não há request aberto/recente para o mesmo `(subject, peer)` → cria linha + envia Slack DM com 1 botão "✍️ Dar feedback rápido" (action_id `peer_fb_open`).
   - Limites: máx 3 requests por par por dia, máx 1 request por subject-peer por 14d.
   - Idempotência: `sent_at IS NULL` guard antes do `chat.postMessage`.

3. **Slack handler — `slack-bot/index.ts`**
   - Adicionar dois action_ids: `peer_fb_open` (abre modal Slack com `views.open`, 1 textarea + 2 botões "Enviar"/"Pular") e `peer_fb_submit` (atualiza linha para `answered`, fecha modal, posta ack).
   - Reusa padrão de `answer_pulse` já existente.

4. **Frontend — Contexto e Brief**
   - `NetworkSignalsFeed` ou nova aba "Feedback de pares" em `/lider/contexto`: listar evidências `peer_feedback` agrupadas por subject_member, com chip "anônimo opcional" (v1: nominal, v2: anonimizar).
   - `briefGenerator.ts` (no shared): adicionar bloco "Vozes de pares" — até 2 peer_feedback recentes do subject, falando via `wrapAsRhy()`.
   - `useTeamPulse` continua igual; nada removido.

5. **Cron + Memórias**
   - `select cron.schedule('request-peer-feedback-daily', '0 4 * * *', ...)` via insert SQL.
   - Nova memória `mem://features/ona/peer-feedback-loop` documentando schema, RLS, fluxo Slack, integração com brief.
   - Atualizar `mem://features/slack/command-ecosystem` e `_shared/slackCommands.ts` com os novos action_ids.
   - Atualizar `mem://features/ona/network-signals-and-pulse` referenciando a nova feature.

### Detalhes técnicos

```text
detect-network-signals (03:30) ─┐
                                 ├─► team_network_edges (frescas)
build-team-graph (03:00) ───────┘
                                          │
                  request-peer-feedback (04:00) ──► Slack DM (botão)
                                          │              │
                                          ▼              ▼
                                peer_feedback_requests   modal Slack
                                          │              │
                                          ▼              ▼
                                       answered  ──► trigger insert ctx_evidence
                                                              │
                                                              ▼
                                               /lider/contexto + brief 1:1
```

- **Threshold inicial:** `edge_strength >= 0.3` (ajustável). Métrica: número de DMs enviadas/dia ≤ 5 por workspace na primeira semana — guardrail anti-spam.
- **Privacidade:** v1 mostra nome do par (mesmo padrão do Slack ambient classifier). Toggle "anônimo" entra em sprint futuro.
- **Sem mudança em Pulse Surveys, peer reviews formais, ou Mentor.** Risco de quebra: baixo (nova tabela, nova função, novos action_ids isolados).

### Ordem de execução
1. Migration `peer_feedback_requests` + trigger.
2. Edge function `request-peer-feedback` + cron.
3. Handlers Slack (`peer_fb_open` / `peer_fb_submit`) em `slack-bot/index.ts`.
4. Bloco "Vozes de pares" no `briefGenerator.ts` + aba/seção em `/lider/contexto`.
5. Memórias + index.
