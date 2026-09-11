CREATE OR REPLACE FUNCTION public.rebuild_team_network(_window_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  slack_pairs AS (
    SELECT
      a.workspace_id,
      LEAST(a.member_id, b.member_id) AS member_a_id,
      GREATEST(a.member_id, b.member_id) AS member_b_id,
      GREATEST(a.last_at, b.last_at) AS occurred_at,
      'slack'::text AS source,
      1.0::numeric AS source_weight
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
  ),
  -- Reuniões: só a lista de participantes (e-mails da agenda), nunca conteúdo.
  meeting_members AS (
    SELECT
      t.workspace_id,
      um.id AS meeting_key,
      tm.id AS member_id,
      um.start_time AS occurred_at
    FROM public.upcoming_meetings um
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(um.attendees) = 'array' THEN um.attendees ELSE '[]'::jsonb END
    ) AS att(email)
    JOIN public.team_members tm
      ON lower(tm.email) = lower(att.email)
     AND tm.archived_at IS NULL
    JOIN public.teams t ON t.id = tm.team_id
    WHERE um.start_time >= now() - (_window_days || ' days')::interval
      AND um.start_time <= now()
    GROUP BY 1, 2, 3, 4
  ),
  meeting_sized AS (
    SELECT workspace_id, meeting_key, count(*) AS n
    FROM meeting_members
    GROUP BY 1, 2
    HAVING count(*) BETWEEN 2 AND 12
  ),
  meeting_pairs AS (
    SELECT
      a.workspace_id,
      LEAST(a.member_id, b.member_id) AS member_a_id,
      GREATEST(a.member_id, b.member_id) AS member_b_id,
      GREATEST(a.occurred_at, b.occurred_at) AS occurred_at,
      'meeting'::text AS source,
      0.5::numeric AS source_weight
    FROM meeting_members a
    JOIN meeting_members b
      ON a.workspace_id = b.workspace_id
     AND a.meeting_key = b.meeting_key
     AND a.member_id < b.member_id
    JOIN meeting_sized s
      ON s.workspace_id = a.workspace_id
     AND s.meeting_key = a.meeting_key
  ),
  pairs AS (
    SELECT * FROM slack_pairs
    UNION ALL
    SELECT * FROM meeting_pairs
  )
  INSERT INTO public.team_network_edges
    (workspace_id, member_a_id, member_b_id, window_days,
     weight_total, event_count, sources, last_event_at, computed_at)
  SELECT
    p.workspace_id,
    p.member_a_id,
    p.member_b_id,
    _window_days,
    round(sum(p.source_weight * exp(-extract(epoch FROM (now() - p.occurred_at)) / (86400.0 * _window_days)))::numeric, 4),
    count(*),
    array_agg(DISTINCT p.source),
    max(p.occurred_at),
    now()
  FROM pairs p
  JOIN public.team_members ta ON ta.id = p.member_a_id AND ta.archived_at IS NULL
  JOIN public.team_members tb ON tb.id = p.member_b_id AND tb.archived_at IS NULL
  GROUP BY 1, 2, 3;

  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows;
END;
$function$;