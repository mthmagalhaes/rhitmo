
-- RPC: Get HR leaders overview for a workspace
CREATE OR REPLACE FUNCTION public.get_hr_leaders_overview(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF NOT (public.is_admin() OR is_hr_admin_of_workspace(_workspace_id)) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT COALESCE(jsonb_agg(leader_row), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'leader_id', w.owner_id,
      'leader_name', COALESCE(au.raw_user_meta_data->>'full_name', au.email),
      'leader_email', au.email,
      'total_members', COUNT(DISTINCT tm.id),
      'feedbacks_last_30d', COUNT(DISTINCT f30.id),
      'last_feedback_at', MAX(fall.occurred_at),
      'days_since_last_feedback',
        CASE
          WHEN MAX(fall.occurred_at) IS NULL THEN 999
          ELSE EXTRACT(DAY FROM NOW() - MAX(fall.occurred_at))::INT
        END
    ) AS leader_row
    FROM workspaces w
    JOIN auth.users au ON au.id = w.owner_id
    LEFT JOIN teams t ON t.workspace_id = w.id
    LEFT JOIN team_members tm ON tm.team_id = t.id
    LEFT JOIN feedbacks f30 ON f30.manager_id = w.owner_id
      AND f30.member_id = tm.id
      AND f30.occurred_at > NOW() - INTERVAL '30 days'
    LEFT JOIN feedbacks fall ON fall.manager_id = w.owner_id
      AND fall.member_id = tm.id
    WHERE w.id = _workspace_id AND w.is_active = true
    GROUP BY w.owner_id, au.email, au.raw_user_meta_data
  ) sub;

  RETURN jsonb_build_object('leaders', result);
END $function$;

-- RPC: Get team members for a specific leader in a workspace
CREATE OR REPLACE FUNCTION public.get_hr_leader_team(_workspace_id uuid, _leader_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF NOT (public.is_admin() OR is_hr_admin_of_workspace(_workspace_id)) THEN
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
      AND w.owner_id = _leader_id
      AND w.is_active = true
    GROUP BY tm.id, tm.name, tm.email, tm.role, tm.work_style_data
    ORDER BY tm.name
  ) sub;

  RETURN jsonb_build_object('members', result);
END $function$;
