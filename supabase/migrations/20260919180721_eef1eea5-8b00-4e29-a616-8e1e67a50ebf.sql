CREATE OR REPLACE FUNCTION public.get_workspace_activation(_days integer DEFAULT 30)
RETURNS TABLE(
  workspace_id uuid,
  workspace_name text,
  is_active boolean,
  leaders integer,
  leaders_with_connector integer,
  members integer,
  notes_total integer,
  notes_from_connector integer,
  leaders_asked_rhitmo integer,
  last_activity_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _since timestamptz := now() - make_interval(days => _days);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH ws_leaders AS (
    SELECT DISTINCT t.workspace_id, t.leader_user_id
    FROM public.teams t
    WHERE t.leader_user_id IS NOT NULL AND t.workspace_id IS NOT NULL
  ),
  ws_members AS (
    SELECT t.workspace_id, count(*)::int AS cnt
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.archived_at IS NULL AND t.workspace_id IS NOT NULL
    GROUP BY t.workspace_id
  ),
  ws_notes AS (
    SELECT
      t.workspace_id,
      count(*)::int AS total,
      count(*) FILTER (
        WHERE f.source IN ('granola', 'fireflies', 'transcription', 'recall_bot', 'slack_ambient')
      )::int AS from_connector,
      max(f.created_at) AS last_at
    FROM public.feedbacks f
    JOIN public.team_members tm ON tm.id = f.member_id
    JOIN public.teams t ON t.id = tm.team_id
    WHERE f.created_at >= _since AND t.workspace_id IS NOT NULL
    GROUP BY t.workspace_id
  )
  SELECT
    w.id,
    w.name,
    w.is_active,
    (SELECT count(*)::int FROM ws_leaders l WHERE l.workspace_id = w.id),
    (SELECT count(*)::int FROM ws_leaders l
      WHERE l.workspace_id = w.id
        AND EXISTS (
          SELECT 1 FROM public.leader_note_taker_connections n
          WHERE n.user_id = l.leader_user_id
        )),
    COALESCE(m.cnt, 0),
    COALESCE(n.total, 0),
    COALESCE(n.from_connector, 0),
    (SELECT count(*)::int FROM ws_leaders l
      WHERE l.workspace_id = w.id
        AND EXISTS (
          SELECT 1 FROM public.chat_threads ct
          WHERE ct.user_id = l.leader_user_id AND ct.created_at >= _since
        )),
    n.last_at
  FROM public.workspaces w
  LEFT JOIN ws_members m ON m.workspace_id = w.id
  LEFT JOIN ws_notes n ON n.workspace_id = w.id
  WHERE EXISTS (SELECT 1 FROM ws_leaders l WHERE l.workspace_id = w.id)
     OR COALESCE(m.cnt, 0) > 0
  ORDER BY COALESCE(n.total, 0) DESC, w.name ASC;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_workspace_activation(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_workspace_activation(integer) TO authenticated;