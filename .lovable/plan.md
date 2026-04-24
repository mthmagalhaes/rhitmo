## Sprint 1 — Slack Ambient Mode (Versão Completa)

### Reposicionamento estratégico (importante)

**Slack Ambient NÃO é alternativa ao Recall.ai.** É uma nova camada de captura que reposiciona Rhitmo como:

> "A plataforma que consolida múltiplas fontes de evidência (1:1s gravadas, conversas no Slack, anotações manuais, sentimentos do time) e transforma tudo em **performance reviews fáceis, justas e rápidas**."

- **Recall.ai** continua sendo a fonte premium para 1:1s gravados (alta precisão, contexto profundo).
- **Slack Ambient** captura o "dia-a-dia" que nunca aparece em 1:1 (entregas no canal, conflitos, reconhecimento espontâneo, bloqueios).
- **Magic Paste** continua para times que usam Tactiq/Fireflies/Meet.
- **Anotações manuais** continuam como espinha dorsal.

→ Pricing dos bots Recall.ai NÃO muda. Slack Ambient entra como diferencial dos planos Pro+ (sem canibalização).
→ Narrativa de venda muda de "ferramenta de notas" para "**evidence engine** que alimenta reviews justas".

---

### Decisões já fechadas
- **Resolução de membros:** Auto via email + fallback manual sob demanda.
- **Esfera de captura:** Híbrido modelo Windmill — autojoin em todos os canais públicos por default; admin pode adicionar bot manualmente em canais privados via `/invite`. DMs nunca capturadas.
- **Modo de captura:** Auto-captura silenciosa + revisão batch pelo líder.
- **Digest:** Slack DM (canal nativo do líder) + card no app. **Sem email.** Cadência configurável (semanal default, quinzenal ou mensal).

---

### Item 1 — Schema do banco (migration)

**`workspace_slack_settings`** (config por workspace)
- `workspace_id` (PK), `ambient_mode_enabled` (default true), `autojoin_public_channels` (default true), `excluded_channel_ids` (text[]), `last_classifier_run_at`.
- RLS: owner + HR admin do workspace.

**`team_members.slack_user_id`** (coluna nova)
- `text`, nullable, índice único parcial por workspace. Populada via auto-match por email.

**`slack_ambient_evidence`**
- `id`, `workspace_id`, `manager_id`, `member_id`, `slack_channel_id`, `slack_message_ts`
- `message_text`, `permalink`, `category` (entrega | bloqueio | reconhecimento | conflito | outro)
- `relevance_score` (0-1), `summary`
- `status` (pending | approved | dismissed | converted_to_feedback)
- `feedback_id` (FK feedbacks, nullable), `captured_at`, `reviewed_at`, `created_at`
- RLS: só `manager_id` lê/escreve. HR admin lê agregado anonimizado.
- Índice em `(manager_id, status, captured_at desc)`.

**`leader_digest_preferences`** (novo — config de cadência do digest)
- `user_id` (PK), `cadence` (weekly | biweekly | monthly, default weekly)
- `channel` (slack | in_app | both, default both)
- `day_of_week` (0-6, default 1 = segunda), `hour_local` (default 9)
- `timezone` (default America/Sao_Paulo), `last_sent_at`
- RLS: usuário só vê/edita o próprio.

### Item 2 — Slack manifest & scopes

Adicionar ao app Slack custom:
- **Bot scopes novos:** `channels:history`, `channels:join`, `groups:history`, `users:read.email`.
- **Message shortcut:** "Salvar como evidência no Rhitmo" (callback_id: `save_as_evidence`).
- **Event subscription:** `channel_created` (autojoin de novos canais públicos).

Vou gerar JSON manifest atualizado, te peço pra colar em api.slack.com/apps, depois reconnect via tool de connectors.

### Item 3 — Edge Function `slack-ambient-classifier`

Cron diário (3h BRT):
1. Pra cada workspace com `ambient_mode_enabled = true`: lista canais, filtra excluídos, autojoin em novos públicos.
2. Pra cada canal: `conversations.history` desde último run, filtros baratos (regex/length, descarta < 20 chars, emoji-only, links puros, bots).
3. Resolução de autor: `users.info` → email → match em `team_members.email`. Cache em `slack_user_id`. Sem match = descarta.
4. Classificação semântica: `google/gemini-2.0-flash-lite` em batch (20 msgs/call) → `{relevance_score, category, summary}`. Persiste se score >= 0.6.
5. Insere em `slack_ambient_evidence` (status `pending`), identifica `manager_id` via `teams.leader_user_id`.
6. Logging em `automation_runs` (job: `slack_ambient_classifier`).

**Cron:** `pg_cron` + `pg_net`, schedule `0 6 * * *` UTC.

---

### Itens que ficam pra próximas mensagens
- **Item 4:** Painel `/evidence` de revisão batch (UI no app — onde líder aprova/dispensa em lote).
- **Item 5:** **Digest via Slack DM + card in-app** (NÃO email).
  - Edge Function `send-evidence-digest` que respeita `leader_digest_preferences.cadence`.
  - Mensagem Slack DM no formato:
    ```
    📊 Resumo Rhitmo da semana

    Você tem 12 evidências esperando revisão sobre 4 liderados:
    • João: 3 entregas no #engenharia
    • Maria: 2 reconhecimentos no #vendas
    • ...

    [Revisar agora] [Mudar cadência]
    ```
  - Card persistente no app (componente novo no dashboard) com mesma info + CTA.
  - Config em `Settings > Notificações`: switch de cadência (semanal | quinzenal | mensal) e canal (Slack DM | só in-app | ambos).
- **Item 6:** Conversão evidência → feedback (1-click, popula `feedbacks.source = 'slack_ambient'`).
- **Item 7:** Dashboard HR com métricas agregadas (cobertura de captura, % evidências viraram review, etc).

---

### Custos estimados
- ~50 canais × 100 msgs/dia = 5k msgs/workspace/dia → ~500 vão pro LLM após filtros.
- Gemini Flash Lite: ~R$ 0,02/workspace/dia = **R$ 0,60/workspace/mês**.
- Não substitui custo Recall.ai — adiciona valor (nova fonte de evidência) por custo marginal baixíssimo.

### Riscos & mitigações
- **Rate limit Slack:** paginação com backoff, processa workspaces serialmente.
- **LGPD:** captura só de canais onde bot foi explicitamente adicionado/autojoined. `pending` exige aprovação humana antes de virar feedback. Onboarding com aviso explícito + Privacy Onboarding já existente (`SlackPrivacyOnboarding.tsx`).
- **Falsos positivos:** threshold 0.6 conservador, log de score distribution pra calibrar depois.

---

### Aprovação

Quando aprovar, executo em sequência sem interromper:
1. Crio tasks no tracker.
2. Migration (Item 1) → Manifest/scopes (Item 2) → Edge Function classifier (Item 3).
3. Te aviso ao final do Item 3 com link pra testar (ou ao bloquear).

Confirma esse escopo ajustado?