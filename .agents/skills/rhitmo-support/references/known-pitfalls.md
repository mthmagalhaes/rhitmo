# Known Pitfalls da Rhitmo

Armadilhas recorrentes. Antes de propor fix, confira se o sintoma cai em uma destas.

## Auth / Convites
- **Link de convite "em branco"**: Gmail/antivírus pré-consome o token (one-shot). Solução: reenviar via `invite-hr-admin` `action:'resend'` (usa `generateLink`) OU "Esqueci minha senha" — conta já existe. Ver `mem://auth/invite-link-parameter-compatibility`.
- **Sessão "zumbi"** (`Refresh Token Not Found`): chama `signOut({scope:'local'})` antes de redirecionar. `mem://security/auth-session-zombie-protection`.
- **Múltiplas contas com mesmo email**: orphan `team_members` precisa cleanup; owner do workspace tem precedência. `mem://auth/multi-account-conflict-resolution`.

## RLS
- **Recursão infinita** ao usar função em policy: a função PRECISA ser `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. SQL puro causa recursão. `mem://architecture/rls-recursion-prevention`.
- **`effective_user_id()` sem LIMIT 1**: já corrigido, mas se aparecer policy nova sem `LIMIT 1`, é PII risk. `mem://infrastructure/security-hardening-pii-exposure-fix`.
- **`member_id` nullable no DB** mesmo com TS dizendo `not null`. Sempre coalesce no frontend. `mem://technical/schema-discrepancies`.
- **Resolução de papel**: HR Admin > Leader > Linked Member. Se user é HR e líder ao mesmo tempo, vira HR no contexto. `mem://architecture/role-resolution-priority`.

## Edge Functions
- **Service role sem ownership check**: toda edge que usa `SUPABASE_SERVICE_ROLE_KEY` deve verificar via `auth.getUser()` + checar que o user tem direito sobre o recurso antes de operar. `mem://security/edge-function-ownership-pattern`.
- **`.catch()` direto em builder Supabase**: NÃO funciona como Promise — silencia erro. Use `safeRpc / tryRpc / safeFunctionInvoke / safeQuery` (`@/lib/supabaseSafe` no frontend, `_shared/safeSupabase.ts` no Deno). `mem://architecture/safe-supabase-wrappers`.
- **CORS**: importar de `npm:@supabase/supabase-js@2/cors`, nunca redeclarar `corsHeaders`. Incluir em **todas** as respostas (200 e erro).
- **`verify_jwt`**: default já é `false` em Lovable Cloud. Validar JWT em código com `supabase.auth.getUser()`.

## Slack
- **App Home flood**: `app_home_opened` NÃO deve postar nada. DM vai direto pro LLM. `mem://features/slack/conversational-first`.
- **Comandos com 3s timeout**: responder 200 OK vazio e processar async via `response_url`. `mem://features/slack/technical-architecture`.
- **Welcome DM duplicada**: idempotência via `slack_integrations.welcome_dm_sent_at`. `mem://features/slack/welcome-dm`.
- **Manifest scopes faltando**: AI Assistant precisa `assistant:write`. `mem://features/slack/ai-assistant-container`.

## Performance Reviews
- **Review compartilhada não aparece para o liderado**: checar `status = 'shared'` + RPC `member_view_review` (security definer). `mem://security/performance-reviews-rpc-hardening`.
- **Generate review com citação inventada**: prompt exige `[doc:UUID]` real. Se IA cita sem evidence, é bug no contexto enviado. `mem://ai/performance-reviews/generation-and-formatting-logic`.

## Recall.ai
- **Bot não entra na meeting**: `join_at` precisa ser >= 2min no futuro. `mem://features/recall-ai/bot-transcription-architecture`.
- **Speakers misturados**: usar API v2 `speaker_timeline`, não diarization legacy. `mem://features/recall-ai/multi-member-and-diarization-logic`.

## Datas
- `occurred_at` = quando o fato aconteceu (editável). `created_at` = quando foi registrado (audit, imutável). Filtros temporais ("este mês") usam `occurred_at`. `mem://features/feedback/maquina-do-tempo`.

## i18n
- Locale: user > workspace > browser > pt-BR. Se aparecer chave crua tipo `dashboard.title` na tela, é namespace não carregado. `mem://i18n/implementacao-tecnica`.

## Build / Bundling (Vite)
- **`manualChunks` por lib quebra o boot com tela branca**. Splitar `vendor-react`, `vendor-i18n`, `vendor-radix`, `vendor-charts`, `vendor-tiptap` etc. em chunks nomeados cria ciclos de inicialização entre eles (ex: `vendor-i18n` importa `R as I` de `vendor-react`, e `vendor-react` importa `g as wa` de `vendor-i18n` → no boot `I` é `undefined` → `Cannot read properties of undefined (reading 'createContext')`). Sintomas observados na produção:
  - `Cannot access 'S' before initialization` (variante com `vendor-charts`)
  - `Cannot read properties of undefined (reading 'createContext')` em `vendor-i18n-*.js`
  - Tela 100% branca em `rhitmo.co`, antes de qualquer rota/auth renderizar.
  Fix: **remover o bloco `build.rollupOptions.output.manualChunks` inteiro** do `vite.config.ts` e deixar Rollup/Vite colocar cada lib com a rota que a importa. Nunca splitar vendors React-dependent por nome.
- **Sintoma "plataforma fora do ar" mas Cloud saudável + HTML 200**: é quase sempre bundling/runtime do frontend, não backend. Sequência de triagem:
  1. `curl -sI https://rhitmo.co` → confirma que HTML chega (200).
  2. `supabase--cloud_status` → confirma backend `ACTIVE_HEALTHY`.
  3. Browser console: procurar `Cannot access ... before initialization` ou `Cannot read properties of undefined (reading 'createContext'|'useState'|'forwardRef')` — assinatura de ciclo de chunk.
  4. Diff recente em `vite.config.ts`, `package.json` (deps novas/atualizadas), `src/main.tsx`, `src/i18n/index.ts`.
- **Regra geral**: mudanças em `vite.config.ts` (especialmente `build.rollupOptions`, `optimizeDeps`, `resolve.dedupe`) são **mudanças de produção de altíssimo risco**. Tratar como migration: validar em preview antes, e ter rollback pronto.
