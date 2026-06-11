# Padrões de RLS da Rhitmo

## Papéis (5)
Super Admin, Owner, HR Admin, Leader, Liderado. Matriz completa em `mem://architecture/papeis-e-permissoes`. Prioridade de resolução: HR Admin > Leader > Liderado (`mem://architecture/role-resolution-priority`).

## Helpers já existentes (NÃO recrie — use)

| Helper | Quando usar |
|---|---|
| `auth.uid()` | identidade do usuário autenticado |
| `public.effective_user_id()` | usuário "efetivo" considerando impersonação (super admin) |
| `public.has_role(uid, role)` | verifica `user_roles` (super_admin etc.) |
| `public.is_team_leader(team_id, uid)` | líder direto do time |
| `public.is_workspace_owner(workspace_id, uid)` | owner do workspace |
| `public.is_workspace_owner_of_member(member_id)` | owner do workspace do member |
| `public.is_hr_admin_of_workspace(workspace_id, uid)` | HR admin do workspace |

Antes de criar helper novo: `rg "CREATE.*FUNCTION public\." supabase/migrations` para confirmar que não existe.

## Predicados padrão por situação

**Líder vê dados do próprio time:**
```sql
USING (manager_id = auth.uid())
-- ou via team:
USING (EXISTS (
  SELECT 1 FROM public.team_members tm
  WHERE tm.id = member_id AND tm.manager_id = auth.uid()
))
```

**Owner enxerga tudo do workspace dele:**
```sql
USING (public.is_workspace_owner_of_member(member_id))
```

**HR Admin do workspace:**
```sql
USING (public.is_hr_admin_of_workspace(workspace_id, auth.uid()))
```

**Liderado vê o próprio registro:**
```sql
USING (member_id IN (
  SELECT id FROM public.team_members WHERE linked_user_id = auth.uid()
))
```

**Liderado vê SÓ se compartilhado** (Zero Trust default da Rhitmo):
```sql
USING (
  visibility = 'shared'
  AND member_id IN (SELECT id FROM public.team_members WHERE linked_user_id = auth.uid())
)
```

**Super Admin (raramente em RLS de tabela — quase sempre via RPC):**
```sql
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
```

## Composição típica de policies

Para uma tabela de feedbacks do líder visíveis a owner/HR/liderado quando shared:

```sql
CREATE POLICY "Tiered read access"
  ON public.feedbacks FOR SELECT TO authenticated
  USING (
    manager_id = auth.uid()
    OR public.is_workspace_owner_of_member(member_id)
    OR public.is_hr_admin_of_workspace(
         (SELECT workspace_id FROM public.team_members WHERE id = member_id),
         auth.uid()
       )
    OR (visibility = 'shared' AND member_id IN (
         SELECT id FROM public.team_members WHERE linked_user_id = auth.uid()
       ))
  );
```

## Ownership chain em edge function com `service_role`

Service role bypassa RLS, então a edge function precisa validar ownership manualmente ANTES de operar. Padrão em `mem://security/edge-function-ownership-pattern`:

1. `supabase.auth.getUser()` para obter `userId`.
2. Query (com cliente do usuário ou service_role com check explícito) confirmando que `userId` é dono/líder/HR do recurso.
3. Só então usar service_role pra mutação.

## Workspace isolation

Tudo escora em `teams.leader_user_id`. Para validar que o `member_id` pertence ao workspace do `auth.uid()`:

```sql
EXISTS (
  SELECT 1 FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.id = _member_id
    AND t.leader_user_id = auth.uid()
)
```

## Convenções obrigatórias

- `manager_id`, `author_user_id`, `linked_user_id`: `uuid NOT NULL` (ou nullable só se for explicitamente opcional). **Nunca** FK para `auth.users`.
- `member_id`: nullable no schema (apesar do TS); RLS deve tolerar `NULL` ou validar `IS NOT NULL` explicitamente.
- `occurred_at` vs `created_at`: separado quando o evento factual difere do momento da inserção.
- `visibility`: `text` com CHECK `IN ('private','shared')`, default `'private'`.
- `workspace_id`, `team_id`: presentes em tabelas que precisam isolation cross-workspace.
