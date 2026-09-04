-- ============================================================
-- Rhitmo 2.0 — Bloco ONA passivo
-- ============================================================

-- 1) Reconstrói team_network_edges a partir das threads do Slack Ambient
CREATE OR REPLACE FUNCTION public.rebuild_team_network(_window_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rows integer := 0;
BEGIN
  IF _window_days NOT IN (30, 60, 90) THEN
    RAISE EXCEPTION 'window_days deve ser 30, 60 ou 90';
  END IF;

  DELETE FROM public.team_network_edges WHERE window_days = _window_days;

  WITH thread_members AS (
    SELECT
      sae.workspace_id,
      COALESCE(sae.thread_root_ts, sae.slack_message_ts) AS thread_key,
      sae.slack_channel_id,
      m.member_id,
      max(sae.captured_at) AS last_at
    FROM public.slack_ambient_evidence sae
    CROSS JOIN LATERAL (
      SELECT sae.member_id AS member_id
      UNION
      SELECT (p->>'member_id')::uuid
      FROM jsonb_array_elements(
             CASE WHEN jsonb_typeof(sae.participants) = 'array'
                  THEN sae.participants ELSE '[]'::jsonb END
           ) p
      WHERE p->>'member_id' IS NOT NULL
    ) m
    WHERE sae.captured_at >= now() - (_window_days || ' days')::interval
      AND m.member_id IS NOT NULL
    GROUP BY 1, 2, 3, 4
  ),
  sized AS (
    SELECT workspace_id, thread_key, slack_channel_id, count(*) AS n
    FROM thread_members
    GROUP BY 1, 2, 3
    HAVING count(*) BETWEEN 2 AND 12
  ),
  pairs AS (
    SELECT
      a.workspace_id,
      LEAST(a.member_id, b.member_id) AS member_a_id,
      GREATEST(a.member_id, b.member_id) AS member_b_id,
      GREATEST(a.last_at, b.last_at) AS occurred_at
    FROM thread_members a
    JOIN thread_members b
      ON a.workspace_id = b.workspace_id
     AND a.thread_key = b.thread_key
     AND a.slack_channel_id IS NOT DISTINCT FROM b.slack_channel_id
     AND a.member_id < b.member_id
    JOIN sized s
      ON s.workspace_id = a.workspace_id
     AND s.thread_key = a.thread_key
     AND s.slack_channel_id IS NOT DISTINCT FROM a.slack_channel_id
  )
  INSERT INTO public.team_network_edges
    (workspace_id, member_a_id, member_b_id, window_days,
     weight_total, event_count, sources, last_event_at, computed_at)
  SELECT
    p.workspace_id,
    p.member_a_id,
    p.member_b_id,
    _window_days,
    round(sum(exp(-extract(epoch FROM (now() - p.occurred_at)) / (86400.0 * _window_days)))::numeric, 4),
    count(*),
    ARRAY['slack']::text[],
    max(p.occurred_at),
    now()
  FROM pairs p
  JOIN public.team_members ta ON ta.id = p.member_a_id AND ta.archived_at IS NULL
  JOIN public.team_members tb ON tb.id = p.member_b_id AND tb.archived_at IS NULL
  GROUP BY 1, 2, 3;

  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows;
END;
$$;

-- 2) Detecta sinais comparando a janela recente com a anterior
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
     severity, payload, detected_at, detected_on)
  SELECT workspace_id, leader_user_id, member_id, signal_type, _window_days,
         severity, payload, now(), current_date
  FROM signals;

  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows;
END;
$$;

-- 3) Rede visível ao líder
CREATE OR REPLACE FUNCTION public.get_team_network(_window_days integer DEFAULT 30)
RETURNS TABLE (
  member_a_id uuid,
  member_a_name text,
  member_b_id uuid,
  member_b_name text,
  weight_total numeric,
  event_count integer,
  last_event_at timestamptz,
  a_is_report boolean,
  b_is_report boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := public.effective_user_id();
BEGIN
  RETURN QUERY
  SELECT
    e.member_a_id, ta.name, e.member_b_id, tb.name,
    e.weight_total, e.event_count, e.last_event_at,
    public.is_team_leader(_uid, e.member_a_id),
    public.is_team_leader(_uid, e.member_b_id)
  FROM public.team_network_edges e
  JOIN public.team_members ta ON ta.id = e.member_a_id
  JOIN public.team_members tb ON tb.id = e.member_b_id
  WHERE e.window_days = _window_days
    AND public.can_view_network_pair(e.workspace_id, e.member_a_id, e.member_b_id, false)
  ORDER BY e.weight_total DESC
  LIMIT 300;
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_team_network(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_team_network(integer) TO service_role;
REVOKE ALL ON FUNCTION public.detect_network_signals(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_network_signals(integer) TO service_role;
REVOKE ALL ON FUNCTION public.get_team_network(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_network(integer) TO authenticated, service_role;

SELECT public._assert_rpc_runs($$SELECT * FROM public.get_team_network(30) LIMIT 1$$);
