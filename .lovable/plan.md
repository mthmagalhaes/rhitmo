# Onda 4.5 — Fechamento das Ondas 3 e 4

Objetivo: zerar os 6 itens pendentes identificados na auditoria, sem abrir frente nova. Tudo aqui é "terminar o combinado".

## Estado atual (recap)

- Testes shared OK (`aiGateway`, `emit`, `logger`, `safeSupabase`).
- Faltam testes de `event-dispatcher` e `ai-router`.
- Trigger `feedback.shared` emite eventos, mas não há template de email correspondente — quando o dispatcher enfileira `email`, o `process-email-queue` não tem template para renderizar.
- `notify-review-shared` duplica entrega: manda Resend direto **e** emite evento (fan-out duplicado para in-app/slack só, mas a memória promete migração completa).
- `invite-member-slack` e `bulk-onboard` ainda chamam Slack/email direto, sem `emit()`.
- Sem feature flags para rollback seguro.
- Dashboard observabilidade não mostra custo AI estimado por workspace; maioria dos `aiGateway` não recebe logger.

## 4.5.1 — Testes faltantes (event-dispatcher + ai-router)

**`event-dispatcher/index_test.ts`**
- Mock do supabase client (`@supabase/supabase-js` stub local).
- Casos:
  - Sem eventos pendentes → retorna `processed: 0`.
  - Evento `inapp` com `target_user_id` → insere em `notifications` e marca `dispatched`.
  - Evento `inapp` sem `target_user_id` → marca `failed` com erro descritivo após 3 tentativas.
  - Evento multi-canal (`email`+`inapp`) → chama `enqueue_email` e insere notification.
  - Evento que falha no canal → incrementa `attempts`, mantém `pending` até 3, depois `failed`.
  - Idempotência: chamar duas vezes seguidas não duplica `notifications` (segundo run encontra status `dispatched`, ignora).

**`ai-router/index_test.ts`**
- Mock de auth: `Authorization` ausente → 401.
- Body sem `task` → 400.
- `task` desconhecida → 400 com lista `available`.
- `task` válida (`summarize_text`) com input mínimo → roteia para handler (mock do handler para evitar chamada real ao gateway).
- `GatewayError` propagado → response usa `gatewayErrorResponse`.

Rodar via `supabase--test_edge_functions` no fim.

## 4.5.2 — Template `feedback-shared` para o dispatcher

Hoje o trigger `trg_emit_feedback_shared` insere evento com canal `email`, o dispatcher chama `enqueue_email`, mas `process-email-queue` não tem template `feedback-shared` na registry transacional.

Ações:
1. Criar `supabase/functions/_shared/transactional-email-templates/feedback-shared.tsx` (React Email, brand Rhitmo: Lora headings, max-w-5xl mental, fundo `#ffffff`, botão "Ver feedback" levando para `https://rhitmo.co/dashboard?feedback=<id>`).
2. Registrar em `_shared/transactional-email-templates/registry.ts` como `'feedback-shared'`.
3. Garantir que o payload do evento (`feedback_id`, `summary`, `actor_name`, `target_name`) seja repassado como `templateData` quando `process-email-queue` chamar `send-transactional-email`. Se o dispatcher hoje envia tudo dentro de `data`, ajustar `process-email-queue` para mapear `event_type → templateName` e `data → templateData` para os tipos canônicos do Event Bus.
4. Deploy de `process-email-queue` + `send-transactional-email`.

## 4.5.3 — Migração completa do `notify-review-shared`

Hoje: chama Resend direto **e** emite evento (canais `inapp`, `slack`).

Plano:
1. Criar template transacional `review-shared` na registry (já existe `_shared/transactional-email-templates/review-shared.tsx` — confirmar e reutilizar).
2. No `notify-review-shared`, **remover** chamada direta ao Resend.
3. Trocar `emit({ channels: ['inapp','slack'] })` por `emit({ channels: ['inapp','slack','email'] })`.
4. Adicionar feature flag de segurança: env `USE_EVENT_BUS_FOR_REVIEW_SHARED` (default `true`). Se `false`, mantém o caminho antigo (Resend direto + evento sem email). Permite rollback de 1 comando sem deploy.
5. Logar via `createLogger` qual caminho foi usado.

## 4.5.4 — Migrar `invite-member-slack` e `bulk-onboard` para `emit()`

**`invite-member-slack`**: hoje chama Slack API direto. Migrar para emitir `member.invited` com `channels: ['slack']` e `payload.delivery_method: 'slack'`. Dispatcher já sabe rotear `slack` para `slack_outbound` queue. Manter chamada direta atrás de flag `USE_EVENT_BUS_FOR_SLACK_INVITE`.

**`bulk-onboard` / `dispatch-bulk-invites`**: cada item do batch passa a emitir `member.invited` (canais conforme `delivery_method` do item). Remove a duplicação com `admin-invite-user` (que já emite). Flag `USE_EVENT_BUS_FOR_BULK_INVITE`.

Atualizar `mem://architecture/event-bus.md` listando os novos emissores e o contrato de `payload.delivery_method`.

## 4.5.5 — Feature flags (mecanismo único)

Helper novo `_shared/featureFlags.ts`:
```ts
export function flag(name: string, defaultValue = true): boolean {
  const v = Deno.env.get(name);
  if (v == null) return defaultValue;
  return v.toLowerCase() === 'true' || v === '1';
}
```

Flags introduzidas: `USE_EVENT_BUS_FOR_REVIEW_SHARED`, `USE_EVENT_BUS_FOR_SLACK_INVITE`, `USE_EVENT_BUS_FOR_BULK_INVITE`. Documentar em `mem://infrastructure/feature-flags.md` com instruções "para reverter, setar = false e redeploy zero — basta atualizar secret".

## 4.5.6 — Métrica de custo AI por workspace

No `_shared/aiGateway.ts`, quando o logger é passado:
- Após resposta OK, calcular custo estimado: `tokensIn * priceIn[model] + tokensOut * priceOut[model]`.
- Tabela de preços hardcoded em `_shared/aiPricing.ts` (USD por 1M tokens) cobrindo modelos usados: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-lite`, `gpt-5`, `gpt-5-mini`, `gpt-5-nano`.
- `log.aiCall({ ..., estimatedCostUsd })` grava em `metadata` do `function_logs`.

No `AdminObservability.tsx`:
- Adicionar card "Custo AI estimado (últimos 7d)" agrupado por `workspace_id`, ordenado desc.
- Query: `SELECT workspace_id, SUM((metadata->>'estimatedCostUsd')::numeric) FROM function_logs WHERE event='ai_call' AND created_at > now() - interval '7 days' GROUP BY workspace_id ORDER BY 2 DESC LIMIT 20`.

Passar logger explicitamente em pelo menos 4 funções de alto tráfego que ainda não recebem: `analyze-feedback`, `generate-brief`, `generate-formal-review`, `meu-rhitmo`. Não migrar todas — apenas o suficiente para o dashboard ter dados representativos.

## 4.5.7 — Memória

- Atualizar `mem://architecture/event-bus.md`: adicionar `feedback-shared` template, novos emissores (`invite-member-slack`, `bulk-onboard`, `notify-review-shared` totalmente migrado).
- Criar `mem://infrastructure/feature-flags.md` listando flags + helper.
- Atualizar `mem://infrastructure/observability-logger.md` com seção "Custo AI" e tabela `aiPricing`.
- Atualizar Core: adicionar linha "Use `flag()` de `_shared/featureFlags.ts` para todo rollback de migração de bus."

## Ordem de execução

1. Testes do dispatcher e do router (4.5.1).
2. Template `feedback-shared` + ajuste no `process-email-queue` (4.5.2).
3. Helper `featureFlags.ts` + `aiPricing.ts` (base para 4.5.3-4.5.6).
4. Migração `notify-review-shared` (4.5.3).
5. Migração `invite-member-slack` e `bulk-onboard` (4.5.4).
6. Custo AI: gateway + dashboard + 4 funções instrumentadas (4.5.6).
7. Memórias atualizadas (4.5.7).
8. Rodar `supabase--test_edge_functions` final + deploy de todas as funções tocadas.

## Riscos

- **Template `feedback-shared` mal mapeado** → email não envia. Mitigação: testar com curl no `send-transactional-email` antes de habilitar o caminho do dispatcher.
- **Flag default errado** → comportamento muda silenciosamente. Mitigação: defaults preservam comportamento antigo só onde houver risco real (review/invites). Para `feedback-shared` (novo, não tem caminho antigo), não há flag.
- **Custo AI impreciso** → preços mudam. Mitigação: documentar em `aiPricing.ts` que os valores são estimativas e a fonte da verdade segue sendo a fatura do provider.

## Fora de escopo (continua para Onda 5)

- Migrar 5-10 tasks reais para `ai-router`.
- Rate limiting por workspace.
- Migração dos fluxos Slack restantes (ambient, bot interativo, evidence-digest).