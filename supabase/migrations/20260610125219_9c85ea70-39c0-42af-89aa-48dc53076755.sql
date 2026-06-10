CREATE OR REPLACE FUNCTION public.get_workspace_people(p_workspace_id uuid)
RETURNS TABLE (
  user_id uuid,
  member_id uuid,
  full_name text,
  email text,
  avatar_url text,
  roles text[],
  team_id uuid,
  team_name text,
  team_count integer,
  leader_user_id uuid,
  leader_name text,
  status text,
  invite_status text,
  last_activity_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization: only Owner or HR Admin of this workspace can read.
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND w.is_active = true
      AND (
        w.owner_id = auth.uid()
        OR auth.uid() = ANY(COALESCE(w.hr_admin_ids, '{}'::uuid[]))
      )
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH ws AS (
    SELECT w.id, w.owner_id, COALESCE(w.hr_admin_ids, '{}'::uuid[]) AS hr_ids
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
  ),
  -- One row per (user_id, role) source
  src AS (
    -- Owner
    SELECT ws.owner_id AS uid, 'owner'::text AS role, NULL::uuid AS tm_id, NULL::uuid AS team_id
    FROM ws
    UNION ALL
    -- HR Admins
    SELECT unnest(ws.hr_ids) AS uid, 'hr_admin'::text, NULL::uuid, NULL::uuid
    FROM ws
    UNION ALL
    -- Team leaders (distinct per user)
    SELECT DISTINCT t.leader_user_id, 'leader'::text, NULL::uuid, NULL::uuid
    FROM public.teams t
    WHERE t.workspace_id = p_workspace_id
      AND t.leader_user_id IS NOT NULL
    UNION ALL
    -- Linked members (one row per team_members entry with linked user)
    SELECT tm.linked_user_id, 'member'::text, tm.id, tm.team_id
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE t.workspace_id = p_workspace_id
      AND tm.linked_user_id IS NOT NULL
      AND tm.archived_at IS NULL
  ),
  -- Aggregate per user_id
  agg AS (
    SELECT
      s.uid AS u_id,
      array_agg(DISTINCT s.role ORDER BY s.role) AS roles,
      -- Pick a primary team_member row (most recent member entry, if any)
      (array_agg(s.tm_id) FILTER (WHERE s.tm_id IS NOT NULL))[1] AS primary_tm_id,
      (array_agg(s.team_id) FILTER (WHERE s.team_id IS NOT NULL))[1] AS primary_team_id,
      COUNT(DISTINCT s.team_id) FILTER (WHERE s.team_id IS NOT NULL)::int AS team_cnt
    FROM src s
    WHERE s.uid IS NOT NULL
    GROUP BY s.uid
  ),
  -- Linked-user pending invites (team_members with invite_status='pending' and linked_user_id NULL): synthesise pseudo-rows keyed by tm.id
  pending AS (
    SELECT
      NULL::uuid AS u_id,
      tm.id AS tm_id,
      COALESCE(tm.name, tm.email) AS full_name,
      tm.email,
      tm.avatar AS avatar_url,
      ARRAY['member']::text[] AS roles,
      tm.team_id,
      tm.invite_status,
      tm.created_at
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE t.workspace_id = p_workspace_id
      AND tm.linked_user_id IS NULL
      AND tm.archived_at IS NULL
      AND tm.invite_status = 'pending'
  )
  -- Linked users
  SELECT
    a.u_id AS user_id,
    a.primary_tm_id AS member_id,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email) AS full_name,
    u.email::text AS email,
    COALESCE(u.raw_user_meta_data->>'avatar_url', tm.avatar) AS avatar_url,
    a.roles,
    a.primary_team_id AS team_id,
    t.name AS team_name,
    a.team_cnt AS team_count,
    t.leader_user_id,
    (SELECT COALESCE(lu.raw_user_meta_data->>'full_name', lu.email)
       FROM auth.users lu WHERE lu.id = t.leader_user_id) AS leader_name,
    'active'::text AS status,
    NULL::text AS invite_status,
    GREATEST(
      COALESCE(u.last_sign_in_at, 'epoch'::timestamptz),
      COALESCE(tm.updated_at, 'epoch'::timestamptz)
    ) AS last_activity_at,
    COALESCE(tm.created_at, u.created_at) AS created_at
  FROM agg a
  JOIN auth.users u ON u.id = a.u_id
  LEFT JOIN public.team_members tm ON tm.id = a.primary_tm_id
  LEFT JOIN public.teams t ON t.id = a.primary_team_id

  UNION ALL

  -- Pending invites (no auth.users row yet)
  SELECT
    p.u_id,
    p.tm_id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.roles,
    p.team_id,
    t.name,
    1,
    t.leader_user_id,
    (SELECT COALESCE(lu.raw_user_meta_data->>'full_name', lu.email)
       FROM auth.users lu WHERE lu.id = t.leader_user_id),
    'pending_invite'::text,
    p.invite_status,
    p.created_at,
    p.created_at
  FROM pending p
  LEFT JOIN public.teams t ON t.id = p.team_id;
END
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_people(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_workspace_people(uuid) FROM anon, public;