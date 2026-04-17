CREATE OR REPLACE FUNCTION public.admin_cohort_workspaces(p_cohort_month text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- p_cohort_month expected as 'YYYY-MM' (e.g. '2025-11')
  v_month_start := (p_cohort_month || '-01')::timestamptz;
  v_month_end := v_month_start + interval '1 month';

  WITH cohort_workspaces AS (
    SELECT
      w.id AS workspace_id,
      w.name AS workspace_name,
      w.created_at,
      au.email AS owner_email
    FROM workspaces w
    LEFT JOIN auth.users au ON au.id = w.owner_id
    WHERE w.created_at >= v_month_start
      AND w.created_at < v_month_end
  ),
  activity AS (
    SELECT
      cw.workspace_id,
      cw.workspace_name,
      cw.created_at,
      cw.owner_email,
      (
        SELECT COUNT(*)::int FROM feedbacks f
        JOIN team_members tm ON tm.id = f.member_id
        JOIN teams t ON t.id = tm.team_id
        WHERE t.workspace_id = cw.workspace_id
      ) AS feedbacks_count,
      (
        SELECT COUNT(*)::int FROM performance_reviews pr
        JOIN team_members tm ON tm.id = pr.member_id
        JOIN teams t ON t.id = tm.team_id
        WHERE t.workspace_id = cw.workspace_id
      ) AS reviews_count,
      (
        SELECT COUNT(*)::int FROM meeting_transcripts mt
        JOIN team_members tm ON tm.id = mt.member_id
        JOIN teams t ON t.id = tm.team_id
        WHERE t.workspace_id = cw.workspace_id
      ) AS transcripts_count,
      (
        SELECT MIN(ts) FROM (
          SELECT MIN(f.created_at) AS ts FROM feedbacks f
          JOIN team_members tm ON tm.id = f.member_id
          JOIN teams t ON t.id = tm.team_id
          WHERE t.workspace_id = cw.workspace_id
          UNION ALL
          SELECT MIN(pr.created_at) FROM performance_reviews pr
          JOIN team_members tm ON tm.id = pr.member_id
          JOIN teams t ON t.id = tm.team_id
          WHERE t.workspace_id = cw.workspace_id
          UNION ALL
          SELECT MIN(mt.created_at) FROM meeting_transcripts mt
          JOIN team_members tm ON tm.id = mt.member_id
          JOIN teams t ON t.id = tm.team_id
          WHERE t.workspace_id = cw.workspace_id
        ) firsts
      ) AS first_activation_at
    FROM cohort_workspaces cw
  ),
  classified AS (
    SELECT
      a.*,
      CASE
        WHEN a.first_activation_at IS NULL THEN 'not_activated'
        WHEN a.first_activation_at <= a.created_at + interval '1 day' THEN 'd1'
        WHEN a.first_activation_at <= a.created_at + interval '7 days' THEN 'd7'
        WHEN a.first_activation_at <= a.created_at + interval '30 days' THEN 'd30'
        ELSE 'late'
      END AS activation_bucket
    FROM activity a
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'workspace_id', workspace_id,
      'workspace_name', workspace_name,
      'created_at', created_at,
      'owner_email', owner_email,
      'first_activation_at', first_activation_at,
      'activation_bucket', activation_bucket,
      'feedbacks_count', feedbacks_count,
      'reviews_count', reviews_count,
      'transcripts_count', transcripts_count
    )
    ORDER BY
      CASE activation_bucket
        WHEN 'not_activated' THEN 0
        WHEN 'late' THEN 1
        WHEN 'd30' THEN 2
        WHEN 'd7' THEN 3
        WHEN 'd1' THEN 4
      END,
      created_at DESC
  )
  INTO v_result
  FROM classified;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;