

## Atualizar Relatório Técnico (.lovable/plan.md)

### Seções a atualizar

**Seção 3 — Modelo de Dados:**
- `workspaces.plan_tier`: atualizar de `pulse|flow|maestro` para `pulse|pro|business`
- Adicionar tabela `subscriptions` (fonte de verdade para estado de assinatura)

**Seção 5 — Edge Functions:**
- Adicionar funções de billing: `create-checkout-session`, `stripe-webhook`, `create-portal-session`, `cancel-subscription`, `reactivate-subscription`, `get-invoices`, `update-payment-method`
- Adicionar `notify-review-shared`

**Seção 10 — Planos e Limites:**
- Substituir tabela inteira com planos atuais:
  - Pulse (grátis): 3 liderados, 1 time, 20 msgs Mentor Chat
  - Pro (R$49/mês): 5 liderados, 3 times, chat ilimitado, gravação 4h/mês, Meu Rhitmo
  - Business (R$69/mês por líder, mín. 3): 8 liderados, times ilimitados, gravação 8h/mês, HR Dashboard
- Nota: quotas de gravação são apenas marketing (sem validação técnica implementada)
- Nota: Business self-service via `BusinessQuantityDialog` com validação mín. 3 líderes (frontend + edge function)

**Seção 11 — Integrações Externas:**
- Adicionar **Stripe** (Checkout, Customer Portal, Webhooks, Subscriptions)

**Seção 13 — Secrets:**
- Adicionar `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

**Seção 15 — Design System:**
- Adicionar nota sobre Billing page: design Creme/Bento com `rounded-3xl`, `shadow-lg`, badges com cores suaves

**Seção 16 — Convenções:**
- Adicionar: `subscriptions` é fonte de verdade para estado de assinatura (sobrepõe `workspaces.plan_tier`)
- Adicionar: Business requer mínimo 3 líderes (validado em frontend e edge function)
- Adicionar: Trial de 14 dias no plano Pro

### Arquivo modificado
- `.lovable/plan.md`

