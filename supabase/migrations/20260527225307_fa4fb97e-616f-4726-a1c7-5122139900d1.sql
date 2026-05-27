
-- Centralized workspace admin helper (Owner OR HR Admin OR super-admin).
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.is_admin()
      OR public.is_hr_admin_of_workspace(_workspace_id)
      OR EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE id = _workspace_id
          AND owner_id = public.effective_user_id()
          AND is_active = true
      );
END $$;

GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO authenticated, service_role;

-- 1) get_hr_dashboard_metrics
CREATE OR REPLACE FUNCTION public.get_hr_dashboard_metrics(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  result JSONB;
  v_coverage int;
  v_pdi int;
  v_risk_pct int;
  v_health int;
  v_history jsonb;
BEGIN
  IF NOT public.is_workspace_admin(_workspace_id) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT CASE WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(
      (COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM feedbacks f
        WHERE f.member_id = tm.id AND f.occurred_at > NOW() - INTERVAL '30 days'
      )))::numeric / COUNT(*) * 100
    )
  END INTO v_coverage
  FROM teams t JOIN team_members tm ON tm.team_id = t.id
  WHERE t.workspace_id = _workspace_id;

  SELECT CASE WHEN COUNT(DISTINCT tm.id) = 0 THEN 0
    ELSE ROUND(COUNT(DISTINCT dp.member_id)::numeric / COUNT(DISTINCT tm.id) * 100)
  END INTO v_pdi
  FROM teams t
  JOIN team_members tm ON tm.team_id = t.id
  LEFT JOIN development_plans dp ON dp.member_id = tm.id
  WHERE t.workspace_id = _workspace_id;

  SELECT CASE WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(
      (COUNT(*) FILTER (
        WHERE NOT EXISTS (
          SELECT 1 FROM feedbacks f
          WHERE f.member_id = tm.id AND f.occurred_at > NOW() - INTERVAL '30 days'
        ) AND tm.created_at < NOW() - INTERVAL '30 days'
      ))::numeric / COUNT(*) * 100
    )
  END INTO v_risk_pct
  FROM teams t JOIN team_members tm ON tm.team_id = t.id
  WHERE t.workspace_id = _workspace_id;

  v_health := ROUND(v_coverage * 0.4 + v_pdi * 0.3 + (100 - v_risk_pct) * 0.3);

  WITH weeks AS (SELECT generate_series(0, 3) AS wk),
  weekly AS (
    SELECT w.wk,
      CASE WHEN COUNT(tm.id) = 0 THEN 0
        ELSE ROUND(
          (COUNT(tm.id) FILTER (WHERE EXISTS (
            SELECT 1 FROM feedbacks f
            WHERE f.member_id = tm.id
              AND f.occurred_at > NOW() - ((w.wk + 1) * INTERVAL '7 days')
              AND f.occurred_at <= NOW() - (w.wk * INTERVAL '7 days')
          )))::numeric / COUNT(tm.id) * 100
        )
      END AS coverage
    FROM weeks w
    LEFT JOIN teams t ON t.workspace_id = _workspace_id
    LEFT JOIN team_members tm ON tm.team_id = t.id
    GROUP BY w.wk
  )
  SELECT jsonb_agg(jsonb_build_object('week', wk, 'coverage', coverage) ORDER BY wk DESC) INTO v_history FROM weekly;

  SELECT jsonb_build_object(
    'total_leaders', (SELECT COUNT(DISTINCT leader_user_id) FROM teams WHERE workspace_id = _workspace_id AND leader_user_id IS NOT NULL),
    'total_members', (SELECT COUNT(*) FROM teams t JOIN team_members tm ON tm.team_id = t.id WHERE t.workspace_id = _workspace_id),
    'members_without_recent_feedback', (
      SELECT COUNT(*) FROM teams t JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id
        AND NOT EXISTS (SELECT 1 FROM feedbacks f WHERE f.member_id = tm.id AND f.occurred_at > NOW() - INTERVAL '30 days')
    ),
    'members_without_recent_review', (
      SELECT COUNT(*) FROM teams t JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id
        AND tm.created_at < NOW() - INTERVAL '90 days'
        AND NOT EXISTS (SELECT 1 FROM performance_reviews pr WHERE pr.member_id = tm.id AND pr.created_at > NOW() - INTERVAL '90 days')
    ),
    'sync_completed_count', (
      SELECT COUNT(*) FROM teams t JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id AND tm.skills_data IS NOT NULL
    ),
    'reviews_last_90_days', (
      SELECT COUNT(*) FROM teams t JOIN team_members tm ON tm.team_id = t.id
      JOIN performance_reviews pr ON pr.member_id = tm.id
      WHERE t.workspace_id = _workspace_id AND pr.created_at > NOW() - INTERVAL '90 days'
    ),
    'pdi_coverage_percentage', v_pdi,
    'bias_detected_last_7d', 0,
    'members_at_risk', (
      SELECT COUNT(*) FROM teams t JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id
        AND tm.created_at < NOW() - INTERVAL '30 days'
        AND NOT EXISTS (SELECT 1 FROM feedbacks f WHERE f.member_id = tm.id AND f.occurred_at > NOW() - INTERVAL '30 days')
    ),
    'coverage_percentage', v_coverage,
    'health_score', v_health,
    'coverage_history', COALESCE(v_history, '[]'::jsonb),
    'notes_per_leader_last_30d', COALESCE((
      SELECT jsonb_agg(row_to_json(x))
      FROM (
        SELECT t.leader_user_id AS manager_id,
               COALESCE(au.raw_user_meta_data->>'full_name', au.email) AS manager_name,
               au.email AS manager_email,
               COUNT(f.id) AS note_count,
               COUNT(DISTINCT tm.id) AS member_count
        FROM teams t
        JOIN auth.users au ON au.id = t.leader_user_id
        LEFT JOIN team_members tm ON tm.team_id = t.id
        LEFT JOIN feedbacks f ON f.manager_id = t.leader_user_id AND f.member_id = tm.id AND f.occurred_at > NOW() - INTERVAL '30 days'
        WHERE t.workspace_id = _workspace_id AND t.leader_user_id IS NOT NULL
        GROUP BY t.leader_user_id, au.email, au.raw_user_meta_data
      ) x
    ), '[]'::jsonb),
    'sentiment_distribution', '{}'::jsonb
  ) INTO result;

  RETURN result;
END $function$;

-- 2) get_hr_leaders_overview
CREATE OR REPLACE FUNCTION public.get_hr_leaders_overview(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE result JSONB;
BEGIN
  IF NOT public.is_workspace_admin(_workspace_id) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT COALESCE(jsonb_agg(leader_row), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'leader_id', t.leader_user_id,
      'leader_name', COALESCE(au.raw_user_meta_data->>'full_name', au.email),
      'leader_email', au.email,
      'total_members', COUNT(DISTINCT tm.id),
      'feedbacks_last_30d', COUNT(DISTINCT f30.id),
      'last_feedback_at', MAX(fall.occurred_at),
      'days_since_last_feedback',
        CASE WHEN MAX(fall.occurred_at) IS NULL THEN 999
          ELSE EXTRACT(DAY FROM NOW() - MAX(fall.occurred_at))::INT
        END
    ) AS leader_row
    FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    JOIN auth.users au ON au.id = t.leader_user_id
    LEFT JOIN team_members tm ON tm.team_id = t.id
    LEFT JOIN feedbacks f30 ON f30.manager_id = t.leader_user_id AND f30.member_id = tm.id AND f30.occurred_at > NOW() - INTERVAL '30 days'
    LEFT JOIN feedbacks fall ON fall.manager_id = t.leader_user_id AND fall.member_id = tm.id
    WHERE w.id = _workspace_id AND w.is_active = true AND t.leader_user_id IS NOT NULL
    GROUP BY t.leader_user_id, au.email, au.raw_user_meta_data
  ) sub;

  RETURN jsonb_build_object('leaders', result);
END $function$;

-- 3) get_hr_leader_team — just replace guard
DO $$
DECLARE def text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO def FROM pg_proc WHERE proname='get_hr_leader_team';
  -- noop; will redefine explicitly below
END $$;
