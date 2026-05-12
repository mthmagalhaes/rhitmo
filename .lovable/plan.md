
# Slack Ambient → Mentor: "no que X tá trabalhando esses dias?"

Reaproveita a infra existente (`slack_ambient_classifier`, `slack_ambient_evidence`) e adiciona uma camada de **rollup semanal por liderado** que vira `context_evidence` consumível pelo Mentor (web e Slack) e pelo Brief de 1:1.

## Comportamento esperado

Líder pergunta no Mentor: *"No que o Guilherme tá trabalhando esses últimos dias e com quem?"*

Mentor responde com base em:
- Temas recorrentes nas mensagens dele em canais públicos (últimos 7d)
- Top colaboradores (com quem mais trocou mensagem / foi mencionado)
- Canais mais ativos
- Sinais de entrega/bloqueio/reconhecimento já capturados pelo classifier

## Arquitetura

```text
Slack (canais públicos onde bot está)
    │  cron 2x/dia
    ▼
slack-ambient-classifier  (já existe, precisa "ligar")
    │  insere em
    ▼
slack_ambient_evidence  (já existe — granular, 1 row por mensagem relevante)
    │  cron diário 04 UTC
    ▼
slack-weekly-rollup  (NOVO)
    │  agrega últimos 7d por liderado, gera resumo via Gemini Flash
    │  insere/upserta em
    ▼
context_evidence (evidence_type='slack_activity_rollup', source_table='slack_ambient_evidence')
    │  RAG via match_context_evidence
    ▼
chat-mentor (web + Slack DM) responde com contexto fresco
```

## Mudanças

### 1. Ligar ambient mode por default em públicos

`workspace_slack_settings` hoje está vazio. Default ON para todo workspace que tem `slack_integrations` ativo.

- Migration: nova trigger `auto_enable_ambient_on_slack_connect` que insere row em `workspace_slack_settings` com `ambient_mode_enabled=true, autojoin_public_channels=true` quando workspace conecta Slack.
- Backfill: insert para todos workspaces com slack já conectado.
- Cron já existe? Verificar `pg_cron` — se não, schedular `slack-ambient-classifier` 2x/dia (09 + 21 UTC) via insert em `cron.schedule`.

### 2. Edge function `slack-weekly-rollup` (nova)

`supabase/functions/slack-weekly-rollup/index.ts`

Para cada `(workspace_id, member_id)` com ≥3 evidências em `slack_ambient_evidence` nos últimos 7 dias:

1. Carrega evidências + metadata (canal, autor, menções, ts).
2. Faz uma 2ª query em `conversations.history` apenas para extrair menções (`<@U…>`) e replies do liderado dentro de threads → resolve top 3 colaboradores via `users.info` cacheado.
3. Chama Gemini Flash 1x: input = lista de summaries + canais + colabs → output JSON:
   ```json
   {
     "themes": ["migração do checkout", "onboarding de 2 contractors"],
     "top_collaborators": [{"name":"Ana","interactions":12},{"name":"Bruno","interactions":7}],
     "top_channels": ["#growth-eng","#design-crit"],
     "narrative": "Guilherme passou a semana focado em…"
   }
   ```
4. Upsert em `context_evidence`:
   - `evidence_type = 'slack_activity_rollup'`
   - `source_table = 'slack_ambient_evidence'`, `source_id = uuid_v5(member_id + week_start)` (determinístico, evita duplicatas)
   - `summary = narrative`, `metadata = { themes, top_collaborators, top_channels, evidence_count }`
   - `occurred_at = week_end`
   - `visibility = 'private_leader'`
5. Cron diário 04:30 UTC (depois do classifier).

### 3. Mentor usa rollups automaticamente

`match_context_evidence` já é chamado no `chat-mentor` (linha 526) — sem mudança. Apenas garantir no system prompt do mentor que mencione "Atividade no Slack" como fonte válida quando aparecer evidência com `evidence_type='slack_activity_rollup'`.

Pequeno ajuste em `_shared/rhitmo-leader-coach.ts` ou no prompt member do `chat-mentor`: adicionar 1 linha citando que dados de Slack vêm em **rollups semanais agregados** (não mensagens cruas), pra a IA contextualizar a fonte.

### 4. Citation chip

`CitationChip` já lida com qualquer `[doc:UUID]`. Adicionar ícone Slack quando `evidence_type='slack_activity_rollup'` em `src/components/context/sourceMeta.ts`.

## Privacidade & guardrails

- **Mensagens cruas nunca saem do Slack** para o frontend. `slack_ambient_evidence.message_text` permanece restrito à RLS do líder.
- Rollup expõe apenas **temas + colaboradores + narrativa agregada** — nunca cita mensagem literal nem trecho > 80 chars.
- Bots, DMs e canais privados continuam **excluídos** (já filtrado).
- Líder pode excluir canais via `workspace_slack_settings.excluded_channel_ids` (campo já existe; UI fica para depois).
- Aviso no Onboarding do líder: "A Rhitmo observa atividade pública dos seus liderados em canais onde o bot já está" (1 linha + link policy).

## Custo estimado

Gemini Flash Lite no classifier (já existe) + 1 chamada Flash por liderado/semana no rollup ≈ **$0.002/liderado/semana**. Workspace de 10 liderados = $0.08/mês.

## Out of scope (próximas sprints)

- UI em `/lider/configuracoes` para ligar/desligar Ambient + lista de canais excluídos
- Card "Atividade no Slack" no `DirectReportDashboard` mostrando rollup
- Bloco dedicado nos briefs de 1:1 (`briefGenerator.ts`)
- DM aos liderados informando que estão sendo observados (compliance opcional)
- Detecção de "watermelon" cruzando rollup Slack vs sentimento em pulses

## Entregáveis

1. Migration: trigger + backfill `workspace_slack_settings`, cron schedules.
2. Edge function `slack-weekly-rollup/index.ts`.
3. Update `_shared/rhitmo-leader-coach.ts` (ou prompt member) — 2 linhas.
4. Update `src/components/context/sourceMeta.ts` — ícone Slack para rollup.
5. Memory: `mem://features/slack/ambient-weekly-rollup.md`.
