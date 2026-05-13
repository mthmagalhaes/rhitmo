## O que encontrei

**Cobrança de 30/04 em matheus.magalhaes@fstr.co**
- Cliente Stripe: `cus_U9JsFzXCJwkPXH`
- Subscription **ativa**: `sub_1TBhYwIF4fHxJpjHACfKhfQq`
  - Produto: "Rhitmo Business (Licensed)" × 3
  - Preço: `price_1TCQf0IF4fHxJpjH4Bx2aIbg` (R$ 69/seat/mês, BRL)
  - Próxima fatura: 30/mai (R$ 0,00 — provável crédito ou cupom aplicado, mas a sub continua existindo e voltará a cobrar quando o crédito acabar)
- Cobranças passadas: R$ 69,00 em 30/mar e R$ 133,56 em 30/abr (proration).

**Workspace dele no banco** (`Faster Ops`, owner_id=`79a6f679...`)
- `grandfather_until = 2026-11-08` → marcado como Early Adopter até nov/2026
- `paid_seats = 0`, `plan_tier = business` (legado)
- Teams: 5 times com 6 liderados no total

**Por que a cobrança ainda está rolando**
A subscription foi criada **antes** do grandfather ser aplicado. O grandfather hoje só:
- bloqueia novos checkouts (`create-checkout-session` retorna no-op),
- bloqueia `update-subscription` (sync_seats vira no-op).

Mas a subscription antiga **não é cancelada automaticamente**, então o Stripe continua faturando até o cartão quebrar ou alguém cancelar manualmente.

---

## Fluxo de cobrança atual (resposta à 2ª pergunta)

Hoje o modelo é **per-seat com 3 seats grátis**, definido em:
- `src/hooks/usePlanLimits.ts` → `FREE_SEATS = 3`
- `supabase/functions/create-checkout-session/index.ts` → `seatsToPay = max(1, total − 3)`
- `supabase/functions/update-subscription/index.ts` → recalcula quantity sempre que `team_members` muda
- `src/lib/syncStripeSeats.ts` → disparado em INSERT/DELETE de `team_members` (`NewMemberDialog`, etc.)

Comportamento por situação:

| Situação | O que acontece |
|---|---|
| Workspace novo com até 3 liderados | Sem checkout, sem cartão, sem cobrança |
| Adiciona o 4º liderado | `usePlanLimits.needsSeatPurchase=true` → UI abre `SeatPurchaseModal` → `create-checkout-session` → Stripe Checkout pede cartão → webhook grava `paid_seats` e cria `subscription` |
| Remove liderado depois de pagar | `syncStripeSeats()` chama `update-subscription` → diminui quantity com proration |
| Workspace com `grandfather_until` no futuro | Checkout bloqueado, sync no-op → uso liberado **sem** cobrança |

Então o fluxo desejado ("só cobra se ultrapassar o free e exigir cartão") **já está implementado**. O problema é específico da subscription legada do `matheus.magalhaes@fstr.co`, que precisa ser encerrada manualmente.

---

## Plano de ação

### 1. Cancelar a subscription residual no Stripe
Cancelar `sub_1TBhYwIF4fHxJpjHACfKhfQq` via `stripe--cancel_subscription` (cancelamento imediato — como a próxima fatura é R$ 0,00 e a intenção é não cobrar mais nada, não precisa esperar o fim do ciclo).

### 2. Refletir no banco
Migration para marcar a row em `public.subscriptions` desse workspace como `status='canceled'` e zerar `paid_seats` (já está 0, mas garantir consistência):
```sql
update public.subscriptions
   set status = 'canceled',
       canceled_at = now()
 where stripe_subscription_id = 'sub_1TBhYwIF4fHxJpjHACfKhfQq';

update public.workspaces
   set paid_seats = 0
 where id = '27ee8977-d538-482f-a9a7-7a4363b89e5e';
```

### 3. Verificar
- `stripe--list_subscriptions` em `cus_U9JsFzXCJwkPXH` → deve voltar vazio/`canceled`.
- O `grandfather_until = 2026-11-08` permanece, então mesmo que ele adicione mais liderados não vai abrir checkout até lá.

### 4. Não-objetivos
- **Não** alterar o fluxo geral de seats (já funciona como o usuário quer).
- **Não** mexer em outros workspaces.
- **Não** emitir refund das cobranças passadas (R$ 69 + R$ 133,56) — isso é decisão de negócio; se quiser, faço em passo separado depois de confirmar.

---

## Risco

Se em algum momento o `grandfather_until` for removido, ele voltará a cair na regra `FREE_SEATS=3` e precisaria pagar a partir do 4º liderado (hoje tem 6). Vale lembrar disso quando a data se aproximar.
