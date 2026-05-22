
-- 1) Relaxar manage_hr_admin: permite super admin, owner do workspace ou HR Admin existente do mesmo workspace.
CREATE OR REPLACE FUNCTION public.manage_hr_admin(_workspace_id uuid, _user_id uuid, _action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_allowed boolean := false;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = _workspace_id
        AND (
          w.owner_id = v_caller
          OR v_caller = ANY(COALESCE(w.hr_admin_ids, '{}'::uuid[]))
        )
    )
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar HR Admins deste workspace';
  END IF;

  IF _action = 'add' THEN
    UPDATE workspaces
    SET hr_admin_ids = array_append(COALESCE(hr_admin_ids, '{}'::uuid[]), _user_id)
    WHERE id = _workspace_id
      AND NOT (_user_id = ANY(COALESCE(hr_admin_ids, '{}'::uuid[])));
  ELSIF _action = 'remove' THEN
    UPDATE workspaces
    SET hr_admin_ids = array_remove(COALESCE(hr_admin_ids, '{}'::uuid[]), _user_id)
    WHERE id = _workspace_id;
  ELSE
    RAISE EXCEPTION 'Ação inválida: %', _action;
  END IF;
END $function$;

-- 2) Listagem dos HR Admins do workspace com nome/e-mail (somente Owner/HR Admin/super admin podem chamar).
CREATE OR REPLACE FUNCTION public.list_workspace_hr_admins(_workspace_id uuid)
RETURNS TABLE(user_id uuid, email text, full_name text, added_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = _workspace_id
        AND (
          w.owner_id = v_caller
          OR v_caller = ANY(COALESCE(w.hr_admin_ids, '{}'::uuid[]))
        )
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para listar HR Admins deste workspace';
  END IF;

  RETURN QUERY
  SELECT
    uid AS user_id,
    u.email::text,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')::text AS full_name,
    NULL::timestamptz AS added_at
  FROM (
    SELECT UNNEST(COALESCE(w.hr_admin_ids, '{}'::uuid[])) AS uid
    FROM public.workspaces w
    WHERE w.id = _workspace_id
  ) src
  LEFT JOIN auth.users u ON u.id = src.uid;
END $function$;

REVOKE ALL ON FUNCTION public.list_workspace_hr_admins(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_workspace_hr_admins(uuid) TO authenticated;
