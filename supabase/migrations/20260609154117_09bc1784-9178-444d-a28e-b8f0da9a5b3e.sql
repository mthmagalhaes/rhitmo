CREATE OR REPLACE FUNCTION public.admin_workspace_access_audit(p_workspace_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  name text,
  expected_persona text,
  resolved_persona text,
  resolved_role text,
  is_workspace_owner boolean,
  is_team_leader boolean,
  has_linked_member boolean,
  is_consistent boolean,
  notes text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid;
  v_hr uuid[];
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT owner_id, COALESCE(hr_admin_ids, '{}') INTO v_owner_id, v_hr
  FROM public.workspaces WHERE id = p_workspace_id;

  RETURN QUERY
  WITH candidates AS (
    SELECT v_owner_id AS uid WHERE v_owner_id IS NOT NULL
    UNION
    SELECT unnest(v_hr)
    UNION
    SELECT t.leader_user_id FROM public.teams t
    WHERE t.workspace_id = p_workspace_id AND t.leader_user_id IS NOT NULL
    UNION
    SELECT tm.linked_user_id FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE t.workspace_id = p_workspace_id AND tm.linked_user_id IS NOT NULL
  ),
  resolved AS (
    SELECT
      c.uid,
      au.email::text AS email,
      COALESCE((au.raw_user_meta_data->>'full_name'),(au.raw_user_meta_data->>'name'),split_part(au.email,'@',1)) AS name,
      (public.get_account_context(c.uid, au.email::text)) AS ctx
    FROM candidates c
    JOIN auth.users au ON au.id = c.uid
  )
  SELECT
    r.uid,
    r.email,
    r.name,
    CASE
      WHEN r.uid = v_owner_id THEN 'leader'
      WHEN r.uid = ANY(v_hr) THEN 'hr_admin'
      WHEN EXISTS (SELECT 1 FROM public.teams t WHERE t.workspace_id = p_workspace_id AND t.leader_user_id = r.uid) THEN 'leader'
      ELSE 'direct_report'
    END AS expected_persona,
    CASE
      WHEN COALESCE((r.ctx->>'is_workspace_owner')::boolean,false) THEN 'leader'
      WHEN (r.ctx->>'role') = 'hr_admin' AND NOT COALESCE((r.ctx->>'is_team_leader')::boolean,false) THEN 'hr_admin'
      WHEN (r.ctx->>'role') = 'hr_admin' AND COALESCE((r.ctx->>'is_team_leader')::boolean,false) THEN 'leader'
      WHEN (r.ctx->>'role') = 'leader' THEN 'leader'
      WHEN (r.ctx->'linked_member') IS NOT NULL AND (r.ctx->'linked_member')::text <> 'null' THEN 'direct_report'
      ELSE 'user'
    END AS resolved_persona,
    (r.ctx->>'role')::text AS resolved_role,
    COALESCE((r.ctx->>'is_workspace_owner')::boolean,false) AS is_workspace_owner,
    COALESCE((r.ctx->>'is_team_leader')::boolean,false) AS is_team_leader,
    ((r.ctx->'linked_member') IS NOT NULL AND (r.ctx->'linked_member')::text <> 'null') AS has_linked_member,
    (
      CASE
        WHEN r.uid = v_owner_id THEN 'leader'
        WHEN r.uid = ANY(v_hr) THEN 'hr_admin'
        WHEN EXISTS (SELECT 1 FROM public.teams t WHERE t.workspace_id = p_workspace_id AND t.leader_user_id = r.uid) THEN 'leader'
        ELSE 'direct_report'
      END
    ) = (
      CASE
        WHEN COALESCE((r.ctx->>'is_workspace_owner')::boolean,false) THEN 'leader'
        WHEN (r.ctx->>'role') = 'hr_admin' AND NOT COALESCE((r.ctx->>'is_team_leader')::boolean,false) THEN 'hr_admin'
        WHEN (r.ctx->>'role') = 'hr_admin' AND COALESCE((r.ctx->>'is_team_leader')::boolean,false) THEN 'leader'
        WHEN (r.ctx->>'role') = 'leader' THEN 'leader'
        WHEN (r.ctx->'linked_member') IS NOT NULL AND (r.ctx->'linked_member')::text <> 'null' THEN 'direct_report'
        ELSE 'user'
      END
    ) AS is_consistent,
    NULL::text AS notes
  FROM resolved r
  ORDER BY r.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_workspace_access_audit(uuid) TO authenticated, service_role;