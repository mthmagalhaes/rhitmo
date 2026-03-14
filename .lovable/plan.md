

## Billing completo com Stripe

### 1. Criar tabela `subscriptions` (migration)

Tabela com campos: `workspace_id`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `plan_tier`, `status`, `quantity`, `trial_ends_at`, `current_period_end`, timestamps. Usar validation triggers em vez de CHECK constraints. RLS: SELECT para workspace owner, demais operações apenas via service role.

### 2. Edge Function: `create-checkout-session`

POST com JWT. Busca workspace do user, busca/cria Stripe Customer, cria Checkout Session com price ID correto, trial 14 dias (pro only), `allow_promotion_codes: true`, metadata `workspace_id`. Retorna `{ url }`.

Price IDs hardcoded:
- pro: `price_1TB0QgIF4fHxJpjHoIlCeHP6`
- business: `price_1TB0QgIF4fHxJpjH032DMzZH`

### 3. Edge Function: `stripe-webhook`

Público (verify_jwt = false). Valida signature via `STRIPE_WEBHOOK_SECRET`. Trata eventos:
- `checkout.session.completed` → cria subscription + atualiza `workspaces.plan_tier`
- `customer.subscription.updated` → sync status/period/plan_tier
- `customer.subscription.deleted` → canceled + plan_tier = pulse
- `invoice.payment_failed` → past_due

Usa service role client para bypass RLS.

### 4. Edge Function: `create-portal-session`

POST com JWT. Busca `stripe_customer_id` da subscription do workspace, cria Billing Portal Session, retorna `{ url }`.

### 5. Atualizar `src/pages/AuthPage.tsx`

Após `user` autenticado, verificar `?plan=pro|business`. Se presente:
- Poll `workspaces` até encontrar registro (max 5s)
- Chamar `create-checkout-session` automaticamente
- Redirecionar para `session.url`

Se não tiver `?plan`, fluxo normal → `/dashboard`.

### 6. Atualizar `src/pages/Billing.tsx`

- Buscar dados da tabela `subscriptions` (status, trial_ends_at, current_period_end, quantity)
- `handleUpgrade(plan)` → chama `create-checkout-session`, redireciona para URL, loading state
- `handleManageSubscription()` → chama `create-portal-session`, redireciona
- Banner trial (amarelo), past_due (vermelho)
- Toast de sucesso quando `?success=true` na URL
- Datas formatadas em pt-BR

### 7. Atualizar Landing CTAs

Já estão corretos: Pulse → `/auth?mode=signup`, Pro → `/auth?mode=signup&plan=pro`. Nenhuma mudança necessária.

### 8. Config: `supabase/config.toml`

Adicionar entries para as 3 novas functions. `stripe-webhook` com `verify_jwt = false`, as outras com `verify_jwt = false` (validação em código via getClaims).

###Secret necessário

`STRIPE_WEBHOOK_SECRET` — será necessário após deploy do webhook. Pedir ao user para configurar no Stripe Dashboard e adicionar via tool.

### Arquivos alterados
- Migration SQL (nova tabela `subscriptions`)
- `supabase/functions/create-checkout-session/index.ts` (novo)
- `supabase/functions/stripe-webhook/index.ts` (novo)
- `supabase/functions/create-portal-session/index.ts` (novo)
- `src/pages/Billing.tsx` (rewrite com dados reais)
- `src/pages/AuthPage.tsx` (fluxo pós-signup com ?plan)

