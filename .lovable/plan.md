

## Corrigir Billing.tsx e badge do dashboard para usar `subscriptions` como source of truth

### Billing.tsx

**Problema**: `currentPlan` é derivado de `workspace.plan_tier` (linha 265). A query de subscriptions já existe (linha 241) mas não filtra por status ativo e não é usada para decidir o estado da UI.

**Correções**:

1. **Filtrar subscription por status ativo** — alterar a query de subscriptions para filtrar `.in('status', ['trialing', 'active', 'past_due'])`.

2. **Derivar `currentPlan` da subscription** — substituir a lógica na linha 265:
   - Se `subscription` existe → usar `subscription.plan_tier` como `currentPlan`
   - Se não → `'pulse'`

3. **Habilitar invoices baseado na subscription** — alterar o `enabled` da query de invoices (linha 262) para verificar se `subscription` existe com status ativo, em vez de `workspace.plan_tier`.

4. **Condição de renderização** — a condição `if (currentPlan === 'pro' || currentPlan === 'business')` (que decide entre Estado 1 e Estado 2) já funcionará automaticamente com o `currentPlan` derivado da subscription.

### Index.tsx — Badge do plano no dashboard

**Problema**: O badge usa `limits.planTier` e `limits.planName` do `usePlanLimits` que lê `workspaces.plan_tier` (com tiers antigos flow/maestro). Não podemos alterar `usePlanLimits.ts`.

**Correção**: Adicionar uma query local em `Index.tsx` que busca a subscription ativa do workspace. Substituir o badge (linhas 291-308) para:
- Se subscription ativa existe → mostrar `subscription.plan_tier` capitalizado (+ "· Trial" se trialing)
- Se não → mostrar "Pulse"
- Estilizar: pro → `bg-primary`, business → `bg-foreground text-background`, pulse → `outline`

### Arquivos afetados
- `src/pages/Billing.tsx` — 3 edits pontuais (query filter, currentPlan derivation, invoices enabled)
- `src/pages/Index.tsx` — adicionar query de subscription + substituir badge

### Sem alterações
- usePlanLimits.ts, Edge Functions, design system, outras páginas

