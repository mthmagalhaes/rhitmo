# Skill: rhitmo-edge-function

Skill local em `.agents/skills/rhitmo-edge-function/` que ensina futuras instâncias a criar e modificar Supabase Edge Functions na Rhitmo seguindo os padrões já consolidados, evitando os bugs recorrentes: prompt inline, `.catch()` direto em PostgrestBuilder, falta de ownership chain, CORS quebrado, JWT não validado e duplicação de helpers que já existem em `_shared/`.

## Quando dispara
Descrição focada em: "create or edit a Supabase Edge Function in the Rhitmo project (supabase/functions/<name>/index.ts) — includes AI calls, Slack handlers, cron jobs, RPC wrappers, OAuth callbacks, and service_role mutations".

## Estrutura

```
.agents/skills/rhitmo-edge-function/
├── SKILL.md                       # entrypoint + regras de ouro + checklist
└── references/
    ├── template-function.md       # template canônico (auth + user-client + service-client)
    ├── shared-helpers.md          # mapa de tudo que existe em _shared/ (não recriar)
    └── anti-patterns.md           # bugs recorrentes + como evitar
```

## SKILL.md (resumo)

**Regras de ouro:**
1. **Sempre** importar `corsHeaders` de `npm:@supabase/supabase-js@2/cors` — nunca redeclarar. OPTIONS responde 200 antes de qualquer lógica.
2. **JWT obrigatório** via `supabase.auth.getUser()` (cliente com Authorization header do usuário). 401 imediato se inválido. Cron usa `cronAuth.ts` com `x-cron-secret`.
3. **Ownership chain antes de service_role**: nunca usar `SUPABASE_SERVICE_ROLE_KEY` direto sobre dados do usuário sem checar que `auth.uid()` é dono/líder/HR do recurso (memória `security/edge-function-ownership-pattern`).
4. **Nunca** `.catch()` direto em PostgrestBuilder/RPC — usar `safeRpc/safeQuery/safeFunctionInvoke` do `_shared/safeSupabase.ts`.
5. **AI = Lovable AI Gateway**, não chamar OpenAI/Anthropic diretamente. Usar `_shared/aiGateway.ts` (gemini-2.5-flash default; pro só quando necessário — memória `monetization/modelo-economico-e-margens-abril-2026`).
6. **Prompt da Rhitmo NUNCA inline** — `composeSystemPrompt({ mode, channel, ... })` do `_shared/soul/loader.ts`. Prompt inline = bug (memória `ai/soul-centralizada-md`). Aciona skill `rhitmo-soul-editor`.
7. **Validar input com Zod** antes de processar; 400 com erro claro em validation fail.
8. **CORS em TODA resposta** (incluindo errors). `Content-Type: application/json` quando JSON.
9. **Logger estruturado** via `_shared/logger.ts`; nunca `console.log` cru em produção.
10. **`EdgeRuntime.waitUntil(...)`** para trabalho async pós-resposta (Slack 3s deadline, webhooks idempotentes).
11. **Slack handlers** respondem 200 vazio em <3s; processamento via `waitUntil` + `response_url` (memória `slack/technical-architecture`).
12. **Sem subfolders** em `supabase/functions/<name>/` — tudo em `index.ts` (+ `*_test.ts` opcional). Lógica reutilizável vai pra `_shared/`.
13. **Edge function em `verify_jwt = false`** é o default no Cloud — não tocar `config.toml` por isso. Tocar só pra overrides reais.

**Checklist antes de marcar como pronta:**
- [ ] `corsHeaders` importado, OPTIONS tratado, presente em todas as respostas
- [ ] `supabase.auth.getUser()` chamado (ou `cronAuth` validado) — sem caminho anônimo silencioso
- [ ] Service role só após ownership check explícito
- [ ] Input validado com Zod → 400 estruturado em falha
- [ ] Sem `.catch()` direto em builder/rpc — `safeSupabase` em uso
- [ ] Se chama LLM: via `aiGateway.ts` + `composeSystemPrompt` (não prompt inline)
- [ ] Sem fetch direto a OpenAI/Anthropic/Slack-sem-helper
- [ ] Logger estruturado em vez de console.log cru
- [ ] Trabalho longo embrulhado em `EdgeRuntime.waitUntil`
- [ ] Reutiliza helpers de `_shared/` em vez de duplicar
- [ ] `*_test.ts` quando lógica não-trivial (segue `edge-function-testing`)

## references/template-function.md

Template canônico cobrindo:
- **(a) Endpoint autenticado básico**: CORS → OPTIONS → user-client (Authorization fwd) → `getUser()` → Zod validate → service-client após ownership → resposta.
- **(b) Cron-only**: validação `x-cron-secret` via `cronAuth.ts`, sem `getUser()`.
- **(c) Webhook externo (Slack/Stripe)**: signature verify primeiro, 200 imediato, processamento em `EdgeRuntime.waitUntil`.
- **(d) AI call**: `composeSystemPrompt` + `aiGateway.callAI` + parsing seguro + persistência via safeRpc.

## references/shared-helpers.md

Mapa do que já existe em `supabase/functions/_shared/` (NÃO recriar):
- `aiGateway.ts` — wrapper Lovable AI Gateway (gemini-2.5-flash / pro), token accounting
- `aiPricing.ts` — cálculo de custo por chamada
- `safeSupabase.ts` — `safeRpc / tryRpc / safeQuery / safeFunctionInvoke`
- `logger.ts` — logger estruturado
- `emit.ts` — emissão de eventos para `events` table
- `cronAuth.ts` — validação de `x-cron-secret`
- `notifications.ts` — DM Slack, email pgmq, in-app
- `slackCommands.ts` — registry e payload de slash commands
- `findUserByEmail.ts` — lookup seguro em `auth.users` via service role
- `soul/loader.ts` (+ `soul/*.md`) — `composeSystemPrompt({ mode, channel, vars })`
- `rhy-voice.ts` — `wrapAsRhy()` para mensagens curtas no tom da Rhy
- `briefGenerator.ts` — geração do brief 1:1 (consumido pelo orchestrator)
- `recallParticipants.ts` — parsing do bot Recall.ai
- `quarterlyNudgeHelpers.ts` — janelas trimestrais
- `featureFlags.ts` — feature flags por workspace
- `email-templates/`, `transactional-email-templates/` — React Email

## references/anti-patterns.md

1. **Prompt inline** em vez de `composeSystemPrompt` → drift web↔slack, viola memória central.
2. **Fetch direto a OpenAI/Anthropic** → custo errado, sem accounting, fora do gateway.
3. **`SUPABASE_SERVICE_ROLE_KEY` sem ownership check** → vazamento entre workspaces; sempre validar `auth.uid()` vs recurso antes.
4. **`.catch()` em PostgrestBuilder** → engole erro real, retorna `{ data: undefined }` silencioso. Use `safeRpc/safeQuery`.
5. **CORS faltando em response de erro** → frontend recebe "CORS error" e mascara o 500.
6. **`console.log` cru** → poluição do log retention (memória `infrastructure/db-logs-retention`); use `logger.ts`.
7. **Trabalho > 3s sem `waitUntil` em handler Slack** → Slack faz retry → DM duplicada.
8. **FK para `auth.users` em INSERT** → não acontece em SQL, mas em edge function inserir sem checar usuário ativo → órfãos.
9. **Subfolder em `supabase/functions/<name>/`** → não deployam; tudo em `index.ts`.
10. **Modificar `supabase/config.toml` só pra `verify_jwt = false`** → default já é esse no Cloud.
11. **Esquecer Zod / aceitar `req.json()` cru** → 500 em payload inválido; sempre `safeParse`.
12. **Chamar edge function por path** (`fetch('/api/x')`) → use `supabase.functions.invoke()` ou URL completa com `VITE_SUPABASE_PROJECT_ID`.
13. **`process.env`** → não existe em Deno; use `Deno.env.get(...)`.
14. **Importar `src/integrations/supabase/client`** → contexto frontend, não roda em edge function.

## Hand-off
Após gravar os 4 arquivos, `skills--apply_draft .agents/skills/rhitmo-edge-function`.

## Não inclui
- Não cria edge function nova agora.
- Não migra funções com prompt inline (skill `rhitmo-soul-editor` já cobre).
- Não duplica regras já em `cto-prompting-standards` — referencia.
