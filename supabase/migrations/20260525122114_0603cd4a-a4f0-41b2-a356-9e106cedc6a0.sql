
DROP FUNCTION IF EXISTS public.list_workspace_hr_admins(uuid);

CREATE OR REPLACE FUNCTION public.list_workspace_hr_admins(_workspace_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  added_at timestamptz,
  invited_at timestamptz,
  last_sign_in_at timestamptz,
  status text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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
    NULL::timestamptz AS added_at,
    u.invited_at::timestamptz,
    u.last_sign_in_at::timestamptz,
    CASE WHEN u.last_sign_in_at IS NULL THEN 'pending' ELSE 'active' END AS status
  FROM (
    SELECT UNNEST(COALESCE(w.hr_admin_ids, '{}'::uuid[])) AS uid
    FROM public.workspaces w
    WHERE w.id = _workspace_id
  ) src
  LEFT JOIN auth.users u ON u.id = src.uid;
END $function$;
