CREATE OR REPLACE FUNCTION public.get_v2_bot_seats(p_workspace_id uuid)
RETURNS TABLE (
  member_id uuid,
  member_name text,
  has_addon boolean,
  basis text,
  hours_cap numeric,
  hours_used numeric,
  trial_hours_used numeric,
  trial_hours_total numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_used numeric;
  v_trial_total numeric := 5;
BEGIN
  IF NOT public.is_workspace_participant(p_workspace_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Sem permissão neste workspace';
  END IF;

  SELECT COALESCE(w.bot_trial_hours_used, 0) INTO v_trial_used
  FROM public.workspaces w WHERE w.id = p_workspace_id;

  RETURN QUERY
  SELECT
    tm.id,
    tm.name,
    (sa.id IS NOT NULL) AS has_addon,
    CASE
      WHEN sa.id IS NOT NULL THEN 'addon'
      WHEN GREATEST(v_trial_total - COALESCE(v_trial_used, 0), 0) > 0 THEN 'trial'
      ELSE 'none'
    END AS basis,
    CASE
      WHEN sa.id IS NOT NULL THEN COALESCE(sa.included_hours, 4)
      ELSE GREATEST(v_trial_total - COALESCE(v_trial_used, 0), 0)
    END AS hours_cap,
    CASE
      WHEN sa.id IS NOT NULL THEN COALESCE((
        SELECT SUM(e.machine_minutes) / 60.0
        FROM public.bot_usage_events e
        WHERE e.member_id = tm.id
          AND e.workspace_id = p_workspace_id
          AND e.created_at >= date_trunc('month', now())
      ), 0)
      ELSE 0
    END AS hours_used,
    COALESCE(v_trial_used, 0) AS trial_hours_used,
    v_trial_total AS trial_hours_total
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  LEFT JOIN LATERAL (
    SELECT s.id, s.included_hours
    FROM public.seat_addons s
    WHERE s.workspace_id = p_workspace_id
      AND s.member_id = tm.id
      AND s.addon_type = 'bot'
      AND s.status = 'active'
    LIMIT 1
  ) sa ON true
  WHERE t.workspace_id = p_workspace_id
    AND COALESCE(tm.is_archived, false) = false
  ORDER BY tm.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_v2_bot_seats(uuid) TO authenticated;