# Skill: rhitmo-rls-migration

Skill local em `.agents/skills/rhitmo-rls-migration/` que ensina futuras instâncias do agente a escrever migrations RLS da Rhitmo seguindo os padrões já consolidados — evitando os 5 bugs históricos: GRANT esquecido, recursão de RLS, `effective_user_id()` sem `LIMIT 1`, role em coluna do `profiles`, e ausência de `_assert_rpc_runs()` em migrations críticas de RPC.

## Quando vai disparar
Descrição focada em: "write a Supabase migration that creates/alters tables in public, adds RLS policies, creates SECURITY DEFINER functions, or adds RPCs called from the frontend in the Rhitmo project".

## Estrutura

```
.agents/skills/rhitmo-rls-migration/
├── SKILL.md                       # entrypoint + checklist obrigatório
└── references/
    ├── template-table.md          # template canônico CREATE TABLE + GRANT + RLS + POLICY
    ├── rls-patterns.md            # padrões: workspace isolation, leader/member ownership, has_role, papéis Rhitmo
    └── anti-patterns.md           # bugs recorrentes + como evitar
```

## Conteúdo do SKILL.md (resumo)

**Regras de ouro (não-negociáveis):**
1. Toda `CREATE TABLE public.X` na mesma migration: GRANT → ENABLE RLS → POLICY (ordem fixa)
2. `LANGUAGE plpgsql` + `SECURITY DEFINER` + `SET search_path = public` em toda função usada em RLS
3. Nunca FK para `auth.users` — usar `uuid` solto e validar via `auth.uid()`
4. Role NUNCA em coluna de `profiles`/tabela principal — só em `user_roles` (privilege escalation)
5. `effective_user_id()` sempre com `LIMIT 1` (impersonação retorna múltiplas linhas)
6. RPC chamada do frontend → adicionar `SELECT _assert_rpc_runs('nome_rpc')` no final da migration (memória `architecture/rpc-smoke-assertion`)
7. Workspace isolation: ownership por `leader_user_id` em `teams`, não por workspace owner direto

**Checklist antes de submeter migration:**
- [ ] GRANT presente p/ cada tabela nova (authenticated + service_role; anon só se policy permite)
- [ ] RLS habilitado
- [ ] Pelo menos uma POLICY (sem policy = tabela trancada)
- [ ] Funções em RLS são SECURITY DEFINER + plpgsql + search_path
- [ ] Nenhuma policy faz SELECT na própria tabela (recursão)
- [ ] Se criou RPC pública: `_assert_rpc_runs` no final
- [ ] Se policy referencia `effective_user_id()`: confirmar que a função interna usa LIMIT 1
- [ ] `description` da migration é prosa em PT, sem SQL, sem keywords

## references/template-table.md
Template completo para 3 casos: (a) tabela owned by leader, (b) tabela compartilhada workspace, (c) tabela read-only do liderado vinculado. Inclui trigger `updated_at` padrão.

## references/rls-patterns.md
- Papéis Rhitmo (5: Super Admin, Owner, HR Admin, Leader, Liderado) → ponteiro para `mem://architecture/papeis-e-permissoes`
- Padrão "leader vê seu time": `EXISTS (SELECT 1 FROM team_members WHERE manager_id = auth.uid())`
- Padrão "owner vê tudo no workspace": `is_workspace_owner_of_member(member_id)`
- Padrão "HR admin do workspace": `is_hr_admin_of_workspace(workspace_id)`
- Padrão "liderado vê o próprio": `member_id IN (SELECT id FROM team_members WHERE linked_user_id = auth.uid())`
- Ownership chain em edge function com service_role → ponteiro para `mem://security/edge-function-ownership-pattern`

## references/anti-patterns.md
1. CHECK constraint com `now()` → usar TRIGGER (já no contrato Cloud)
2. Policy recursiva (SELECT da própria tabela) → SECURITY DEFINER function
3. Role em `profiles.role` → `user_roles` + `has_role(uid, role)`
4. `effective_user_id()` interno sem LIMIT 1 → vazamento entre workspaces durante impersonação
5. Esquecer GRANT → "permission denied for table" no Data API
6. FK para `auth.users` → migrações quebram em restore
7. `ALTER DATABASE postgres` → rejeitado pelo Cloud
8. Editar `auth`/`storage`/`realtime`/`supabase_functions`/`vault` → proibido
9. Criar RPC nova sem `_assert_rpc_runs` → frontend quebra em produção sem aviso

## Hand-off
Após gravar os 4 arquivos, chamar `skills--apply_draft` com `.agents/skills/rhitmo-rls-migration`.

## Não inclui
- Não cria migration nova agora — só ensina o processo.
- Não altera RLS de tabela existente.
- Não duplica o que já está em `mem://architecture/papeis-e-permissoes` ou `mem://architecture/rls-recursion-prevention` — referencia.
