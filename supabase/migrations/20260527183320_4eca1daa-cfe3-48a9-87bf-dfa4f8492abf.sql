CREATE OR REPLACE FUNCTION public.get_workspace_teams_overview(_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  created_at timestamptz,
  leader_user_id uuid,
  leader_name text,
  leader_email text,
  leader_invite_pending boolean,
  member_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _allowed boolean := false;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT (w.owner_id = _caller)
      OR (_caller = ANY (COALESCE(w.hr_admin_ids, '{}'::uuid[])))
      OR is_admin_user(_caller)
    INTO _allowed
  FROM public.workspaces w
  WHERE w.id = _workspace_id;

  IF NOT COALESCE(_allowed, false) THEN
    RAISE EXCEPTION 'not authorized for workspace %', _workspace_id;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.created_at,
    t.leader_user_id,
    COALESCE(
      (SELECT tm.name FROM public.team_members tm
        WHERE tm.linked_user_id = t.leader_user_id LIMIT 1),
      NULLIF(au.raw_user_meta_data->>'full_name', ''),
      NULLIF(au.raw_user_meta_data->>'name', '')
    )::text AS leader_name,
    au.email::text AS leader_email,
    (t.leader_user_id IS NOT NULL
       AND au.id IS NOT NULL
       AND au.email_confirmed_at IS NULL
       AND au.last_sign_in_at IS NULL) AS leader_invite_pending,
    COALESCE((
      SELECT count(*) FROM public.team_members tmc
      WHERE tmc.team_id = t.id AND tmc.archived_at IS NULL
    ), 0) AS member_count
  FROM public.teams t
  LEFT JOIN auth.users au ON au.id = t.leader_user_id
  WHERE t.workspace_id = _workspace_id
  ORDER BY t.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_teams_overview(uuid) TO authenticated;