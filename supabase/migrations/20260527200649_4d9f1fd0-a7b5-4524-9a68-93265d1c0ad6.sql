
CREATE OR REPLACE FUNCTION public.rls_check_member_access(_member_team_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = _member_team_id
      AND w.is_active = true
      AND (
        t.leader_user_id = effective_user_id()
        OR w.owner_id = effective_user_id()
        OR effective_user_id() = ANY(COALESCE(w.hr_admin_ids, '{}'))
      )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.rls_check_team_access(_team_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = _team_id
      AND w.is_active = true
      AND (
        t.leader_user_id = effective_user_id()
        OR w.owner_id = effective_user_id()
        OR effective_user_id() = ANY(COALESCE(w.hr_admin_ids, '{}'))
      )
  );
END;
$function$;
