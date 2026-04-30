---
name: Safe Supabase Wrappers
description: Helpers safeRpc/safeFunctionInvoke/safeQuery/tryRpc to avoid PostgrestBuilder .catch crashes and standardize error handling
type: preference
---

Use os wrappers `safeRpc` / `tryRpc` / `safeFunctionInvoke` / `safeQuery` em vez de chamar `supabase.rpc()`, `supabase.functions.invoke()` ou builders diretamente.

**Por quê:** `PostgrestBuilder` é thenable mas NÃO é uma Promise nativa, então `.catch()` direto crasha em runtime (`TypeError: ... .catch is not a function`). Esse foi o bug que travou o vídeo de verificação Google em abril/2026.

**Como aplicar:**

Frontend:
```ts
import { safeRpc, tryRpc, safeFunctionInvoke, safeQuery } from '@/lib/supabaseSafe';

// Em vez de: supabase.rpc('foo').catch(...)  ← CRASHA
const data = await safeRpc('foo', { arg: 1 });

// Best-effort (cleanup, telemetria) — nunca lança:
await tryRpc('cleanup_expired_oauth_states');

// Edge function com extração de erro real do body:
const result = await safeFunctionInvoke('chat-mentor', { message });
```

Edge Functions (Deno):
```ts
import { safeRpc, tryRpc, safeQuery } from '../_shared/safeSupabase.ts';

await tryRpc(admin, 'cleanup_expired_oauth_states');
const teams = await safeQuery(admin.from('teams').select('*'));
```

**Anti-pattern proibido:**
```ts
supabase.rpc('foo').catch(() => {}) // ❌ TypeError em runtime
admin.from('x').insert(y).catch(...) // ❌ idem
```

Localização dos helpers:
- `src/lib/supabaseSafe.ts` (frontend)
- `supabase/functions/_shared/safeSupabase.ts` (Deno)
