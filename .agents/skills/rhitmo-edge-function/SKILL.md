---
name: rhitmo-edge-function
description: Create or edit a Supabase Edge Function in the Rhitmo project (supabase/functions/<name>/index.ts) — includes AI calls via Lovable AI Gateway, Slack handlers, cron jobs, RPC wrappers, OAuth callbacks, and any function that uses service_role. Covers CORS, JWT validation, ownership chain, safeSupabase wrappers, soul prompt loader and reuse of _shared/ helpers.
---

# Rhitmo Edge Function

Padrão consolidado para criar ou modificar edge functions em `supabase/functions/<name>/index.ts`. Construído após bugs recorrentes em produção: prompt da Rhitmo inline, `.catch()` direto em PostgrestBuilder, `SUPABASE_SERVICE_ROLE_KEY` sem ownership check, CORS faltando em respostas de erro, Slack timeout por trabalho síncrono >3s e duplicação de helpers que já moram em `_shared/`.

## Regras de ouro (não-negociáveis)

1. **CORS sempre.** `import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'`. NUNCA redeclarar. OPTIONS retorna 200 antes de qualquer lógica. `corsHeaders` presente em TODA resposta (inclusive errors).
2. **JWT obrigatório.** `supabase.auth.getUser()` no cliente que repassa o `Authorization` header do usuário. 401 imediato se inválido. Cron usa `cronAuth.ts` com `x-cron-secret` (sem `getUser`).
3. **Ownership chain antes de service_role.** Nunca operar com `SUPABASE_SERVICE_ROLE_KEY` em dados do usuário sem provar que `auth.uid()` é dono / líder / HR Admin do recurso (`mem://security/edge-function-ownership-pattern`).
4. **Sem `.catch()` em PostgrestBuilder/RPC.** Use `safeRpc / tryRpc / safeQuery / safeFunctionInvoke` de `_shared/safeSupabase.ts` (`mem://architecture/safe-supabase-wrappers`).
5. **AI = Lovable AI Gateway.** Nunca fetch direto a OpenAI/Anthropic. Use `_shared/aiGateway.ts`. Default `google/gemini-2.5-flash`; pro só quando justificado (`mem://monetization/modelo-economico-e-margens-abril-2026`).
6. **Prompt da Rhitmo NUNCA inline.** Use `composeSystemPrompt({ mode, channel, vars })` de `_shared/soul/loader.ts`. Mudança de tom/guardrail começa em `_shared/soul/*.md` via skill `rhitmo-soul-editor` (`mem://ai/soul-centralizada-md`).
7. **Validar input com Zod** (`safeParse`) → 400 estruturado em falha. Nunca confiar em `req.json()` cru.
8. **Logger estruturado** via `_shared/logger.ts`. Sem `console.log` cru — polui retention (`mem://infrastructure/db-logs-retention`).
9. **Trabalho longo → `EdgeRuntime.waitUntil(...)`** após responder. Obrigatório em handler Slack (deadline 3s, senão retry → DM duplicada — `mem://features/slack/technical-architecture`).
10. **Sem subfolders.** Tudo em `supabase/functions/<name>/index.ts` (+ `*_test.ts` opcional). Reutilizável vai pra `_shared/`.
11. **Não tocar `supabase/config.toml`** só pra `verify_jwt = false` — já é default no Cloud. Editar só pra overrides reais (import_map, custom JWT mode).
12. **Sem `process.env`** (Deno) e sem `import` de `src/integrations/supabase/client` (contexto frontend).
13. **Chamada a outra edge function** = `supabase.functions.invoke()` ou URL completa via `Deno.env.get('SUPABASE_URL')`. Nunca `fetch('/api/...')`.

## Checklist pré-submissão

- [ ] `corsHeaders` importado, OPTIONS tratado, presente em TODA resposta (success + error)
- [ ] `supabase.auth.getUser()` chamado (ou `cronAuth` validado) — sem caminho anônimo silencioso
- [ ] Service role só após ownership check explícito
- [ ] Input validado com Zod → 400 estruturado em falha
- [ ] Zero `.catch()` direto em builder/rpc — `safeSupabase` em uso
- [ ] Se chama LLM: via `aiGateway.ts` + `composeSystemPrompt` (sem prompt inline)
- [ ] Sem fetch direto a OpenAI/Anthropic; Slack via helpers
- [ ] Logger estruturado em vez de `console.log` cru
- [ ] Trabalho > 3s embrulhado em `EdgeRuntime.waitUntil`
- [ ] Reutiliza helpers de `_shared/` em vez de duplicar lógica
- [ ] `*_test.ts` para lógica não-trivial

## Por onde começar

| Tarefa | Leia |
|---|---|
| Esqueleto de função autenticada / cron / webhook / AI | `references/template-function.md` |
| Confirmar se helper já existe antes de escrever do zero | `references/shared-helpers.md` |
| Bug ou comportamento estranho | `references/anti-patterns.md` |

Memórias relacionadas:
- `mem://workflow/cto-prompting-standards` — padrões gerais
- `mem://security/edge-function-ownership-pattern` — ownership chain
- `mem://architecture/safe-supabase-wrappers` — safeRpc/safeQuery
- `mem://ai/soul-centralizada-md` — soul loader (toda mudança de prompt)
- `mem://features/slack/technical-architecture` — 3s deadline + waitUntil
- `mem://monetization/modelo-economico-e-margens-abril-2026` — escolha de modelo
