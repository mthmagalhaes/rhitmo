
CREATE OR REPLACE FUNCTION public.get_hr_analytics_advanced(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF NOT (public.is_admin() OR public.is_hr_admin_of_workspace(_workspace_id)) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT jsonb_build_object(
    -- Weekly feedback trend (last 12 weeks)
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

    -- Tag distribution (top 10 tags last 30d)
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

    -- Members at risk (>30d without feedback AND no active PDI)
    'at_risk_members', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'member_id', tm.id,
        'member_name', tm.name,
        'member_role', tm.role,
        'leader_id', w.owner_id,
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
      LEFT JOIN auth.users au ON au.id = w.owner_id
      WHERE t.workspace_id = _workspace_id
        AND w.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM feedbacks f WHERE f.member_id = tm.id AND f.occurred_at > NOW() - INTERVAL '30 days'
        )
    ),

    -- Engagement heatmap: leader × week (last 8 weeks)
    'engagement_heatmap', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'leader_id', sub.leader_id,
        'leader_name', sub.leader_name,
        'weeks', sub.weeks
      )), '[]'::jsonb)
      FROM (
        SELECT 
          w.owner_id AS leader_id,
          COALESCE(au.raw_user_meta_data->>'full_name', au.email) AS leader_name,
          (
            SELECT jsonb_agg(jsonb_build_object(
              'week_start', gs.week_start::date,
              'week_label', to_char(gs.week_start, 'DD/MM'),
              'count', COALESCE((
                SELECT COUNT(*)
                FROM feedbacks f
                JOIN team_members tm2 ON tm2.id = f.member_id
                JOIN teams t2 ON t2.id = tm2.team_id
                WHERE t2.workspace_id = _workspace_id
                  AND f.manager_id = w.owner_id
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
        FROM workspaces w
        JOIN auth.users au ON au.id = w.owner_id
        WHERE w.id = _workspace_id AND w.is_active = true
        GROUP BY w.owner_id, au.raw_user_meta_data, au.email
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$function$;
