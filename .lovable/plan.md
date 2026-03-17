

## Diagnóstico: `auth.getClaims()` não existe

O método `supabaseAdmin.auth.getClaims(token)` usado em todas as Edge Functions de billing **não é um método válido** do Supabase JS client. Isso causa erro silencioso (provavelmente 500 ou undefined), resultando em resposta "Unauthorized" para toda chamada.

O método correto é `supabase.auth.getUser(token)`.

## Correção

Substituir `getClaims` por `getUser` nas 5 Edge Functions de billing, adaptando a extração de `userId` e `userEmail`:

**Padrão atual (quebrado):**
```typescript
const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
const userId = claimsData.claims.sub;
const userEmail = claimsData.claims.email;
```

**Padrão correto:**
```typescript
const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
if (userError || !user) { return 401; }
const userId = user.id;
const userEmail = user.email;
```

### Arquivos afetados
1. `supabase/functions/create-checkout-session/index.ts`
2. `supabase/functions/update-payment-method/index.ts`
3. `supabase/functions/get-invoices/index.ts`
4. `supabase/functions/cancel-subscription/index.ts`
5. `supabase/functions/reactivate-subscription/index.ts`

### Sem alterações
- Billing.tsx (as chamadas via `supabase.functions.invoke` já passam o Authorization header automaticamente)
- stripe-webhook
- config.toml
- Layout/UI

