---
name: Observability Logger
description: Tabela function_logs + helper createLogger para Edge Functions, com request_id propagado via header x-request-id
type: feature
---

Onda 4.1. Tabela `public.function_logs` (RLS: SELECT só super_admin via `is_admin_user`, INSERT só service_role). Retenção: 14d info/debug, 90d warn/error via pg_cron `function_logs_retention_weekly`.

Helper `_shared/logger.ts`:
- `createLogger({ functionName, requestId, userId?, workspaceId? })` retorna logger com `info/warn/error/debug/aiCall`.
- `getOrCreateRequestId(req)` extrai/gera UUID do header `x-request-id`.
- Buffer in-memory, flush no `finally` com timeout 800ms. Nunca lança.
- `aiGateway.aiChatRaw` aceita `logger` opcional e emite entrada `ai_call` com model/duração/status.

Painel: `/admin` → aba "Observabilidade" (`AdminObservability.tsx`). KPIs (erros/warns/IA/latência média) + filtros (função, nível, request_id ou texto).

Test bench atual: `chat-mentor` integrado com logger + propagação de `x-request-id`.
