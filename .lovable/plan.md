

## Corrigir Billing.tsx — Nome do plano e features

### Alterações no arquivo `src/pages/Billing.tsx`

**1. Renomear "Starter" para "Pulse"**
- No objeto `PLANS.pulse.name`: `'Starter'` → `'Pulse'`
- No subtítulo do grid de upgrade: `"Você está no plano Starter (gratuito)."` → `"Você está no plano Pulse (gratuito)."`

**2. Atualizar features dos 3 planos**

**Pulse:**
- Features: Até 3 liderados, 20 mensagens de Mentor Chat por mês, Notas e anotações ilimitadas, 1 avaliação formal por mês, 1 time
- Locked: Meu Rhitmo para liderados, Gravação de reuniões, Analytics completo

**Pro:**
- Features: Até 5 liderados, Mentor Chat ilimitado, Notas e anotações ilimitadas, Avaliações formais ilimitadas, Meu Rhitmo para seus liderados, Gravação de reuniões (até 4h/mês), Analytics completo, Até 3 times
- Locked: nenhuma

**Business:**
- Features: Até 8 liderados por líder, Tudo do plano Pro, Times ilimitados, Gravação de reuniões (até 8h/mês), HR Dashboard com métricas agregadas, Onboarding assistido, Suporte prioritário
- Locked: nenhuma

Nenhuma alteração em lógica de checkout, Stripe ou outras páginas.

