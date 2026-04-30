## Briefing 8.1 — Estrutura unificada de evidências (Context Graph V1)

Materializar o **liderado como raiz** de toda evidência captada pelo sistema. Hoje cada feature faz JOINs próprios entre `feedbacks`, `meeting_transcripts`, `kudos`, `slack_ambient_evidence`, `goals`, `member_prompts`, `formal_reviews` e `mirror_insights`. O Sprint 8.1 cria a **camada agregadora** que vira a base das próximas telas (8.2 citações, 8.3 diário conversacional, 8.4 listagens cronológicas, 8.5 home).

### Estado atual (o que já existe e NÃO refazer)

- `feedbacks` (com `embedding`, `occurred_at`, `source`, `evidence_id`)
- `meeting_transcripts` (Recall + Magic Paste)
- `slack_ambient_evidence` (já tem categoria, score, fluxo de conversão)
- `kudos`, `goals`, `member_prompts` (respostas do liderado), `formal_reviews`, `mirror_insights`, `leader_nudges`
- Hook `useEvidenceResolver` (resolve refs `feedback`/`meeting`)
- Componente `EvidenceChips` (UI base p/ Sprint 8.2)
- pgvector com `text-embedding-3-small` já em produção

### O que será criado

#### 1. Tabela `context_evidence` (camada de agregação)

Uma linha por evidência atômica com metadados padronizados. **Não substitui** as tabelas-fonte; é índice agregador para leitura rápida e RAG.

```text
id              uuid PK
workspace_id    uuid (denormalizado p/ filtro rápido)
member_id       uuid (RAIZ — toda query parte daqui)
source_table    text  (feedbacks|meeting_transcripts|slack_ambient_evidence|
                       kudos|member_prompts|goals|formal_reviews|mirror_insights|
                       leader_nudges)
source_id       uuid  (FK lógica p/ a tabela origem; permite drill-down)
evidence_type   text  (note|meeting|slack_signal|kudo|pulse_response|
                       goal_event|review_excerpt|mirror_alert|nudge)
occurred_at     timestamptz NOT NULL  (data factual; ≠ created_at)
title           text  (label curto p/ chip/timeline)
summary         text  (1-3 linhas p/ exibição inline)
sentiment       text  NULL (positive|neutral|constructive|warning)
tags            text[] DEFAULT '{}'
actor_user_id   uuid NULL (quem gerou — líder, liderado, sistema, peer)
visibility      text NOT NULL DEFAULT 'private_leader'
                      (private_leader|shared|workspace)
embedding       vector(1536) NULL  (mesmo modelo do mentor-chat)
metadata        jsonb DEFAULT '{}' (campos específicos por fonte)
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()

UNIQUE (source_table, source_id)   -- idempotência
INDEX (member_id, occurred_at DESC)
INDEX (workspace_id, occurred_at DESC)
INDEX (member_id, evidence_type, occurred_at DESC)
INDEX USING ivfflat (embedding vector_cosine_ops)  -- RAG
```

#### 2. Triggers automáticas (uma por fonte)

Cada tabela origem ganha trigger `AFTER INSERT OR UPDATE` que faz UPSERT em `context_evidence`. Lógica em **uma função PLPGSQL `SECURITY DEFINER` por fonte**, mapeando colunas → estrutura unificada. UPDATE relevante (ex: `member_prompts.answered_at` mudando de NULL → timestamp) também dispara UPSERT.

Lista de triggers:
- `feedbacks` → `evidence_type='note'`
- `meeting_transcripts` (apenas quando `processing_status='completed'`) → `evidence_type='meeting'`
- `slack_ambient_evidence` (apenas quando `status='approved'` ou `'converted_to_feedback'`) → `evidence_type='slack_signal'`
- `kudos` → `evidence_type='kudo'`, visibility `shared`
- `member_prompts` (quando `answered_at IS NOT NULL`) → `evidence_type='pulse_response'`
- `goals` (status change) → `evidence_type='goal_event'`
- `formal_reviews` (quando `status='shared'`) → `evidence_type='review_excerpt'`
- `mirror_insights` → `evidence_type='mirror_alert'`
- `leader_nudges` (não-dispensados) → `evidence_type='nudge'`

#### 3. Backfill idempotente

Edge Function `backfill-context-evidence` (admin-only):
- Itera por workspace (parametrizável `?workspace_id=`)
- Para cada fonte, faz `INSERT ... ON CONFLICT (source_table, source_id) DO UPDATE`
- Reusa as mesmas funções PLPGSQL das triggers (uma única fonte da verdade do mapeamento)
- Loga em `automation_runs`
- Pode rodar 2x sem duplicar (UNIQUE garante)

#### 4. RLS

- **SELECT**: dono do workspace OU `is_team_leader(effective_user_id(), member_id)` OU liderado vinculado àquele `member_id` (apenas linhas com `visibility IN ('shared', 'workspace')`) OU `is_hr_admin_of_workspace`
- **INSERT/UPDATE/DELETE**: nenhuma policy (apenas `SECURITY DEFINER` via triggers e service_role)

#### 5. Embedding assíncrono

Triggers inserem com `embedding=NULL`. Cron `embed-context-evidence` (5 min) processa lotes de 50 linhas pendentes, chamando `text-embedding-3-small` via Lovable AI. Reusa padrão de `analyze-feedback-background`.

#### 6. RPC de leitura otimizada

`get_member_timeline(_member_id uuid, _limit int DEFAULT 50, _types text[] DEFAULT NULL)`:
- `SECURITY DEFINER`, valida ownership chain
- Retorna linhas de `context_evidence` filtradas + JOIN leve com `team_members(name)` quando `actor_user_id` for liderado
- Substitui os JOINs duplicados que hoje vivem espalhados em hooks

### Critérios de aceitação

- Inserir feedback novo → aparece em `context_evidence` em < 1s (trigger síncrona)
- Encerrar reunião com Recall (`processing_status → completed`) → vira evidência tipo `meeting`
- Liderado responde pulse (`answered_at` populado) → vira `pulse_response`
- Aprovar evidência Slack → vira `slack_signal`
- Backfill rodado 2x → contagens batem com origem, sem duplicatas (validar via SELECT count agregado por `source_table`)
- Liderado A não consegue ler `context_evidence` do liderado B (RLS test com 2 contas)
- HR Admin lê tudo do workspace
- `get_member_timeline(member_x, 50)` < 200ms com 10k linhas (validar com EXPLAIN ANALYZE)
- Embedding job processa pendentes e popula vector

### Detalhes técnicos

- **Por que UPSERT, não INSERT**: UPDATE em fonte (ex: feedback editado, meeting com transcript completado) precisa atualizar summary/embedding sem duplicar.
- **`occurred_at`**: respeita memória de "Time Machine" — feedback usa `feedbacks.occurred_at`, meeting usa `created_at` do transcript, slack usa `captured_at`, pulse usa `answered_at`.
- **Embedding**: gerado a partir de `coalesce(summary, title)` truncado em 8k chars. Não-bloqueante para latência de escrita.
- **Não criar FKs hard** para `auth.users` (regra do projeto). `actor_user_id` fica solto.
- **`metadata jsonb`**: guarda campos específicos (ex: `slack_channel_id`, `bot_id`, `goal_metric_delta`) sem inflar schema.
- **Não tocar nas tabelas-fonte**. Apenas adicionar triggers e a coluna `embedding` se já não existirem.
- **RAG no chat-mentor**: este briefing **não migra** o RAG existente. Sprint 8.2/8.5 fará a migração gradual quando consumir `context_evidence` para citações.

### Arquivos a criar/editar

- Migration: `context_evidence` + 9 trigger functions + RLS + RPC `get_member_timeline`
- `supabase/functions/backfill-context-evidence/index.ts` (admin)
- `supabase/functions/embed-context-evidence/index.ts` (cron 5min)
- `supabase/config.toml`: cron schedule do embed
- `src/hooks/useContextTimeline.ts` (consome RPC; substitui gradualmente os hooks atuais nos próximos briefings — **8.1 não migra UI ainda**)

### O que NÃO fazer neste briefing

- Não alterar UI existente. Sprint 8.1 é puro backend + estrutura.
- Não migrar `chat-mentor` RAG ainda (vem em 8.5).
- Não criar Pulse/Self-review novos (Sprints 9-10).
- Não construir página de Context Graph dedicada (Sprint 8.4 fará timeline cronológica universal consumindo isso).

### Próximos sprints que dependem desta fundação

- **8.2** — Citações clicáveis: chips usam `context_evidence.id` como ref unificada
- **8.3** — Diário conversacional: lê e escreve via `context_evidence`
- **8.4** — Listagem cronológica universal: query única em `context_evidence` filtrada por workspace
- **8.5** — Home + Mentor Chat hero: RAG migra para `context_evidence` com citações ricas
