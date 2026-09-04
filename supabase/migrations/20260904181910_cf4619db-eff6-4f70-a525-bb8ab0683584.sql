CREATE OR REPLACE FUNCTION public.get_note_taker_adoption(_days integer DEFAULT 90)
RETURNS TABLE (
  leader_user_id uuid,
  leader_email text,
  workspace_name text,
  leader_since timestamptz,
  provider text,
  connected_at timestamptz,
  notes_imported integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH leaders AS (
    SELECT DISTINCT ON (t.leader_user_id)
      t.leader_user_id,
      w.name AS workspace_name,
      min(t.created_at) OVER (PARTITION BY t.leader_user_id) AS leader_since
    FROM public.teams t
    LEFT JOIN public.workspaces w ON w.id = t.workspace_id
    WHERE t.leader_user_id IS NOT NULL
    ORDER BY t.leader_user_id, t.created_at ASC
  )
  SELECT
    l.leader_user_id,
    u.email::text,
    l.workspace_name,
    l.leader_since,
    c.provider,
    c.created_at,
    c.notes_imported
  FROM leaders l
  LEFT JOIN auth.users u ON u.id = l.leader_user_id
  LEFT JOIN LATERAL (
    SELECT n.provider, n.created_at, n.notes_imported
    FROM public.leader_note_taker_connections n
    WHERE n.user_id = l.leader_user_id
    ORDER BY n.created_at ASC
    LIMIT 1
  ) c ON true
  WHERE l.leader_since >= now() - make_interval(days => _days)
  ORDER BY l.leader_since DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_note_taker_adoption(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_note_taker_adoption(integer) TO authenticated;