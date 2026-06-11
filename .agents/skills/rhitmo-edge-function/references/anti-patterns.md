# Anti-patterns (bugs já vistos em produção)

## 1. Prompt da Rhitmo inline
```ts
// ❌ ERRADO
const system = "Você é a Rhitmo, parceira de liderança...";
```
Drift garantido entre web e Slack. Toda edição de tom/guardrail passa por `_shared/soul/*.md` (skill `rhitmo-soul-editor`).
```ts
// ✅ CERTO
const system = await composeSystemPrompt({ mode: "mentor", channel: "slack" });
```

## 2. Fetch direto a OpenAI/Anthropic
```ts
// ❌ ERRADO
await fetch("https://api.openai.com/v1/chat/completions", { ... });
```
Sai do gateway → sem accounting, custo errado, sem fallback de modelo. Use `_shared/aiGateway.ts → callAI`.

## 3. `SUPABASE_SERVICE_ROLE_KEY` sem ownership check
```ts
// ❌ ERRADO
const admin = createClient(URL, SERVICE_ROLE);
await admin.from("leader_notes").delete().eq("id", body.id); // QUALQUER usuário pode apagar nota de QUALQUER líder
```
Sempre validar com `userClient` que `auth.uid()` é dono/líder/HR-admin do recurso ANTES de qualquer mutação com service role. Ver `mem://security/edge-function-ownership-pattern`.

## 4. `.catch()` direto em PostgrestBuilder
```ts
// ❌ ERRADO — engole erro e retorna { data: undefined }
const { data } = await supabase.from("x").select("*").catch(() => ({ data: null }));
```
```ts
// ✅ CERTO
const res = await safeQuery(supabase.from("x").select("*"), { context: "read_x" });
if (res.error) { /* tratar */ }
```

## 5. CORS faltando em resposta de erro
```ts
// ❌ ERRADO
return new Response("nope", { status: 500 });
```
Frontend recebe "CORS error" e perde o status real. SEMPRE espalhar `corsHeaders`.

## 6. `console.log` cru
Polui retention (`mem://infrastructure/db-logs-retention`, limpa em 7 dias mas estoura volume). Use `logger.info/error/warn` de `_shared/logger.ts`.

## 7. Trabalho >3s no handler Slack
Slack faz retry automático → mesma DM enviada 2-3x. Sempre:
```ts
EdgeRuntime.waitUntil(processSlackEvent(payload));
return new Response("", { status: 200, headers: corsHeaders });
```

## 8. Subfolders em `supabase/functions/<name>/`
```
supabase/functions/foo/
├── index.ts
└── helpers/util.ts   ❌ não deploya
```
Tudo em `index.ts`, ou extrair pra `_shared/`.

## 9. Editar `supabase/config.toml` só pra `verify_jwt = false`
Já é default no Cloud. Editar só para overrides reais (`import_map`, `verify_jwt = true` explícito).

## 10. `req.json()` sem Zod
Payload inválido → exception não tratada → 500 sem contexto. Sempre `BodySchema.safeParse(await req.json())` com 400 estruturado em falha.

## 11. Chamar edge function por path
```ts
// ❌ ERRADO
await fetch("/api/analyze-feedback", { ... });
```
```ts
// ✅ CERTO
await supabase.functions.invoke("analyze-feedback", { body });
// ou, dentro de outra edge:
await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-feedback`, { ... });
```

## 12. `process.env` em Deno
Não existe. Use `Deno.env.get("VAR")`.

## 13. Importar `src/integrations/supabase/client` em edge function
Contexto frontend, não roda no Deno runtime. Em edge function sempre `createClient` direto de `npm:@supabase/supabase-js@2`.

## 14. Redeclarar `corsHeaders`
```ts
// ❌ ERRADO
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
const corsHeaders = { ... }; // duplicate identifier
```

## 15. FK para `auth.users` em DDL ou orphan check ausente em INSERT
Em SQL: já banido pela skill `rhitmo-rls-migration`. Em edge function: ao inserir registro vinculado a um user, sempre validar antes que o user existe (via `findUserByEmail` ou `auth.admin.getUserById`) — evita órfãos.
