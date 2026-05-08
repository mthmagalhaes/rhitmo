## Objetivo

Finalizar a migração para o modelo Windmill (per-seat) começando do ponto onde paramos: já temos migration + `usePlanLimits` + `Billing.tsx` v3. Falta Stripe, webhook, Landing, validação dos workspaces grandfathered e comunicação.

---

## 1. Stripe — produto per-seat

Criar via `stripe--create_stripe_product_and_price`:
- Produto: **Rhitmo Seat**
- Preço Mensal: R$ 49,90 / mês (BRL, recurring=month)
- Preço Anual: R$ 478,80 / ano (BRL, recurring=year) — equivalente a R$ 39,90/mês com 16% off

Hardcodar os 2 `price_id` retornados em constantes compartilhadas (`SEAT_PRICE_ID_MONTHLY`, `SEAT_PRICE_ID_ANNUAL`) em uma const dentro das edge functions (não em src/, para respeitar a regra de não importar do front).

> Observação: a memória `usePlanLimits.ts` hoje diz `SEAT_PRICE_ANNUAL_BRL = 502.8`. Vou alinhar para **R$ 478,80** (R$ 39,90 × 12), conforme você definiu agora. Ajusto a constante e os textos.

---

## 2. `create-checkout-session` — quantity dinâmico + bloqueio grandfather

Reescrever a função:
1. Auth via `supabase.auth.getUser()`.
2. Buscar workspace do usuário: `id, paid_seats, seat_cycle, grandfather_until`.
3. Se `grandfather_until >= hoje` → retornar `{ blocked: true, reason: 'grandfathered', grandfather_until }` (sem abrir checkout).
4. Contar `team_members` do workspace.
5. Calcular `seats_to_pay = max(1, total_members - FREE_SEATS)`.
6. Aceitar body `{ cycle: 'monthly' | 'annual' }` (padrão monthly).
7. Criar/buscar Stripe customer por email (já faz isso hoje).
8. Criar checkout `mode: subscription`, `line_items=[{ price: SEAT_PRICE_ID_<CYCLE>, quantity: seats_to_pay }]`.
9. Metadata: `workspace_id`, `seat_cycle`, `paid_seats: seats_to_pay`.
10. `success_url` / `cancel_url` em `https://rhitmo.co/billing`.

Remover toda a lógica antiga de `PRO_PRICE_IDS` (quarterly/semiannual/annual).

---

## 3. `update-subscription` — sincronizar seats em tempo real

Nova rota/função `update-subscription` (ou refatorar a existente) com:
- Body: `{ action: 'sync_seats' }` (default) ou `{ action: 'change_cycle', cycle }`.
- Buscar `subscriptions.stripe_subscription_id` do workspace.
- Recontar `team_members`, calcular `seats_to_pay`.
- `stripe.subscriptions.update(subId, { items: [{ id: itemId, quantity: seats_to_pay }], proration_behavior: 'create_prorations' })`.
- Atualizar `workspaces.paid_seats` no DB.

Chamada automática a partir de:
- Trigger no DB `team_members` (AFTER INSERT/DELETE) → `pg_net` invoca `update-subscription` com workspace_id (ou flag e cron). Para evitar acoplamento DB↔HTTP, alternativa mais simples: chamar `supabase.functions.invoke('update-subscription')` no fluxo do front quando um liderado é adicionado/removido (hooks de `NewMemberDialog` e remoção). **Vou usar essa segunda opção** (mais simples e auditável).
- Sempre no-op se workspace está grandfathered.

---

## 4. `stripe-webhook` — gravar paid_seats / seat_cycle

Atualizar handler para:
- `checkout.session.completed`: ler `quantity` e `price.id` da subscription, mapear cycle (`monthly`/`annual`), `UPDATE workspaces SET paid_seats = quantity, seat_cycle = cycle, plan_tier = 'pro'`.
- `customer.subscription.updated`: idem (refletir mudanças de quantity feitas via portal/manual).
- `customer.subscription.deleted`: `paid_seats = 0`, `seat_cycle = 'monthly'`, `plan_tier = 'pulse'`.
- Manter mapa `PRICE_TO_PLAN` legado para grandfathering dos antigos Business/Pro mensais.

---

## 5. `Billing.tsx` — corrigir preço anual + fluxo de checkout

- Trocar `SEAT_PRICE_ANNUAL_BRL` para **478.80** no hook + textos ("R$ 39,90/liderado/mês cobrado anualmente").
- Botão "Assinar" chama `supabase.functions.invoke('create-checkout-session', { body: { cycle } })`.
- Se response `{ blocked: true }` → mostrar toast "Você está no período Early Adopter até DD/MM/AAAA. Nada a pagar."
- Banner Early Adopter já existe — apenas confirmar texto.
- Adicionar contador "X liderados ativos · Y pagos · Z gratuitos".

---

## 6. `Landing.tsx` — pricing single-card

Substituir a seção atual (Pulse/Pro/Enterprise) por **um único card Windmill-style**:
- Headline: "Comece grátis. Pague só pelo time que cresce."
- 3 free seats + Recall 6h/mês incluídos.
- A partir do 4º liderado: R$ 49,90/mês ou R$ 39,90/mês no anual (16% off).
- Tudo incluso (Mentor, 1:1s, Reviews 360°, Pulse, PDI, Recall ilimitado a partir do 1 seat pago).
- CTA único: "Começar grátis".

Remover comparativos antigos, badges Founder/Lifetime e copy de planos múltiplos.

---

## 7. Validação dos 6 workspaces grandfathered

Após deploy:
1. `read_query`: confirmar que os 6 workspaces têm `grandfather_until = 2026-11-08` e `paid_seats = 0`.
2. Rodar `usePlanLimits` mentalmente: `isGrandfathered = true` → `maxMembers = Infinity`, `recallUnlimited = true`, `needsSeatPurchase = false`.
3. Confirmar no front (ex: workspace de teste) que **nenhum prompt de upgrade** aparece e o banner Early Adopter está visível em `/billing`.
4. Garantir que `create-checkout-session` retorna `blocked: true` para esses workspaces (sem cobrar nada no Stripe).
5. Documentar plano automático pós-08/11/2026: cron diário `expire-grandfather` que, quando `grandfather_until < hoje` e `paid_seats = 0` e `team_members > 3`, marca workspace como "pending_plan" + envia email/Slack ao Owner. Sem cobrança automática surpresa.

---

## 8. Comunicação (não bloqueante)

Stub de email + Slack DM na próxima sprint:
- Template email "Você é Early Adopter Rhitmo" (data fim, o que muda, link `/billing`).
- DM Slack via `slack-rhitmo-orchestrator` ao Owner de cada um dos 6 workspaces (idempotente).

> Posso entregar agora apenas o template + função `notify-grandfather` pronta para disparo manual; o envio em massa fica como botão no `/admin`.

---

## Ordem de execução

1. Criar produto + 2 prices no Stripe (tool call).
2. Atualizar `usePlanLimits` (preço anual 478,80) + `Billing.tsx` (textos + chamada checkout).
3. Reescrever `create-checkout-session` (quantity dinâmico + bloqueio grandfather).
4. Reescrever `stripe-webhook` (gravar paid_seats/seat_cycle).
5. Criar `update-subscription` (sync_seats) + chamadas no front em add/remove member.
6. Reescrever pricing em `Landing.tsx`.
7. Rodar `read_query` validando os 6 workspaces + checagem visual.
8. Entregar template email + função `notify-grandfather` (manual).

---

## Arquivos afetados

- `src/hooks/usePlanLimits.ts` (constante anual)
- `src/pages/Billing.tsx` (texto + invoke)
- `src/pages/Landing.tsx` (pricing section)
- `src/components/team/NewMemberDialog.tsx` + remoção de membro (chamar `update-subscription`)
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/update-subscription/index.ts`
- `supabase/functions/notify-grandfather/index.ts` (novo)

Sem novas migrations — colunas já existem.
