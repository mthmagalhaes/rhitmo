

## Diagnóstico: Por que suas reuniões não aparecem

Encontrei **3 problemas** que impedem o funcionamento:

### Problema 1: O card "Próximas 1:1s" não está no dashboard
O componente `UpcomingMeetingsCard` existe mas **não é importado nem renderizado** em nenhuma página. Ele precisa ser adicionado ao dashboard principal (`src/pages/Index.tsx`).

### Problema 2: Autenticação quebrada na Edge Function
A função `fetch-calendar-events` usa `supabase.auth.getClaims(token)` — esse método **não existe** no supabase-js v2. A chamada falha silenciosamente, retornando 401. Precisa ser trocado por `supabase.auth.getUser()`.

### Problema 3: Token do Google expirado (mas tratável)
O token expirou em 8 de abril. O código de refresh automático existe e o `refresh_token` está salvo — ou seja, **não precisa reconectar**. Assim que o Problema 2 for corrigido, o refresh acontecerá automaticamente na próxima chamada.

---

### Plano de correção

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `supabase/functions/fetch-calendar-events/index.ts` | Trocar `getClaims(token)` por `getUser()` para corrigir a autenticação |
| 2 | `src/pages/Index.tsx` | Importar e renderizar `UpcomingMeetingsCard` no dashboard do líder (na grid Bento, ao lado dos cards existentes) |

### Detalhes técnicos

**Fix de autenticação** (fetch-calendar-events):
```typescript
// ANTES (quebrado):
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
const userId = claimsData.claims.sub;

// DEPOIS (correto):
const { data: { user }, error: userError } = await supabase.auth.getUser();
const userId = user.id;
```

**Dashboard** — adicionar o card na seção de conteúdo do líder, posicionado de forma proeminente no layout Bento.

### Sobre reconectar o Google Calendar
**Não é necessário.** O `refresh_token` está salvo. Assim que a autenticação for corrigida, o sistema fará refresh automaticamente e buscará suas reuniões — incluindo a com a Giovanna.

