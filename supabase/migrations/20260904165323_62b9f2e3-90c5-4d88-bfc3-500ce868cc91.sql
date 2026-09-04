DROP FUNCTION IF EXISTS public.get_v2_bot_seats(uuid);

CREATE OR REPLACE FUNCTION public.get_v2_bot_seats(p_workspace_id uuid)
 RETURNS TABLE(member_id uuid, member_name text, has_addon boolean, basis text, hours_cap numeric, hours_used numeric, trial_hours_used numeric, trial_hours_total numeric, is_grandfathered boolean, grandfather_until date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trial_used numeric;
  v_trial_total numeric := 5;
  v_gf date;
  v_is_gf boolean;
BEGIN
  IF NOT public.is_workspace_participant(p_workspace_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Sem permissão neste workspace';
  END IF;

  SELECT COALESCE(w.bot_trial_hours_used, 0), w.grandfather_until
    INTO v_trial_used, v_gf
  FROM public.workspaces w WHERE w.id = p_workspace_id;

  v_is_gf := v_gf IS NOT NULL AND v_gf >= CURRENT_DATE;

  RETURN QUERY
  SELECT
    tm.id,
    tm.name,
    (sa.id IS NOT NULL) AS has_addon,
    CASE
      WHEN v_is_gf THEN 'grandfathered'
      WHEN sa.id IS NOT NULL THEN 'addon'
      WHEN GREATEST(v_trial_total - COALESCE(v_trial_used, 0), 0) > 0 THEN 'trial'
      ELSE 'none'
    END AS basis,
    CASE
      WHEN v_is_gf THEN 0::numeric
      WHEN sa.id IS NOT NULL THEN COALESCE(sa.included_hours, 4)
      ELSE GREATEST(v_trial_total - COALESCE(v_trial_used, 0), 0)
    END AS hours_cap,
    CASE
      WHEN sa.id IS NOT NULL OR v_is_gf THEN COALESCE((
        SELECT SUM(e.machine_minutes) / 60.0
        FROM public.bot_usage_events e
        WHERE e.member_id = tm.id
          AND e.workspace_id = p_workspace_id
          AND e.created_at >= date_trunc('month', now())
      ), 0)
      ELSE 0
    END AS hours_used,
    COALESCE(v_trial_used, 0) AS trial_hours_used,
    v_trial_total AS trial_hours_total,
    v_is_gf AS is_grandfathered,
    v_gf AS grandfather_until
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
    AND tm.archived_at IS NULL
  ORDER BY tm.name;
END;
$function$;