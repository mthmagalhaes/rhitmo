CREATE OR REPLACE FUNCTION public.detect_network_signals(_window_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rows integer := 0;
BEGIN
  DELETE FROM public.network_signals
  WHERE window_days = _window_days
    AND detected_on = current_date;

  WITH per_member AS (
    SELECT
      e.workspace_id,
      m.member_id,
      count(DISTINCT m.partner_id) AS partners,
      sum(e.weight_total) AS weight
    FROM public.team_network_edges e
    CROSS JOIN LATERAL (
      VALUES (e.member_a_id, e.member_b_id), (e.member_b_id, e.member_a_id)
    ) AS m(member_id, partner_id)
    WHERE e.window_days = _window_days
    GROUP BY 1, 2
  ),
  ws_stats AS (
    SELECT workspace_id,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY partners) AS median_partners,
           count(*) AS n_members
    FROM per_member
    GROUP BY 1
  ),
  prev AS (
    SELECT
      e.workspace_id,
      m.member_id,
      count(DISTINCT m.partner_id) AS partners
    FROM public.team_network_edges e
    CROSS JOIN LATERAL (
      VALUES (e.member_a_id, e.member_b_id), (e.member_b_id, e.member_a_id)
    ) AS m(member_id, partner_id)
    WHERE e.window_days = 90
    GROUP BY 1, 2
  ),
  scored AS (
    SELECT
      pm.workspace_id,
      pm.member_id,
      t.leader_user_id,
      pm.partners,
      pm.weight,
      s.median_partners,
      s.n_members,
      COALESCE(pv.partners, 0) AS partners_90d
    FROM per_member pm
    JOIN ws_stats s ON s.workspace_id = pm.workspace_id
    JOIN public.team_members tm ON tm.id = pm.member_id AND tm.archived_at IS NULL
    JOIN public.teams t ON t.id = tm.team_id
    LEFT JOIN prev pv ON pv.member_id = pm.member_id AND pv.workspace_id = pm.workspace_id
    WHERE s.n_members >= 4
      AND t.leader_user_id IS NOT NULL
  ),
  signals AS (
    SELECT workspace_id, leader_user_id, member_id,
           'isolate'::text AS signal_type,
           CASE WHEN partners <= 1 THEN 'attention' ELSE 'watch' END AS severity,
           jsonb_build_object('partners', partners, 'median_partners', median_partners,
                              'window_days', _window_days) AS payload
    FROM scored
    WHERE median_partners >= 2 AND partners <= GREATEST(1, floor(median_partners / 2))

    UNION ALL

    SELECT workspace_id, leader_user_id, member_id,
           'super_connector', 'watch',
           jsonb_build_object('partners', partners, 'median_partners', median_partners,
                              'weight', weight, 'window_days', _window_days)
    FROM scored
    WHERE median_partners >= 2 AND partners >= median_partners * 2.5

    UNION ALL

    SELECT workspace_id, leader_user_id, member_id,
           'pattern_drop', 'attention',
           jsonb_build_object('partners', partners, 'partners_90d', partners_90d,
                              'window_days', _window_days)
    FROM scored
    WHERE partners_90d >= 4 AND partners <= partners_90d * 0.4
  )
  INSERT INTO public.network_signals
    (workspace_id, leader_user_id, member_id, signal_type, window_days,
     severity, payload, detected_at)
  SELECT workspace_id, leader_user_id, member_id, signal_type, _window_days,
         severity, payload, now()
  FROM signals;

  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows;
END;
$$;

REVOKE ALL ON FUNCTION public.detect_network_signals(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_network_signals(integer) TO service_role;
