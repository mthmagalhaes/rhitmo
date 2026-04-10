
CREATE OR REPLACE FUNCTION public.get_user_caps()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  owner_of jsonb,
  hr_admin_of jsonb,
  leader_of jsonb,
  member_of jsonb,
  is_super_admin boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    au.id AS user_id,
    au.email::text,
    (au.raw_user_meta_data->>'full_name')::text AS full_name,
    -- Workspaces owned
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', w.id, 'name', w.name))
       FROM workspaces w WHERE w.owner_id = au.id),
      '[]'::jsonb
    ) AS owner_of,
    -- Workspaces where HR admin
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', w.id, 'name', w.name))
       FROM workspaces w WHERE au.id = ANY(COALESCE(w.hr_admin_ids, '{}'))),
      '[]'::jsonb
    ) AS hr_admin_of,
    -- Teams where leader
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('team_id', t.id, 'team_name', t.name, 'workspace_name', w.name))
       FROM teams t JOIN workspaces w ON w.id = t.workspace_id WHERE t.leader_user_id = au.id),
      '[]'::jsonb
    ) AS leader_of,
    -- Team members where linked
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('member_id', tm.id, 'member_name', tm.name, 'team_name', t.name, 'workspace_name', w.name))
       FROM team_members tm JOIN teams t ON t.id = tm.team_id JOIN workspaces w ON w.id = t.workspace_id WHERE tm.linked_user_id = au.id),
      '[]'::jsonb
    ) AS member_of,
    -- Is super admin
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = au.id AND ur.role = 'super_admin'
    ) AS is_super_admin
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$;
