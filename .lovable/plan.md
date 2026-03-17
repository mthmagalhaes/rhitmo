

## Correção das Edge Functions com base nos logs

### Erros identificados nos logs

1. **update-payment-method**: `Missing required param: currency.`
   - O Stripe API v2025-08-27.basil exige `currency` em sessões de checkout `mode: 'setup'`. Solução: adicionar `currency: 'brl'` na criação da sessão.

2. **create-checkout-session**: `Quantity should not be specified where usage_type is metered. Remove quantity from line_items[0]`
   - Os preços configurados no Stripe são do tipo `metered`, que não aceita `quantity`. Solução: remover o parâmetro `line_items[0][quantity]` da criação da sessão.

### Correções

**`supabase/functions/update-payment-method/index.ts`** (linha 68-73):
- Adicionar `currency: "brl"` ao objeto passado para `stripe.checkout.sessions.create()`

**`supabase/functions/create-checkout-session/index.ts`** (linha 108):
- Remover a linha `"line_items[0][quantity]": String(finalQuantity)` dos params
- Remover a lógica de `finalQuantity` (linhas 55, 46 parcialmente) já que não é usada

### Arquivos afetados
- `supabase/functions/update-payment-method/index.ts`
- `supabase/functions/create-checkout-session/index.ts`

### Sem alterações
- stripe-webhook, Billing.tsx, design system

