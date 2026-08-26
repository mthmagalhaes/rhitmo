CREATE OR REPLACE FUNCTION public.get_hr_rhythm_overview(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE result JSONB;
BEGIN
  IF NOT public.is_workspace_admin(_workspace_id) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  WITH team_stats AS (
    SELECT
      t.id AS team_id,
      t.name AS team_name,
      t.leader_user_id,
      (SELECT COUNT(*) FROM public.team_members tm
         WHERE tm.team_id = t.id AND tm.archived_at IS NULL) AS total_members,
      (SELECT COUNT(DISTINCT tm.id) FROM public.team_members tm
         WHERE tm.team_id = t.id AND tm.archived_at IS NULL
           AND EXISTS (
             SELECT 1 FROM public.feedbacks f
             WHERE f.member_id = tm.id
               AND f.manager_id = t.leader_user_id
               AND f.occurred_at > NOW() - INTERVAL '30 days'
           )) AS members_with_recent_1on1,
      (SELECT MAX(f.occurred_at) FROM public.feedbacks f
         JOIN public.team_members tm ON tm.id = f.member_id
        WHERE tm.team_id = t.id AND f.manager_id = t.leader_user_id) AS last_feedback_at,
      (SELECT COUNT(*) FROM public.performance_reviews pr
         JOIN public.team_members tm ON tm.id = pr.member_id
        WHERE tm.team_id = t.id
          AND COALESCE(pr.review_type, 'formal') IN ('formal', 'manager')
          AND pr.created_at > NOW() - INTERVAL '12 months') AS formal_reviews_12m
    FROM public.teams t
    JOIN public.workspaces w ON w.id = t.workspace_id
    WHERE w.id = _workspace_id
      AND w.is_active = true
      AND t.leader_user_id IS NOT NULL
  ),
  active_teams AS (
    SELECT * FROM team_stats WHERE total_members > 0
  ),
  per_leader AS (
    SELECT
      ts.leader_user_id,
      SUM(ts.total_members)::int AS total_members,
      SUM(ts.members_with_recent_1on1)::int AS members_with_recent_1on1,
      MAX(ts.last_feedback_at) AS last_feedback_at,
      SUM(ts.formal_reviews_12m)::int AS formal_reviews_12m,
      jsonb_agg(jsonb_build_object('id', ts.team_id, 'name', ts.team_name)
                ORDER BY ts.team_name) AS teams
    FROM active_teams ts
    GROUP BY ts.leader_user_id
  )
  SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'days_since_last_feedback')::int DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'leader_id', pl.leader_user_id,
      'leader_name', COALESCE(au.raw_user_meta_data->>'full_name', au.email),
      'leader_email', au.email,
      'teams', pl.teams,
      'team_count', jsonb_array_length(pl.teams),
      'total_members', pl.total_members,
      'members_with_recent_1on1', pl.members_with_recent_1on1,
      'last_feedback_at', pl.last_feedback_at,
      'days_since_last_feedback', COALESCE(
        EXTRACT(DAY FROM NOW() - pl.last_feedback_at)::int, 999),
      'formal_reviews_12m', pl.formal_reviews_12m
    ) AS row_data
    FROM per_leader pl
    JOIN auth.users au ON au.id = pl.leader_user_id
  ) sub;

  RETURN jsonb_build_object('leaders', result);
END $function$;

GRANT EXECUTE ON FUNCTION public.get_hr_rhythm_overview(uuid) TO authenticated;