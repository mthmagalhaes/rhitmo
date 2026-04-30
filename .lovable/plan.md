# Onda 4 — Solidificar a infra das Ondas 2 e 3

Três frentes que se reforçam: ver o que está acontecendo (observabilidade), garantir que continue funcionando (testes), e fazer o Event Bus deixar de ser órfão (migração emit).

## Estado atual relevante

- `_shared/emit.ts` existe mas **só é usado por ele mesmo** (zero produção real).
- 7 funções chamam Slack direto (`slack-bot`, `invite-member-slack`, `send-evidence-digest`, `slack-ambient-classifier`, etc.) — fora do bus.
- `_shared/notifications.ts` é o caminho legado paralelo, com seu próprio sistema de canais.
- 69 Edge Functions em produção, **zero testes Deno**.
- Logs hoje: só `console.log` esparsos. Sem `request_id`, sem correlação cross-function.

## 4.1 — Observabilidade unificada

**Tabela `function_logs`** (append-only, particionada mentalmente por dia via índice em `created_at`):

```text
id              uuid PK
request_id      uuid           -- propagado entre funções via header
function_name   text
level           text           -- 'debug' | 'info' | 'warn' | 'error'
event           text           -- 'start' | 'end' | 'ai_call' | 'db_query' | custom
duration_ms     int            -- nullable
user_id         uuid           -- nullable
workspace_id    uuid           -- nullable
metadata        jsonb          -- payload livre (model, tokens, status_code, etc.)
error_message   text           -- nullable
created_at      timestamptz default now()
```

Índices: `(function_name, created_at DESC)`, `(request_id)`, `(level, created_at DESC) WHERE level IN ('warn','error')`.

RLS: `SELECT` só para super_admin via `has_role(auth.uid(), 'super_admin')`. `INSERT` só via service_role.

**Helper `_shared/logger.ts`**:

```ts
const log = createLogger({ functionName: 'chat-mentor', requestId, userId, workspaceId });
log.info('start', { model: 'gemini-2.5-flash' });
log.aiCall({ model, durationMs, tokensIn, tokensOut });
log.error('failed', err);
await log.flush(); // batch insert no fim da request
```

Buffer in-memory, flush no `finally` da request. Flush não bloqueia a resposta ao usuário (fire-and-forget com timeout 500ms).

**Propagação de `request_id`**: aceitar header `x-request-id` na entrada; gerar `crypto.randomUUID()` se ausente; sempre devolver no response. `aiGateway.ts` e `safeSupabase.ts` recebem o logger via parâmetro opcional.

**Página admin `/admin/observability`** (super_admin only):
- Filtros: function_name, level, range de tempo, request_id.
- Painel: top 10 funções por erro nas últimas 24h, latência p50/p95 por função, custo AI estimado por workspace (token_count × preço do modelo).

## 4.2 — Testes Deno para infra crítica

Cobertura mínima nos shared helpers (que sustentam tudo):

- `_shared/aiGateway.test.ts`
  - 200 OK retorna conteúdo parseado
  - 429 propaga erro tipado `RateLimitError`
  - 402 propaga erro tipado `NoCreditsError`
  - timeout de fetch
  - mock do `fetch` global

- `_shared/emit.test.ts`
  - insere row em `events` com payload correto
  - rejeita `type` vazio
  - rejeita `channels` fora do enum

- `_shared/safeSupabase.test.ts`
  - `safeRpc` retorna `{ data, error }` sem throw
  - `tryRpc` faz throw com mensagem útil
  - `safeFunctionInvoke` lida com 500 do edge function

- `event-dispatcher` (integration-style com supabase mock):
  - processa apenas eventos com `dispatched_at IS NULL`
  - fan-out para `email`, `inapp`, `slack`
  - marca `dispatched_at` no sucesso, `error` no fail
  - idempotência: rodar duas vezes não duplica

- `ai-router` skeleton: roteamento por `task`, validação Zod, 404 em task inexistente.

Testes rodam via `supabase--test_edge_functions`. Adicionar `import "https://deno.land/std@0.224.0/dotenv/load.ts"` em cada arquivo.

## 4.3 — Migrar 3 fluxos críticos para `emit()`

Os 3 com maior tráfego e maior dor de manutenção:

**Fluxo A — Feedback compartilhado**
- Hoje: o frontend marca `visibility='shared'` e nada notifica explicitamente o liderado.
- Depois: trigger ou hook no momento do share dispara `emit({ type: 'feedback.shared', ... })`.
- Dispatcher manda: in-app (sino) + email (template `feedback-shared`).

**Fluxo B — Review compartilhado**
- Hoje: `share-review` chama Slack/email direto misturado com lógica de domínio.
- Depois: `share-review` faz só `emit({ type: 'review.shared', target_user_id, channels: ['email','inapp','slack'] })`.
- Dispatcher cuida do fan-out.

**Fluxo C — Convite enviado (`invite-member-slack` + email de invite)**
- Hoje: lógica duplicada entre `invite-member-slack` e `bulk-invite`.
- Depois: ambas emitem `member.invited` com payload comum. Dispatcher resolve canal pelo `payload.delivery_method`.

**Não migrar nesta onda**: ambient-classifier, slack-bot interativo, evidence-digest agendado (têm timing/UX próprios).

## 4.4 — Memória e documentação

- Atualizar `mem://architecture/event-bus.md` com lista canônica de tipos de evento.
- Criar `mem://infrastructure/observability-logger.md` explicando como usar `createLogger`.
- Adicionar à Core: "Toda Edge Function nova deve usar `createLogger` e emitir via `emit()` em vez de chamar email/Slack direto."

## Ordem de execução

1. Migration `function_logs` + RLS.
2. `_shared/logger.ts` + integração em `aiGateway.ts` (test bench: chat-mentor).
3. Página `/admin/observability` (read-only, simples).
4. Testes Deno dos 5 módulos shared + dispatcher + router.
5. Migração Fluxo A (feedback.shared) — menor blast radius.
6. Migração Fluxo B (review.shared).
7. Migração Fluxo C (member.invited) + remoção do código legado duplicado.
8. Memória atualizada.

## Riscos e mitigações

- **Logger derrubando latência**: flush async com timeout duro de 500ms; falha no insert nunca propaga.
- **Migração de notificação quebrando entrega**: para cada fluxo, manter o caminho antigo por trás de feature flag `USE_EVENT_BUS_FOR_<X>` por 1 semana antes de remover.
- **Volume de `function_logs`**: política de retenção via `pg_cron` semanal — apagar `level IN ('debug','info')` com mais de 14 dias; manter `warn/error` por 90 dias.

## Fora de escopo (Onda 5)

- Migração de 5-10 tasks reais para `ai-router` (analyze-feedback, generate-brief, classify-tag, etc.).
- Rate limiting / quotas por workspace no AI Gateway.
- Migração dos fluxos Slack restantes (ambient, bot interativo).
