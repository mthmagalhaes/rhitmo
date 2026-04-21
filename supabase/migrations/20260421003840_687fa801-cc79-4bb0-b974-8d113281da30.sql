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
      SELECT COUNT(DISTINCT t.leader_user_id)
      FROM teams t
      WHERE t.workspace_id = _workspace_id
      AND t.leader_user_id IS NOT NULL
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
    'members_at_risk', (
      SELECT COUNT(*) FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id
      AND NOT EXISTS (
        SELECT 1 FROM feedbacks f
        WHERE f.member_id = tm.id
        AND f.occurred_at > NOW() - INTERVAL '30 days'
      )
      AND tm.created_at < NOW() - INTERVAL '30 days'
    ),
    'coverage_percentage', (
      SELECT CASE WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(
          (COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM feedbacks f
            WHERE f.member_id = tm.id
            AND f.occurred_at > NOW() - INTERVAL '30 days'
          )))::numeric / COUNT(*) * 100
        )
      END
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
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
        'manager_name', note_counts.manager_name,
        'manager_email', note_counts.manager_email,
        'note_count', note_counts.cnt,
        'member_count', note_counts.member_cnt
      ) ORDER BY note_counts.cnt DESC), '[]'::jsonb)
      FROM (
        SELECT
          f.manager_id,
          COALESCE(
            (SELECT u.raw_user_meta_data->>'full_name'
             FROM auth.users u WHERE u.id = f.manager_id),
            (SELECT u.raw_user_meta_data->>'name'
             FROM auth.users u WHERE u.id = f.manager_id),
            (SELECT tm2.name FROM team_members tm2
             WHERE tm2.linked_user_id = f.manager_id LIMIT 1),
            (SELECT u.email FROM auth.users u WHERE u.id = f.manager_id),
            'Líder'
          ) AS manager_name,
          (SELECT u.email FROM auth.users u WHERE u.id = f.manager_id) AS manager_email,
          COUNT(*) AS cnt,
          COUNT(DISTINCT f.member_id) AS member_cnt
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
        'muito_positivo', COUNT(*) FILTER (WHERE f.sentiment = 'muito_positivo'),
        'positivo', COUNT(*) FILTER (WHERE f.sentiment = 'positivo'),
        'neutro', COUNT(*) FILTER (WHERE f.sentiment = 'neutro'),
        'construtivo', COUNT(*) FILTER (WHERE f.sentiment = 'construtivo'),
        'critico', COUNT(*) FILTER (WHERE f.sentiment = 'critico')
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