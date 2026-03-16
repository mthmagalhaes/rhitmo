

## Gerenciamento de assinatura nativo no Rhitmo

### 1. Migration: adicionar coluna `cancel_at_period_end`

```sql
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;
```

### 2. Atualizar webhook para sincronizar `cancel_at_period_end`

No `stripe-webhook/index.ts`, no case `customer.subscription.updated`, adicionar `cancel_at_period_end: sub.cancel_at_period_end ?? false` no update.

### 3. Criar 4 Edge Functions

**cancel-subscription** — busca `stripe_subscription_id` via workspace do user, chama `stripe.subscriptions.update(id, { cancel_at_period_end: true })`, atualiza coluna `cancel_at_period_end = true` na tabela subscriptions. Retorna `{ success, cancel_at }`.

**reactivate-subscription** — mesmo padrão, mas com `cancel_at_period_end: false`. Atualiza coluna para `false`.

**get-invoices** — busca `stripe_customer_id`, chama `stripe.invoices.list({ customer, limit: 12 })`, retorna array simplificado com `id, amount, status, created, invoice_pdf, period_start, period_end`.

**update-payment-method** — busca `stripe_customer_id`, cria Checkout Session em `mode: 'setup'` com `success_url: https://rhitmo.co/billing?payment_updated=true` e `cancel_url: https://rhitmo.co/billing`. Retorna `{ url }`.

Todas com verify_jwt = false no config.toml, validação manual de JWT no código (padrão existente).

### 4. Reescrever Billing.tsx (estado ativo/trial)

Substituir o botão "Gerenciar assinatura" por UI nativa:

- **Card principal**: manter nome, badge, valor, próxima cobrança. Dois botões: "Trocar cartão" (ghost, chama update-payment-method) e "Fazer upgrade" (primary, só se Pro — futuramente Business).
- **Estado cancelado**: se `cancel_at_period_end = true`, badge amarelo "Cancelamento agendado", texto com data, botão "Reativar assinatura" (chama reactivate-subscription).
- **Seção Faturas**: nova seção com lista de faturas via get-invoices. Cada fatura: data, valor R$, badge status (paid=verde, open=amarelo, void=cinza), botão download PDF. Skeleton loading. Empty state.
- **Modal cancelamento**: AlertDialog no link "Cancelar assinatura" no rodapé. Título, corpo com data de fim, botões "Manter assinatura" (outline) e "Confirmar cancelamento" (destructive). Toast de confirmação. Atualiza UI sem reload via `queryClient.invalidateQueries`.
- **Toasts de URL params**: adicionar handler para `?payment_updated=true`.

### 5. Manter create-portal-session como fallback

Não remover a Edge Function, apenas remover o botão da UI. Disponível para casos edge.

### Arquivos afetados
- `supabase/functions/cancel-subscription/index.ts` (novo)
- `supabase/functions/reactivate-subscription/index.ts` (novo)
- `supabase/functions/get-invoices/index.ts` (novo)
- `supabase/functions/update-payment-method/index.ts` (novo)
- `supabase/functions/stripe-webhook/index.ts` (edit: sync cancel_at_period_end)
- `supabase/config.toml` (4 novas entries)
- `src/pages/Billing.tsx` (rewrite do estado ativo)
- Migration SQL (1 coluna)

### Sem alterações
- create-checkout-session, stripe-webhook (exceto o campo extra), landing, usePlanLimits, design system

