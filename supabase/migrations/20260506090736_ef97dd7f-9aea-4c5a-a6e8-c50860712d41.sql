-- ============================================================
-- Sprint 13 — Team Network Graph (ONA Foundation)
-- ============================================================

-- 1. graph_events_raw: individual collaboration signals
CREATE TABLE IF NOT EXISTS public.graph_events_raw (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('slack', 'gcal', 'linear', 'github', 'hubspot', 'notion')),
  event_type text NOT NULL CHECK (event_type IN ('mention', 'thread_reply', 'reaction', 'dm', 'meeting_attendee', 'channel_message')),
  actor_member_id uuid,
  target_member_id uuid,
  weight numeric NOT NULL DEFAULT 1.0,
  occurred_at timestamptz NOT NULL,
  external_ref text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotency: same external event from same source/type/pair can't be ingested twice.
-- COALESCE used because target_member_id may be null (broadcast mention).
CREATE UNIQUE INDEX IF NOT EXISTS graph_events_raw_dedup_idx
  ON public.graph_events_raw (
    source,
    event_type,
    external_ref,
    COALESCE(actor_member_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(target_member_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE INDEX IF NOT EXISTS graph_events_raw_workspace_time_idx
  ON public.graph_events_raw (workspace_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS graph_events_raw_actor_target_idx
  ON public.graph_events_raw (actor_member_id, target_member_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS graph_events_raw_target_actor_idx
  ON public.graph_events_raw (target_member_id, actor_member_id, occurred_at DESC);

ALTER TABLE public.graph_events_raw ENABLE ROW LEVEL SECURITY;


-- 2. team_network_edges: aggregated edges per pair + window
CREATE TABLE IF NOT EXISTS public.team_network_edges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  -- canonical: always member_a_id < member_b_id (string compare)
  member_a_id uuid NOT NULL,
  member_b_id uuid NOT NULL,
  window_days integer NOT NULL CHECK (window_days IN (30, 60, 90)),
  weight_total numeric NOT NULL DEFAULT 0,
  event_count integer NOT NULL DEFAULT 0,
  sources text[] NOT NULL DEFAULT '{}'::text[],
  last_event_at timestamptz,
  computed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_network_edges_canonical CHECK (member_a_id < member_b_id),
  CONSTRAINT team_network_edges_unique UNIQUE (workspace_id, member_a_id, member_b_id, window_days)
);

CREATE INDEX IF NOT EXISTS team_network_edges_a_window_idx
  ON public.team_network_edges (workspace_id, member_a_id, window_days, weight_total DESC);

CREATE INDEX IF NOT EXISTS team_network_edges_b_window_idx
  ON public.team_network_edges (workspace_id, member_b_id, window_days, weight_total DESC);

CREATE INDEX IF NOT EXISTS team_network_edges_workspace_weight_idx
  ON public.team_network_edges (workspace_id, window_days, weight_total DESC);

ALTER TABLE public.team_network_edges ENABLE ROW LEVEL SECURITY;


-- 3. Access helper (SECURITY DEFINER, avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.can_view_network_pair(
  _workspace_id uuid,
  _member_a uuid,
  _member_b uuid,
  _strict boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  is_owner boolean;
  is_hr boolean;
  leader_a boolean := false;
  leader_b boolean := false;
  member_self_a boolean := false;
  member_self_b boolean := false;
BEGIN
  -- Super admin always
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  uid := public.effective_user_id();
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  -- Workspace owner
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = _workspace_id
      AND w.is_active = true
      AND w.owner_id = uid
  ) INTO is_owner;
  IF is_owner THEN RETURN true; END IF;

  -- HR Admin
  IF public.is_hr_admin_of_workspace(_workspace_id) THEN
    RETURN true;
  END IF;

  -- Leader of either endpoint
  IF _member_a IS NOT NULL THEN
    leader_a := public.is_team_leader(uid, _member_a);
  END IF;
  IF _member_b IS NOT NULL THEN
    leader_b := public.is_team_leader(uid, _member_b);
  END IF;

  IF _strict THEN
    -- raw events: leader needs both endpoints (or one endpoint + the other unresolved)
    IF (leader_a OR _member_a IS NULL) AND (leader_b OR _member_b IS NULL)
       AND (leader_a OR leader_b) THEN
      RETURN true;
    END IF;
  ELSE
    -- aggregated edges: leader sees if ANY endpoint is their report
    IF leader_a OR leader_b THEN RETURN true; END IF;
  END IF;

  -- Linked member sees egocentric edges/events
  IF _member_a IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = _member_a AND tm.linked_user_id = auth.uid()
    ) INTO member_self_a;
  END IF;
  IF _member_b IS NOT NULL AND NOT member_self_a THEN
    SELECT EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = _member_b AND tm.linked_user_id = auth.uid()
    ) INTO member_self_b;
  END IF;

  RETURN member_self_a OR member_self_b;
END;
$$;


-- 4. RLS policies — graph_events_raw (strict)
CREATE POLICY graph_events_raw_select
  ON public.graph_events_raw
  FOR SELECT
  TO authenticated
  USING (public.can_view_network_pair(workspace_id, actor_member_id, target_member_id, true));

CREATE POLICY graph_events_raw_service_insert
  ON public.graph_events_raw
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY graph_events_raw_service_delete
  ON public.graph_events_raw
  FOR DELETE
  TO service_role
  USING (true);


-- 5. RLS policies — team_network_edges (relaxed: leader sees if any endpoint is theirs)
CREATE POLICY team_network_edges_select
  ON public.team_network_edges
  FOR SELECT
  TO authenticated
  USING (public.can_view_network_pair(workspace_id, member_a_id, member_b_id, false));

CREATE POLICY team_network_edges_service_write
  ON public.team_network_edges
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 6. TTL helper for cron (90 days)
CREATE OR REPLACE FUNCTION public.prune_graph_events_raw()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted integer;
BEGIN
  DELETE FROM public.graph_events_raw
  WHERE occurred_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;


-- 7. RPC for /admin/network-debug (super admin only — enforced inside)
CREATE OR REPLACE FUNCTION public.network_debug_top_edges(
  _workspace_id uuid,
  _window_days integer DEFAULT 30,
  _limit integer DEFAULT 50
)
RETURNS TABLE (
  member_a_id uuid,
  member_a_name text,
  member_b_id uuid,
  member_b_name text,
  weight_total numeric,
  event_count integer,
  sources text[],
  last_event_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    e.member_a_id,
    tma.name AS member_a_name,
    e.member_b_id,
    tmb.name AS member_b_name,
    e.weight_total,
    e.event_count,
    e.sources,
    e.last_event_at
  FROM public.team_network_edges e
  LEFT JOIN public.team_members tma ON tma.id = e.member_a_id
  LEFT JOIN public.team_members tmb ON tmb.id = e.member_b_id
  WHERE e.workspace_id = _workspace_id
    AND e.window_days = _window_days
  ORDER BY e.weight_total DESC
  LIMIT _limit;
END;
$$;


-- 8. RPC: stats (totals, isolates count)
CREATE OR REPLACE FUNCTION public.network_debug_stats(
  _workspace_id uuid,
  _window_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_edges integer;
  total_members integer;
  connected_members integer;
  isolates integer;
  super_connectors jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*) INTO total_edges
  FROM public.team_network_edges
  WHERE workspace_id = _workspace_id AND window_days = _window_days;

  SELECT COUNT(*) INTO total_members
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE t.workspace_id = _workspace_id;

  WITH connected AS (
    SELECT member_a_id AS m FROM public.team_network_edges
      WHERE workspace_id = _workspace_id AND window_days = _window_days
    UNION
    SELECT member_b_id FROM public.team_network_edges
      WHERE workspace_id = _workspace_id AND window_days = _window_days
  )
  SELECT COUNT(*) INTO connected_members FROM connected;

  isolates := GREATEST(total_members - connected_members, 0);

  WITH per_member AS (
    SELECT m, SUM(weight_total) AS total_weight FROM (
      SELECT member_a_id AS m, weight_total FROM public.team_network_edges
        WHERE workspace_id = _workspace_id AND window_days = _window_days
      UNION ALL
      SELECT member_b_id AS m, weight_total FROM public.team_network_edges
        WHERE workspace_id = _workspace_id AND window_days = _window_days
    ) x
    GROUP BY m
    ORDER BY total_weight DESC
    LIMIT 5
  )
  SELECT jsonb_agg(jsonb_build_object(
    'member_id', pm.m,
    'name', tm.name,
    'total_weight', pm.total_weight
  )) INTO super_connectors
  FROM per_member pm
  LEFT JOIN public.team_members tm ON tm.id = pm.m;

  RETURN jsonb_build_object(
    'total_edges', total_edges,
    'total_members', total_members,
    'connected_members', connected_members,
    'isolates', isolates,
    'super_connectors', COALESCE(super_connectors, '[]'::jsonb)
  );
END;
$$;
