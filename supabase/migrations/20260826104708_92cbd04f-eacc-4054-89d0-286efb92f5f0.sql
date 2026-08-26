CREATE OR REPLACE FUNCTION public.get_bot_hours_usage()
RETURNS TABLE (hours_used numeric, hours_cap numeric, paid_seats integer, unlimited boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_ws uuid[];
  v_beta boolean := false;
  v_seats integer := 0;
  v_used numeric := 0;
  v_cap numeric;
BEGIN
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  SELECT array_agg(DISTINCT w.id),
         bool_or(coalesce(w.is_beta_user, false)
                 OR (w.grandfather_until IS NOT NULL AND w.grandfather_until >= current_date)),
         coalesce(max(coalesce(w.paid_seats, 0)), 0)
    INTO v_ws, v_beta, v_seats
  FROM public.workspaces w
  WHERE w.owner_id = v_user
     OR w.id IN (SELECT t.workspace_id FROM public.teams t WHERE t.leader_user_id = v_user);

  IF v_ws IS NULL THEN
    RETURN QUERY SELECT 0::numeric, 4::numeric, 0, false;
    RETURN;
  END IF;

  SELECT coalesce(sum(b.machine_minutes), 0) / 60.0
    INTO v_used
  FROM public.bot_usage_events b
  WHERE b.workspace_id = ANY(v_ws)
    AND b.created_at >= date_trunc('month', now());

  v_cap := CASE WHEN v_seats > 0 THEN v_seats * 4 ELSE 4 END;

  RETURN QUERY SELECT round(v_used, 2), v_cap, v_seats, coalesce(v_beta, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_bot_hours_usage() TO authenticated;