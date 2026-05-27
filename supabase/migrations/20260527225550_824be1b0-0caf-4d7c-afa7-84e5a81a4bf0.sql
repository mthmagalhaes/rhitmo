CREATE OR REPLACE FUNCTION public.get_hr_leader_team(_workspace_id uuid, _leader_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.is_workspace_admin(_workspace_id) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT COALESCE(jsonb_agg(member_row), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', tm.id,
      'name', tm.name,
      'email', tm.email,
      'role', tm.role,
      'last_feedback_at', MAX(f.occurred_at),
      'days_since_last_feedback',
        CASE
          WHEN MAX(f.occurred_at) IS NULL THEN 999
          ELSE EXTRACT(DAY FROM NOW() - MAX(f.occurred_at))::INT
        END,
      'pdi_count', COUNT(DISTINCT dp.id),
      'has_sync', (tm.work_style_data IS NOT NULL)
    ) AS member_row
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    JOIN workspaces w ON w.id = t.workspace_id
    LEFT JOIN feedbacks f ON f.member_id = tm.id
    LEFT JOIN development_plans dp ON dp.member_id = tm.id
    WHERE t.workspace_id = _workspace_id
      AND t.leader_user_id = _leader_id
      AND w.is_active = true
    GROUP BY tm.id, tm.name, tm.email, tm.role, tm.work_style_data
    ORDER BY tm.name
  ) sub;

  RETURN jsonb_build_object('members', result);
END $function$;

CREATE OR REPLACE FUNCTION public.get_hr_all_members(_workspace_id uuid, _search text DEFAULT NULL::text, _leader_id uuid DEFAULT NULL::uuid, _has_pdi boolean DEFAULT NULL::boolean, _limit integer DEFAULT 20, _offset integer DEFAULT 0)
 RETURNS TABLE(member_id uuid, member_name text, member_email text, member_role text, leader_id uuid, leader_name text, invite_status text, last_feedback_date timestamp with time zone, days_since_last_feedback integer, pdi_count integer, has_sync boolean, has_skills_map boolean, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
BEGIN
  IF NOT public.is_workspace_admin(_workspace_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE w.id = _workspace_id
    AND w.is_active = true
    AND (_search IS NULL OR tm.name ILIKE '%' || _search || '%' OR tm.email ILIKE '%' || _search || '%')
    AND (_leader_id IS NULL OR t.leader_user_id = _leader_id)
    AND (_has_pdi IS NULL OR
         (_has_pdi = true AND EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)) OR
         (_has_pdi = false AND NOT EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)));

  RETURN QUERY
  SELECT
    tm.id,
    tm.name,
    tm.email,
    tm.role,
    t.leader_user_id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email)::TEXT,
    COALESCE(tm.invite_status, CASE WHEN tm.linked_user_id IS NOT NULL THEN 'accepted' ELSE 'pending' END),
    (SELECT MAX(f.created_at) FROM feedbacks f WHERE f.member_id = tm.id),
    COALESCE(EXTRACT(DAY FROM (now() - (SELECT MAX(f.created_at) FROM feedbacks f WHERE f.member_id = tm.id)))::int, 999),
    (SELECT COUNT(*)::int FROM development_plans dp WHERE dp.member_id = tm.id),
    (tm.work_style_data IS NOT NULL OR tm.chronotype IS NOT NULL OR tm.feedback_style IS NOT NULL),
    (tm.skills_data IS NOT NULL AND jsonb_array_length(COALESCE(tm.skills_data, '[]'::jsonb)) > 0),
    v_total
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  LEFT JOIN auth.users au ON au.id = t.leader_user_id
  WHERE w.id = _workspace_id
    AND w.is_active = true
    AND (_search IS NULL OR tm.name ILIKE '%' || _search || '%' OR tm.email ILIKE '%' || _search || '%')
    AND (_leader_id IS NULL OR t.leader_user_id = _leader_id)
    AND (_has_pdi IS NULL OR
         (_has_pdi = true AND EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)) OR
         (_has_pdi = false AND NOT EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)))
  ORDER BY tm.name
  LIMIT _limit OFFSET _offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_hr_member_profile(_workspace_id uuid, _member_id uuid)
 RETURNS TABLE(member_id uuid, member_name text, member_email text, member_role text, team_id uuid, team_name text, leader_id uuid, leader_name text, invite_status text, linked_user_id uuid, motivators jsonb, user_manual jsonb, chronotype text, feedback_style text, recognition_style text, skills_data jsonb, work_style_data jsonb, created_at timestamp with time zone, feedback_count integer, last_feedback_date timestamp with time zone, pdi_count integer, has_pdi boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_workspace_admin(_workspace_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    tm.id,
    tm.name,
    tm.email,
    tm.role,
    tm.team_id,
    t.name,
    t.leader_user_id,
    COALESCE(p.full_name, lu.email)::text,
    COALESCE(tm.invite_status, CASE WHEN tm.linked_user_id IS NOT NULL THEN 'accepted' ELSE 'pending' END),
    tm.linked_user_id,
    tm.motivators,
    tm.user_manual,
    tm.chronotype,
    tm.feedback_style,
    tm.recognition_style,
    tm.skills_data,
    tm.work_style_data,
    tm.created_at,
    (SELECT COUNT(*)::int FROM feedbacks f WHERE f.member_id = tm.id),
    (SELECT MAX(f.created_at) FROM feedbacks f WHERE f.member_id = tm.id),
    (SELECT COUNT(*)::int FROM development_plans dp WHERE dp.member_id = tm.id),
    EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id AND dp.status IN ('active','approved','in_progress','draft'))
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  LEFT JOIN auth.users lu ON lu.id = t.leader_user_id
  LEFT JOIN profiles p ON p.id = t.leader_user_id
  WHERE tm.id = _member_id
    AND t.workspace_id = _workspace_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_hr_analytics_advanced(_workspace_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.is_workspace_admin(_workspace_id) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT jsonb_build_object(
    'weekly_trend', (
      SELECT COALESCE(jsonb_agg(week_row ORDER BY week_start), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'week_start', gs.week_start::date,
          'week_label', to_char(gs.week_start, 'DD/MM'),
          'count', COALESCE(fc.cnt, 0)
        ) AS week_row, gs.week_start
        FROM generate_series(
          date_trunc('week', NOW() - INTERVAL '11 weeks'),
          date_trunc('week', NOW()),
          '1 week'::interval
        ) AS gs(week_start)
        LEFT JOIN (
          SELECT date_trunc('week', f.occurred_at) AS w, COUNT(*) AS cnt
          FROM feedbacks f
          JOIN team_members tm ON tm.id = f.member_id
          JOIN teams t ON t.id = tm.team_id
          WHERE t.workspace_id = _workspace_id
            AND f.occurred_at > NOW() - INTERVAL '12 weeks'
          GROUP BY 1
        ) fc ON fc.w = gs.week_start
      ) sub
    ),
    'tag_distribution', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('tag', tag, 'count', tag_count)), '[]'::jsonb)
      FROM (
        SELECT unnest(f.tags) AS tag, COUNT(*) AS tag_count
        FROM feedbacks f
        JOIN team_members tm ON tm.id = f.member_id
        JOIN teams t ON t.id = tm.team_id
        WHERE t.workspace_id = _workspace_id
          AND f.occurred_at > NOW() - INTERVAL '30 days'
          AND f.tags IS NOT NULL
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10
      ) sub
    ),
    'at_risk_members', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'member_id', tm.id,
        'member_name', tm.name,
        'member_role', tm.role,
        'leader_id', t.leader_user_id,
        'leader_name', COALESCE(au.raw_user_meta_data->>'full_name', au.email),
        'days_since_feedback', COALESCE(
          EXTRACT(DAY FROM NOW() - (SELECT MAX(f2.occurred_at) FROM feedbacks f2 WHERE f2.member_id = tm.id))::INT,
          999
        ),
        'has_pdi', EXISTS(SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id AND dp.status != 'completed')
      ) ORDER BY COALESCE(
          EXTRACT(DAY FROM NOW() - (SELECT MAX(f3.occurred_at) FROM feedbacks f3 WHERE f3.member_id = tm.id))::INT,
          999
        ) DESC), '[]'::jsonb)
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      JOIN workspaces w ON w.id = t.workspace_id
      LEFT JOIN auth.users au ON au.id = t.leader_user_id
      WHERE t.workspace_id = _workspace_id
        AND w.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM feedbacks f WHERE f.member_id = tm.id AND f.occurred_at > NOW() - INTERVAL '30 days'
        )
    ),
    'engagement_heatmap', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'leader_id', sub.leader_id,
        'leader_name', sub.leader_name,
        'weeks', sub.weeks
      )), '[]'::jsonb)
      FROM (
        SELECT
          t.leader_user_id AS leader_id,
          COALESCE(au.raw_user_meta_data->>'full_name', au.email) AS leader_name,
          (
            SELECT jsonb_agg(jsonb_build_object(
              'week_start', gs.week_start::date,
              'week_label', to_char(gs.week_start, 'DD/MM'),
              'count', COALESCE((
                SELECT COUNT(*)
                FROM feedbacks f
                JOIN team_members tm2 ON tm2.id = f.member_id
                WHERE tm2.team_id = t.id
                  AND f.manager_id = t.leader_user_id
                  AND f.occurred_at >= gs.week_start
                  AND f.occurred_at < gs.week_start + INTERVAL '1 week'
              ), 0)
            ) ORDER BY gs.week_start)
            FROM generate_series(
              date_trunc('week', NOW() - INTERVAL '7 weeks'),
              date_trunc('week', NOW()),
              '1 week'::interval
            ) AS gs(week_start)
          ) AS weeks
        FROM teams t
        JOIN workspaces w ON w.id = t.workspace_id
        JOIN auth.users au ON au.id = t.leader_user_id
        WHERE w.id = _workspace_id
          AND w.is_active = true
          AND t.leader_user_id IS NOT NULL
        GROUP BY t.leader_user_id, t.id, au.raw_user_meta_data, au.email
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$function$;