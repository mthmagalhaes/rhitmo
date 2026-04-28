## Problema

A função `public.is_hr_admin_of_workspace(_workspace_id)` usa `auth.uid()` diretamente para verificar se o caller é HR admin de um workspace. Durante uma sessão de impersonação, isso vaza privilégios de HR admin do super-admin real para a sessão impersonada, contornando o padrão `effective_user_id()` adotado em todas as outras funções de controle de acesso.

Tabelas afetadas (policies que dependem dessa função): `mirror_insights`, `slack_ambient_evidence`, `competency_frameworks`, `competencies`, `competency_level_descriptions`, `job_roles`, `role_competencies`, `workspace_slack_settings`, e o bucket de storage `meeting-recordings`.

## Auditoria das demais funções de controle de acesso

Verifiquei via `pg_proc` todas as funções `SECURITY DEFINER` em `public` cujo nome corresponde a controle de acesso (`is_*`, `has_*`, `rls_check_*`, `can_*`):

- `is_hr_admin_of_workspace` — **usa `auth.uid()`** (bug a corrigir).
- `is_workspace_owner_of_member`, `rls_check_member_access`, `rls_check_member_read_access`, `rls_check_team_access`, `rls_check_team_read_access`, `rls_check_workspace_access` — já usam `effective_user_id()`. ✅
- `is_workspace_owner(_user_id, _member_id)`, `is_team_leader(_user_id, _member_id)`, `is_leader_of_team(_user_id, _team_id)`, `is_admin_user(_user_id)` — recebem `_user_id` como parâmetro; o caller decide. Os callers em policies passam `effective_user_id()`. ✅
- `is_admin()` — propositalmente baseada em `auth.uid()` real e retorna `false` durante impersonação (ver memory `admin/impersonation-view-mode`). ✅
- `effective_user_id()` — usa `auth.uid()` propositalmente para resolver impersonação. ✅
- `can_update_own_sync` — não envolve identidade do caller. ✅

Conclusão: somente `is_hr_admin_of_workspace` precisa do fix. Nenhuma RLS policy precisa ser alterada.

## Mudança

Migration substituindo a definição da função:

```sql
CREATE OR REPLACE FUNCTION public.is_hr_admin_of_workspace(_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.effective_user_id() = ANY(
    SELECT unnest(COALESCE(hr_admin_ids, '{}'))
    FROM public.workspaces WHERE id = _workspace_id
  );
END;
$function$;
```

Mesma assinatura, mesma semântica, apenas troca a fonte da identidade — alinha-se ao padrão dos outros `rls_check_*`.

## Validação após aplicar

- HR Admin acessa `/hr` normalmente (sem impersonação ativa, `effective_user_id()` = `auth.uid()`).
- Em impersonação, super-admin **perde** acesso HR herdado de seus próprios workspaces e enxerga apenas o que o usuário impersonado enxergaria.
- Nenhuma RLS policy alterada.
- Nenhuma lógica de negócio alterada.
- Marcar o finding `is_hr_admin_impersonation_bypass` como fixed no scanner.

## Arquivos

- Nova migration: `supabase/migrations/<timestamp>_fix_is_hr_admin_impersonation.sql`