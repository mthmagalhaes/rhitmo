# Plano: Quitar as 9 Dívidas Técnicas Estruturais da Rhitmo

Vou organizar os 9 itens (excluído o #7 OAuth Google, congelado por verificação) em **4 ondas** ordenadas por **risco × esforço × impacto**. Cada onda é entregável de forma independente — você pode aprovar uma por vez.

A regra é simples: começamos pelo que **previne novos bugs** (baixo esforço, alto blast radius) e terminamos no que **redesenha arquitetura** (alto esforço, alto valor de longo prazo).

---

## ONDA 1 — Blindagem (1-2 dias, zero risco, alto retorno)

Itens da lista: **#6 (safeRpc)**, **#10 (DiceBear → custom SVGs)**, **#5 (CHECK constraints com now())**

### 1.1 `safeRpc` / `safeFunctionInvoke` / `safeQuery` wrappers

Resolve a classe inteira de bugs do tipo `.catch is not a function` (o que travou o vídeo de verificação Google hoje).

- Criar `src/lib/supabaseSafe.ts` com 3 helpers tipados:
  - `safeRpc(name, args)` — chama `supabase.rpc(...)`, faz `await`, normaliza `{data,error}` em throw/return.
  - `safeFunctionInvoke(name, payload)` — idem para `supabase.functions.invoke`, com timeout configurável e mensagem de erro extraída do body.
  - `safeQuery(builder)` — recebe um query builder, executa e normaliza erro.
- Criar `supabase/functions/_shared/safeSupabase.ts` (mesmos helpers para Edge Functions).
- **Migração gradual**: não trocar tudo de uma vez. Adicionar ESLint rule custom (`no-postgrest-catch`) que avisa quando alguém faz `.catch()` direto em builder.
- Migrar imediatamente os **5 hot paths** mais críticos: `useCalendarIntegration`, `AccountContext`, `usePlanLimits`, `chat-mentor`, `google-calendar-oauth`.

### 1.2 Auditoria de CHECK constraints com funções não-imutáveis

- Rodar query no `pg_constraint` listando todos os CHECK que referenciam `now()`, `current_timestamp`, `current_user`.
- Para cada um: dropar o CHECK e criar trigger `BEFORE INSERT/UPDATE` equivalente.
- Documentar em `mem://architecture/check-constraint-policy`.

### 1.3 Eliminar `DiceBear` das poucas referências restantes

- `rg "dicebear"` no projeto, substituir por `MemberAvatar` (sistema custom de 24 SVGs já existente).
- Remover dependência se não usada em mais nada.

**Entregável:** PR único, ~400 linhas, baixíssimo risco. Já blinda contra a próxima Sev-1.

---

## ONDA 2 — Higiene de Schema (2-3 dias, risco médio)

Itens da lista: **#8 (`member_id` nullable inconsistente)**

### 2.1 Resolver ambiguidade de `member_id` em `chat_threads` / `mentor_messages`

Hoje o tipo TS diz NOT NULL mas o schema permite NULL — fonte conhecida de bugs de atribuição (registrada em `mem://technical/schema-discrepancies`).

**Decisão a tomar (pergunto antes de migrar):**

- **Opção A (preferida):** dividir em 2 tabelas: `mentor_threads` (sempre tem `member_id`, contexto de pessoa) + `assistant_threads` (chat genérico do líder, sem membro). Roteamento explícito.
- **Opção B:** manter uma tabela, tornar `member_id` NOT NULL com valor sentinela `'__general__'` (UUID fixo).
- **Opção C:** manter nullable, mas adicionar coluna `thread_kind enum('member','general','onboarding')` obrigatória + check.

Vou recomendar **A** porque alinha com a separação Mentor (com pessoa) vs Assistente (sem pessoa) que o produto já tem na UX.

Plano técnico:

- Migration: criar `assistant_threads` + `assistant_messages`, copiar registros onde `member_id IS NULL`, criar RLS, dropar registros antigos da tabela mentor.
- Frontend: split de `useMentorChat` em `useMentorChat` + `useAssistantChat`.
- Edge Function `chat-mentor` ganha parâmetro `mode: 'mentor'|'assistant'`.

---

## ONDA 3 — Consolidações Arquiteturais (1-2 semanas)

Itens da lista: **#2 (OpenAI direto → AI Gateway)**, **#3 (3 sistemas de notificação → event bus)**, **#1 (80+ Edge Functions → AI router)**

### 3.1 Migrar 100% para Lovable AI Gateway (item #2)

- Auditoria: `rg "api.openai.com|OPENAI_API_KEY"` em `supabase/functions/`. Esperado: ~6-8 funções (`meu-rhitmo`, `extract-text-vision`, `transcribe-audio`, fallbacks).
- Para cada uma: substituir `fetch openai` por chamada ao AI Gateway via `_shared/aiGateway.ts` (helper tipado já parcialmente existente).
- Manter `OPENAI_API_KEY` apenas para **transcribe-audio** (Whisper não está no Gateway) — documentar exceção.
- Remover lógica de fallback duplicada.

### 3.2 Event Bus único para notificações (item #3)

Hoje `_shared/notifications.ts` já tenta ser isso, mas cada feature ainda chama Slack/email/in-app diretamente.

- Criar tabela `events(id, event_type, payload jsonb, workspace_id, target_user_id, created_at, processed_at)`.
- Criar Edge Function `event-dispatcher` (cron 1 min via pg_cron) que lê eventos não-processados e roteia para 3 consumers: `consumer-email`, `consumer-slack`, `consumer-inapp` (já existe como `leader_nudges` insert).
- Refatorar callers: em vez de cada lugar chamar `dispatchNotification()`, fazem `INSERT INTO events`. Atomicidade com transação de domínio.
- Migrar gradualmente — começar por **review-shared / review-acknowledged / weekly-summary** (3 fluxos mais ruidosos hoje).

### 3.3 Consolidar Edge Functions de IA num router (item #1)

80+ funções é muito. Não dá para colapsar tudo, mas dá pra **agrupar por domínio**:

- Criar `ai-router/index.ts` com tasks: `analyze_feedback`, `classify_note`, `generate_review`, `generate_brief`, `generate_nudge`, `coaching_tip`.
- Cada task = um arquivo em `ai-router/tasks/*.ts` (helpers, não functions deployadas).
- **Manter** funções com side effects pesados (recall-webhook, stripe-webhook, slack-bot, OAuth callbacks) — não são "IA pura".
- **Deprecar** após migração: `analyze-feedback`, `analyze-feedback-background`, `reanalyze-feedback`, `classify-note`, `adjust-competency`, `generate-competencies`.
- Compatibilidade: manter funções antigas por 30 dias como proxy que chama o router.

**Atenção:** essa onda mexe em produção crítica. Vou propor feature-flag `USE_AI_ROUTER` por workspace para rollout gradual.

---

## ONDA 4 — Reorganização Estrutural (2-3 semanas, alto impacto enterprise)

Itens da lista: **#4 (Org → Workspace → Team)**, **#9 (ordem de viralização: Slack first)**

### 4.1 Introduzir camada `organizations` acima de `workspaces` (item #4)

Hoje `workspace = company`. Quebra para holdings, multi-BU, agências.

Plano:

- Migration: criar `organizations(id, name, plan_tier, billing_email, created_at)`. 
- Adicionar `organization_id` em `workspaces` (nullable inicialmente). Backfill: para cada workspace existente, criar 1 org com mesmo nome e linkar.
- Mover billing/plan_tier para `organizations` (workspace herda).
- Mover `hr_admin_ids` para escopo opcional `organization` ou `workspace`.
- Criar tabela `memberships(user_id, scope_type enum('org','workspace','team'), scope_id, role, created_at)` — substitui gradualmente `user_roles` + `workspaces.owner_id` + `workspaces.hr_admin_ids` + `teams.leader_user_id`.
- Atualizar `get_account_context` RPC para resolver hierarquia.
- UI: adicionar "Organization Switcher" no AppSidebar (só aparece se user tem ≥2 orgs).

**Risco:** alto. Toca RLS de quase todas as tabelas. Requer plano de teste dedicado e janela de manutenção. Vou propor antes uma **migração shadow** (orgs criadas, mas RLS ainda usa workspace.owner_id) e flip gradual.

### 4.2 Reordenar funil de onboarding viral: Slack-first (item #9)

Mudança de produto, não de código (mas com implicações de UI):

- Na Landing: substituir CTA primário "Conectar Calendar" por "Conectar Slack" para perfil Leader.
- No `Onboarding.tsx` (Leader flow): passo 1 vira Slack OAuth; Recall.ai vira opcional na etapa 4.
- Métricas: instrumentar conversion funnel para validar que a inversão melhora ativação.
- Documentar em `mem://product/onboarding-persona-strategy` (já existe — atualizar).

---

## Ordem de execução proposta

```text
Semana 1     │ Onda 1 (safeRpc + CHECK + DiceBear)
Semana 2     │ Onda 2 (mentor/assistant split)
Semana 3-4   │ Onda 3.1 + 3.2 (AI Gateway + Event Bus)
Semana 5-6   │ Onda 3.3 (AI Router) — feature-flagged
Semana 7-9   │ Onda 4.1 (Organizations) — shadow migration
Semana 10    │ Onda 4.2 (Slack-first onboarding)
```

---

## Detalhes Técnicos (para referência)

**Arquivos novos:**

- `src/lib/supabaseSafe.ts`
- `supabase/functions/_shared/safeSupabase.ts`
- `supabase/functions/_shared/aiGateway.ts` (consolidar)
- `supabase/functions/ai-router/index.ts` + `tasks/*.ts`
- `supabase/functions/event-dispatcher/index.ts`
- `supabase/functions/consumer-{email,slack,inapp}/index.ts`

**Migrations principais:**

- `events` table + indexes em `processed_at`, `event_type`.
- `assistant_threads` + `assistant_messages` + RLS espelhada de `mentor_*`.
- `organizations` + `memberships` + backfill + nova versão de `get_account_context`.
- Conversão de CHECKs com `now()` para triggers.

**Memórias a atualizar/criar:**

- `mem://architecture/safe-supabase-wrappers` (novo)
- `mem://architecture/event-bus-pattern` (novo)
- `mem://architecture/ai-router-pattern` (novo)
- `mem://architecture/organization-workspace-team-hierarchy` (novo)
- `mem://architecture/papeis-e-permissoes` (atualizar para memberships table)

**Riscos & mitigações:**

- Onda 3 e 4 mexem em RLS — toda migration acompanhada de RPC `audit_rls_after_migration()` que confere counts pré/pós.
- Feature flags por workspace antes de rollout global.
- Reversão: cada onda gera migration `_down.sql` testada.

---

## O que preciso de você antes de começar

1. **Aprovar a divisão em 4 ondas** (ou pedir para reordenar).
2. **Decidir sobre #8**: Opção A .
3. **Confirmar que posso começar pela Onda 1 imediatamente** após aprovação (é zero-risco e já previne a próxima Sev-1).
4. **Janela de manutenção** para Ondas 3 e 4 — preferência de horário/dia?
5. Garantir que nenhuma dessas mudanças quebre o sistema atual que está funcional. 

Se aprovar tudo e disser "vai", começo pela Onda 1 já no próximo turno.