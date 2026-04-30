## Onda 2 + Onda 3 — Plano Consolidado

### Onda 2: Invariantes de Schema (Option D)

**Decisão:** Em vez de splittar `chat_threads` em duas tabelas (Option A), aplicar invariantes na tabela existente. Análise dos dados confirma 100% das linhas (19 threads, 69 mensagens) já têm `member_id` populado — split seria over-engineering.

**Migration SQL:**
```sql
-- 1. Backfill defensivo (no-op esperado, mas seguro)
UPDATE chat_threads SET type = 'mentor' WHERE type IS NULL;

-- 2. NOT NULL + CHECK type
ALTER TABLE chat_threads
  ALTER COLUMN member_id SET NOT NULL,
  ALTER COLUMN type SET NOT NULL,
  ADD CONSTRAINT chat_threads_type_check
    CHECK (type IN ('mentor', 'career', 'assistant'));

ALTER TABLE mentor_messages
  ALTER COLUMN thread_id SET NOT NULL;

-- 3. Índices compostos para hot paths
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_member_updated
  ON chat_threads(user_id, member_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_messages_thread_created
  ON mentor_messages(thread_id, created_at ASC);
```

**Atualização TS:** Tipos em `src/integrations/supabase/types.ts` regerarão automaticamente refletindo `member_id: string` (não-nulável).

---

### Onda 3.1: AI Gateway Consolidation

**Diagnóstico:** 6 funções ainda chamam `api.openai.com` direto, perdendo o benefício do gateway (sem rate limit unificado, sem cobrança em LOVABLE_API_KEY, sem retry padronizado):
- `chat-mentor`
- `meu-rhitmo`
- `analyze-feedback`
- `analyze-feedback-background`
- `reanalyze-feedback`
- `extract-text-vision`

**Exceções (continuam OpenAI direto):** `transcribe-audio`, `upload-meeting` (Whisper não está no gateway).

**Implementação:**

1. Criar `supabase/functions/_shared/aiGateway.ts`:
   - `aiChat({ model, messages, tools?, stream? })` → wrapper com retry e tratamento 429/402
   - `aiChatText(opts)` → retorna string direto
   - `aiToolCall(opts)` → extrai tool call args como JSON
   - `aiEmbedding(text)` → embeddings via gateway (quando disponível; fallback OpenAI direto até gateway suportar)
   - Todas usam `LOVABLE_API_KEY` e endpoint `https://ai.gateway.lovable.dev/v1/chat/completions`
   - Erros padronizados: `RateLimitError`, `PaymentRequiredError`, `GatewayError`

2. Migrar as 6 funções uma por uma, com testes de fumaça via `curl_edge_functions` após cada deploy.

3. Padronizar modelo default: `google/gemini-2.5-flash` para análise; `google/gemini-2.5-pro` apenas onde já era usado GPT-5/4o full.

---

### Onda 3.2: Event Bus para Notificações

**Problema atual:** Cada feature dispara email/Slack/in-app inline (ex: feedback compartilhado chama `send-email`, `slack-notify`, `insert notification` em 3 lugares diferentes). Difícil auditar, retentar e desligar canais.

**Arquitetura proposta:**

```text
[Feature code] → INSERT events → [dispatcher edge fn] → fanout
                                       ↓
                  ┌────────────────────┼────────────────────┐
                  ↓                    ↓                    ↓
            email queue          slack queue         in-app insert
            (pgmq existente)     (pgmq existente)    (notifications)
```

**Schema:**
```sql
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,        -- 'feedback.shared', 'review.acknowledged', etc
  workspace_id uuid,
  actor_user_id uuid,
  target_user_id uuid,
  payload jsonb NOT NULL DEFAULT '{}',
  channels text[] NOT NULL,        -- ['email','slack','inapp']
  status text NOT NULL DEFAULT 'pending',  -- pending|dispatched|failed
  created_at timestamptz DEFAULT now(),
  dispatched_at timestamptz,
  error text
);
CREATE INDEX idx_events_pending ON events(status, created_at) WHERE status = 'pending';
```

**Componentes:**
- Edge function `event-dispatcher`: lê `events.status='pending'`, encaminha para queues/inserts apropriados, marca dispatched.
- `pg_cron` rodando dispatcher a cada 30s (ou trigger via webhook se latência crítica).
- Helper `_shared/emit.ts` → `emit({ type, workspace_id, channels, payload })`.

**Migração gradual:** Novas features usam `emit()`. Features existentes migradas em PRs separados (não bloqueante).

---

### Onda 3.3: AI Router (Consolidação de Edge Functions)

**Problema:** ~80 edge functions, muitas são variações finas (`analyze-feedback`, `reanalyze-feedback`, `analyze-feedback-background` fazem quase a mesma coisa com prompts ligeiramente diferentes). Cold start, deploy, observabilidade fragmentada.

**Proposta:** Função única `ai-router` que roteia por `task` no body:

```typescript
POST /ai-router
{ "task": "analyze_feedback", "input": {...} }
{ "task": "generate_brief", "input": {...} }
{ "task": "review_section", "input": {...} }
```

Estrutura interna:
```
supabase/functions/ai-router/
  index.ts              // valida JWT, faz routing
  tasks/
    analyze_feedback.ts
    generate_brief.ts
    review_section.ts
    mentor_chat.ts
    ...
  prompts/              // prompts versionados
```

**Benefícios:**
- 1 deploy ao invés de 80
- Prompts em arquivo separado (versionável, testável)
- Logging unificado por `task`
- Permite A/B de prompts e modelos por task
- Cold start amortizado

**Funções que NÃO migram para router:** webhooks externos (Stripe, Slack, Recall.ai, Google OAuth callbacks), streaming chat (precisa response.body direto), uploads multipart.

**Migração:** Faseada — 5 funções por sprint, manter as antigas como aliases por 2 semanas, depois `delete_edge_functions`.

---

### Ordem de Execução

1. **Onda 2** (migration única, baixíssimo risco) — ~10 min
2. **Onda 3.1** (criar `aiGateway.ts` + migrar 6 funções + smoke tests) — ~30 min
3. **Onda 3.2** (events table + dispatcher + pg_cron + 1 feature piloto migrada) — ~45 min
4. **Onda 3.3** (criar `ai-router` skeleton + migrar 3 tasks como prova de conceito) — ~45 min

Total estimado: ~2h. Cada onda é independente e pode ser revertida sem afetar as anteriores.

---

### Pontos de Atenção
- **Onda 2:** Após `NOT NULL`, qualquer código que tente `INSERT chat_threads` sem `member_id` quebrará. Audit prévio confirma que todos os call sites já passam `member_id`.
- **Onda 3.1:** `LOVABLE_API_KEY` já está disponível como secret; não exige ação do usuário.
- **Onda 3.2:** `pgmq` e `pg_cron` já estão habilitados no projeto (usados pelo email system).
- **Onda 3.3:** A migração completa das 80 funções está fora do escopo desta passada — entregamos apenas o skeleton + 3 tasks piloto.

### Aprovação
Aprovando este plano, executo as 4 sub-ondas em sequência, parando se algum smoke test falhar.