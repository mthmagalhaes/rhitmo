

## Atualização de Preços de Lançamento — R$49 Pro, R$69 Business

### 1. Edge Functions — Price IDs

**`supabase/functions/create-checkout-session/index.ts`** (linhas 9-12):
- `pro`: `price_1TB0QgIF4fHxJpjHoIlCeHP6` → `price_1TC52fIF4fHxJpjHPaJXH14r`
- `business`: `price_1TB0QgIF4fHxJpjH032DMzZH` → `price_1TCPcjIF4fHxJpjHWtZucdwy`

**`supabase/functions/stripe-webhook/index.ts`** (linhas 3-6):
- Atualizar `PRICE_TO_PLAN` com os novos price IDs (manter os antigos também para compatibilidade com assinaturas existentes)

### 2. Landing Page — `src/pages/Landing.tsx`

- Linha 671: `R$69` → `R$49`
- Linha 703: `R$89` → `R$69`
- Linha 89: `R$267/mês` → `R$207/mês` (3 × R$69)
- Linha 169: `R$267/mo` → `R$207/mo`
- Adicionar badge "Preço de Lançamento" / "Launch Price" nos cards Pro e Business (pill laranja `bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 rounded-full px-3 py-1 text-xs font-medium`)
- Adicionar chaves de tradução: `launchBadge: "Preço de Lançamento"` (pt) / `"Launch Price"` (en)
- Adicionar disclaimer abaixo dos cards: "Preço de lançamento garantido enquanto sua assinatura estiver ativa." / "Launch price guaranteed while your subscription is active."

### 3. Billing Page — `src/pages/Billing.tsx`

- Linha 44: `R$69` → `R$49`
- Linha 60: `R$89` → `R$69`
- Adicionar constante com os novos price IDs para identificar assinaturas com preço de lançamento
- No estado ativo (Pro/Business): se `subscription.stripe_price_id` for um dos novos IDs, exibir badge laranja "Preço de Lançamento"
- No grid Pulse: adicionar badge laranja nos cards Pro e Business

### 4. Arquivos afetados
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `src/pages/Landing.tsx`
- `src/pages/Billing.tsx`

### Sem alterações
- Lógica de trial, cancel, reactivate, update-payment-method
- Layout e design system
- Outras Edge Functions

