## Objetivo

Garantir que toda criação ou remoção de liderado dispare automaticamente `update-subscription` (action `sync_seats`), de forma fire-and-forget e silenciosa, para que `paid_seats` no DB e `quantity` no Stripe acompanhem a realidade do workspace. Workspaces grandfathered e sem assinatura ativa continuam no-op (a edge function já trata).

## Helper único

Criar `src/lib/syncStripeSeats.ts`:

```ts
import { safeFunctionInvoke } from './supabaseSafe';

/**
 * Fire-and-forget: dispara recontagem de seats no Stripe após mudança em team_members.
 * Nunca lança — a edge function já trata grandfather/sem-subscription como no-op.
 */
export function syncStripeSeats(): void {
  void safeFunctionInvoke('update-subscription', { action: 'sync_seats' })
    .catch((err) => console.warn('[syncStripeSeats] best-effort failed:', err));
}
```

Padrão de uso (sempre após `await` da operação principal, fora do try/catch que mostra toast):

```ts
const { error } = await supabase.from('team_members').insert({...});
if (error) throw error;
syncStripeSeats(); // fire-and-forget
```

## Sites a instrumentar

INSERT em `team_members`:
1. `src/components/NewMemberDialog.tsx` (~linha 170) — adição manual de liderado pelo líder.
2. `src/pages/Onboarding.tsx` (linhas 170 e 264) — onboarding inicial cria liderados.
3. `src/components/admin/AdminStructure.tsx` (linha 229) — super admin cria membro.
4. `supabase/functions/bulk-onboard/index.ts` (linha 237) — após cada INSERT bem-sucedido OU uma única vez ao final do batch, chamar `update-subscription` via `supabase.functions.invoke` server-to-server (usar fetch direto para a URL da função, com Authorization service role) — preferimos uma chamada por workspace ao final.

DELETE em `team_members`:
5. `src/components/admin/AdminStructure.tsx` (linha 266) — quando `table === 'team_members'`.
6. `src/components/leader/MembersGrid.tsx` (linha 123) — verificar se é delete; se for, instrumentar.
7. `src/components/team/PendingInvitesSection.tsx` (linha 53) — idem.
8. `src/components/EditMemberDialog.tsx` (linha 186) — delete de team_member.
9. `src/pages/lider/Pessoas.tsx` (linha 64) — verificar; instrumentar se for delete.

(Para 6/7/9 confirmar a operação durante a edição — só chamar `syncStripeSeats()` se for de fato INSERT/DELETE de `team_members`.)

`InviteMemberDialog` apenas atualiza `invite_token`/`invite_status` — **não** cria nem remove seats, então não precisa do hook.

## Bulk onboard (edge function)

Em `bulk-onboard/index.ts`, após o loop, fazer **uma única** chamada interna:

```ts
await fetch(`${SUPABASE_URL}/functions/v1/update-subscription`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${userJwt}`, // reaproveitar jwt do request original
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ action: 'sync_seats' }),
}).catch((e) => console.warn('[bulk-onboard] sync_seats failed:', e));
```

Assim evitamos N chamadas para Stripe num batch de 100 usuários.

## Fluxo completo esperado

```text
[UI] Líder clica "Adicionar liderado" no NewMemberDialog
  │
  ▼
supabase.from('team_members').insert({...})  ──▶ Postgres grava nova linha
  │ (ok)
  ▼
syncStripeSeats()  (fire-and-forget, não bloqueia UI)
  │
  ▼
POST /functions/v1/update-subscription  { action: 'sync_seats' }
  │
  ├─ getUser(jwt) → resolve workspace via owner_id
  ├─ se grandfather_until >= hoje  →  noop (early return)
  ├─ se sem subscription ativa     →  noop
  │
  ▼
Stripe: GET /subscriptions/{id}  → pega itemId + price atual
  │
  ▼
COUNT(team_members WHERE workspace_id = X)  →  N
seatsToPay = max(1, N - 3)
  │
  ▼
Stripe: POST /subscriptions/{id}
   items[0][id]=...&items[0][price]=...&items[0][quantity]=seatsToPay
   proration_behavior=create_prorations
  │
  ▼
Stripe responde 200 → workspaces.update({ paid_seats: seatsToPay, seat_cycle })
  │
  ▼
Webhook stripe-webhook (assíncrono) confirma o invoice.updated /
   customer.subscription.updated e re-grava paid_seats (idempotente).
```

Para DELETE o fluxo é idêntico, com seatsToPay menor → Stripe gera proration negativa (crédito) na próxima fatura.

## Validação manual após implementar

1. Criar workspace de teste **não grandfathered** com assinatura ativa em test mode.
2. Adicionar 4º liderado → verificar nos logs da edge `update-subscription` que `seatsToPay = 1`, e em `workspaces.paid_seats = 1`.
3. Adicionar 5º → `paid_seats = 2`.
4. Remover um → `paid_seats = 1`.
5. Repetir num workspace grandfathered → confirmar log `noop: grandfathered` e nenhuma chamada ao Stripe.

## Detalhes técnicos

- Helper usa `safeFunctionInvoke` do `@/lib/supabaseSafe` (regra de projeto: nunca `.catch()` direto em builders).
- Sem loading state, sem toast — silencioso por design.
- Não criar nova tabela nem migração.
- Não tocar em `stripe-webhook` (já idempotente).
- Para edge function `bulk-onboard`, adicionar a chamada uma única vez no fim do request, reutilizando o JWT do usuário.

## Out of scope

- Notificações de cobrança ao usuário (já tratadas pelo Stripe).
- Cron `expire-grandfather` (próximo passo, não bloqueante para go-live).
