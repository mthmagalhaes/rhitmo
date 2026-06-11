---
name: rhitmo-rls-migration
description: Write Supabase migrations for the Rhitmo project — create or alter tables in public schema, add Row Level Security policies, create SECURITY DEFINER functions, or add RPCs called from the frontend. Use whenever editing files under supabase/migrations/ or planning a schema/RLS change.
---

# Rhitmo RLS Migration

Migrations da Rhitmo seguem um padrão estrito construído após muitos bugs de produção (vazamento entre workspaces, recursão de RLS, GRANT esquecido, privilege escalation via `profiles.role`). Esta skill compila esses padrões.

## Regras de ouro (não-negociáveis)

1. **GRANT obrigatório.** Toda `CREATE TABLE public.X` na MESMA migration, nesta ordem: `CREATE TABLE` → `GRANT` → `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` → `CREATE POLICY`. Sem GRANT = Data API retorna "permission denied".
2. **Função em RLS = `LANGUAGE plpgsql` + `SECURITY DEFINER` + `SET search_path = public`**. Sem isso, recursão ou search_path injection.
3. **Nunca FK para `auth.users`.** Use `uuid` solto e valide via `auth.uid()`. FKs para `auth.*` quebram em restore.
4. **Role NUNCA em coluna de `profiles`/tabela principal.** Apenas em `user_roles`. Use `has_role(uid, role)` security definer. Senão: privilege escalation trivial.
5. **`effective_user_id()` SEMPRE com `LIMIT 1` internamente.** Impersonação retorna múltiplas linhas → vazamento entre workspaces (`mem://infrastructure/security-hardening-pii-exposure-fix`).
6. **RPC chamada do frontend → `SELECT _assert_rpc_runs('nome_rpc');` no final da migration.** Smoke test que falha o deploy se a RPC não roda (`mem://architecture/rpc-smoke-assertion`).
7. **Workspace isolation por `leader_user_id` em `teams`**, não por workspace owner direto (`mem://architecture/workspace-company-model`).
8. **Schemas proibidos**: `auth`, `storage`, `realtime`, `supabase_functions`, `vault`. Não criar triggers neles.
9. **Sem `ALTER DATABASE postgres ...`** — rejeitado pelo Cloud.
10. **CHECK constraint com `now()` é proibido** — use TRIGGER (Postgres exige CHECK imutável).

## Checklist antes de submeter

- [ ] GRANT presente p/ cada tabela nova (`authenticated` + `service_role`; `anon` só se policy permite anônimo)
- [ ] `ENABLE ROW LEVEL SECURITY` em toda tabela nova
- [ ] Pelo menos uma POLICY por operação esperada (sem POLICY = tabela trancada mesmo com GRANT)
- [ ] Funções referenciadas em RLS são SECURITY DEFINER + plpgsql + search_path = public
- [ ] Nenhuma policy faz SELECT na própria tabela (recursão) → use security definer
- [ ] Se criou RPC chamada do frontend: `_assert_rpc_runs` no final
- [ ] Se policy usa `effective_user_id()`: já existente, não recriar; confirmar internamente `LIMIT 1`
- [ ] `description` da migration é prosa em PT, sem SQL, sem keywords (SELECT/INSERT/UPDATE/DELETE/GRANT)
- [ ] Não tocou `auth.*`, `storage.*`, `realtime.*`

## Por onde começar

| Tarefa | Leia primeiro |
|---|---|
| Criar tabela nova (líder, workspace ou liderado-readable) | `references/template-table.md` |
| Escolher predicado da policy / saber qual helper usar | `references/rls-patterns.md` |
| Bug ou comportamento estranho em produção | `references/anti-patterns.md` |

Memórias relacionadas (leia se a mudança tocar nesses domínios):
- `mem://architecture/papeis-e-permissoes` — 5 papéis e matriz de permissões
- `mem://architecture/rls-recursion-prevention` — security definer para evitar recursão
- `mem://architecture/role-resolution-priority` — HR Admin > Leader > Liderado
- `mem://security/edge-function-ownership-pattern` — ownership chain antes de service_role
- `mem://architecture/rpc-smoke-assertion` — `_assert_rpc_runs` em RPC pública
