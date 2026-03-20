CREATE OR REPLACE FUNCTION public.get_hr_dashboard_metrics(_workspace_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF NOT (
    public.is_admin() OR 
    is_hr_admin_of_workspace(_workspace_id)
  ) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT jsonb_build_object(
    'total_leaders', (
      SELECT COUNT(DISTINCT f.manager_id)
      FROM feedbacks f
      JOIN team_members tm ON tm.id = f.member_id
      JOIN teams t ON t.id = tm.team_id
      WHERE t.workspace_id = _workspace_id
    ),
    'total_members', (
      SELECT COUNT(*) FROM teams t 
      JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id
    ),
    'members_without_recent_feedback', (
      SELECT COUNT(*) FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id
      AND NOT EXISTS (
        SELECT 1 FROM feedbacks f
        WHERE f.member_id = tm.id
        AND f.occurred_at > NOW() - INTERVAL '30 days'
      )
    ),
    'members_without_recent_review', (
      SELECT COUNT(*) FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id
      AND tm.created_at < NOW() - INTERVAL '60 days'
      AND NOT EXISTS (
        SELECT 1 FROM performance_reviews pr
        WHERE pr.member_id = tm.id
        AND pr.created_at > NOW() - INTERVAL '90 days'
      )
    ),
    'sync_completed_count', (
      SELECT COUNT(*) FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id
      AND tm.work_style_data IS NOT NULL
    ),
    'reviews_last_90_days', (
      SELECT COUNT(*) FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      JOIN performance_reviews pr ON pr.member_id = tm.id
      WHERE t.workspace_id = _workspace_id
      AND pr.created_at > NOW() - INTERVAL '90 days'
    ),
    'pdi_coverage_percentage', (
      SELECT CASE WHEN COUNT(DISTINCT tm.id) = 0 THEN 0
        ELSE ROUND(COUNT(DISTINCT dp.member_id)::numeric / COUNT(DISTINCT tm.id) * 100)
      END
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      LEFT JOIN development_plans dp ON dp.member_id = tm.id
      WHERE t.workspace_id = _workspace_id
    ),
    'bias_detected_last_7d', (
      SELECT COUNT(*)
      FROM bias_detections bd
      JOIN team_members tm ON tm.id = bd.member_id
      JOIN teams t ON t.id = tm.team_id
      WHERE t.workspace_id = _workspace_id
      AND bd.created_at > NOW() - INTERVAL '7 days'
    ),
    'notes_per_leader_last_30d', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'manager_id', note_counts.manager_id,
        'note_count', note_counts.cnt,
        'member_count', note_counts.member_cnt
      )), '[]'::jsonb)
      FROM (
        SELECT f.manager_id,
          COUNT(*) as cnt,
          COUNT(DISTINCT f.member_id) as member_cnt
        FROM feedbacks f
        JOIN team_members tm ON tm.id = f.member_id
        JOIN teams t ON t.id = tm.team_id
        WHERE t.workspace_id = _workspace_id
        AND f.occurred_at > NOW() - INTERVAL '30 days'
        GROUP BY f.manager_id
      ) note_counts
    ),
    'sentiment_distribution', (
      SELECT jsonb_build_object(
        'muito_positivo', COUNT(*) FILTER (
          WHERE f.sentiment = 'muito_positivo'),
        'positivo', COUNT(*) FILTER (
          WHERE f.sentiment = 'positivo'),
        'neutro', COUNT(*) FILTER (
          WHERE f.sentiment = 'neutro'),
        'construtivo', COUNT(*) FILTER (
          WHERE f.sentiment = 'construtivo'),
        'critico', COUNT(*) FILTER (
          WHERE f.sentiment = 'critico')
      )
      FROM feedbacks f
      JOIN team_members tm ON tm.id = f.member_id
      JOIN teams t ON t.id = tm.team_id
      WHERE t.workspace_id = _workspace_id
      AND f.occurred_at > NOW() - INTERVAL '30 days'
    )
  ) INTO result;

  RETURN result;
END $function$;