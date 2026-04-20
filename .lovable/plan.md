

# Migração suave dos usuários Business legados

## Contexto

Há **1 workspace ativo no plano Business** (`Faster Ops`, sub `sub_1TBhYwIF4fHxJpjHACfKhfQq`, qty=3, R$ 69 × 3 mensal). Outras workspaces usam Pulse/Pro/Trial.

O hook `usePlanLimits` já mapeia `business` → mesmas features de Pro (Infinity em tudo + `hrDashboard: true` + `assistedOnboarding: true`), mas restaram **3 inconsistências** que precisam ser resolvidas para garantir paridade total:

1. **`stripe-webhook/index.ts`**: o `PRICE_TO_PLAN` ainda mapeia preços antigos para a string `"business"`. Ao receber qualquer evento `subscription.updated` desse cliente, o webhook reescreve `workspaces.plan_tier = 'business'`, perpetuando o tier morto.
2. **`schedule-recall-bot/index.ts`**: cap fixo `pro: 20, business: 40`. Como vamos manter o usuário Business como `business` no DB (estratégia abaixo), ele continua com 40 — bom. Mas se algum dia o webhook reclassificar para `pro`, ele perde metade do cap. Vamos alinhar para Infinity em ambos para evitar regressão.
3. **`src/types/team.ts`** e UI admin (`AdminIntelligence`, `RevenueOverview`) ainda mostram coluna Business — isso é informativo (não quebra nada), mas deve continuar exibindo Business legado na visão de admin para visibilidade do super-admin.

## Estratégia escolhida: **Grandfathering silencioso**

Não migramos o tier no DB nem mexemos na assinatura Stripe do cliente. Ele continua como `plan_tier = 'business'` no banco, pagando R$ 69 × 3 = R$ 207/mês. O código já trata `business` com **paridade ou superioridade** em relação ao novo Pro:

| Capacidade        | Pro novo  | Business legado |
|-------------------|-----------|-----------------|
| Liderados/times   | ∞         | ∞               |
| Bot meetings      | ∞         | ∞               |
| HR Dashboard      | ❌        | ✅              |
| Onboarding assist | ❌        | ✅              |

Ou seja: **o cliente Business legado mantém TUDO que tinha + ganha automaticamente o que o novo Pro oferece** (sem ação dele, sem cobrança extra, sem comunicação obrigatória).

## Mudanças de código

### 1. `supabase/functions/stripe-webhook/index.ts`
- Manter `PRICE_TO_PLAN` para os 3 preços antigos do Business → mas mapear para `"business"` (não rebatizar, para preservar o tier legado e o acesso a HR Dashboard).
- Adicionar os **3 novos preços Pro** (quarterly/semiannual/annual) → `"pro"`.
- Comentário explicando: "preços `business` mantidos apenas para grandfathering; novos checkouts usam apenas Pro".

### 2. `supabase/functions/schedule-recall-bot/index.ts`
- Atualizar `BOT_CAPS` para `{ pulse: 0, pro: Infinity, business: Infinity }` — alinhar com `usePlanLimits`.
- Atualizar mensagem de erro: remover menção a "Business" (apenas "Faça upgrade para Pro").

### 3. `src/hooks/usePlanLimits.ts`
- Renomear `planName` do tier `business` de `'Pro'` para `'Pro (Legacy Business)'` — para o cliente ver no Billing que ele tem um plano especial e não estranhar. Alternativa: manter `'Pro'` e adicionar badge "Vitalício" no Billing.

### 4. `src/pages/Billing.tsx`
- Quando `planTier === 'business'`, exibir banner discreto: **"Você é cliente fundador do plano Business. Mantemos todas as suas capacidades originais + os novos recursos do Pro, sem alteração na sua cobrança atual."**
- Esconder o seletor de upgrade para usuários Business (eles já têm o máximo).

### 5. UI admin (read-only)
- Manter visibilidade do tier `business` em `AdminIntelligence` e `RevenueOverview` (para super-admin acompanhar quantos legados restam).

## O que NÃO vamos mexer

- ❌ Não cancelamos a assinatura no Stripe.
- ❌ Não criamos checkout novo para o cliente.
- ❌ Não alteramos `workspaces.plan_tier` no DB via migração.
- ❌ Não removemos o tier `'business'` do tipo TS (quebraria 16 arquivos e a assinatura ativa).

## Arquivos modificados

1. `supabase/functions/stripe-webhook/index.ts` — adicionar novos price IDs Pro
2. `supabase/functions/schedule-recall-bot/index.ts` — alinhar caps
3. `src/hooks/usePlanLimits.ts` — refinar `planName` do business
4. `src/pages/Billing.tsx` — banner de fundador + esconder upgrade
5. `mem://monetization/plan-limits-and-guardrails-v2` — documentar grandfathering

## Validação pós-deploy

- Logar como `Faster Ops` (impersonar): confirmar que vê HR Dashboard, sem limite de membros, sem CTA de upgrade, com banner de fundador.
- Verificar que próximo `invoice.paid` do Stripe mantém `plan_tier = 'business'` no DB.
- Confirmar que novos checkouts Pro caem em `plan_tier = 'pro'` corretamente.

