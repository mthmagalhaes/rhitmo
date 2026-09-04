-- Mapa de rede: time (líder) e empresa (RH)

DROP FUNCTION IF EXISTS public.get_team_network(integer);

CREATE FUNCTION public.get_team_network(_window_days integer DEFAULT 30)
RETURNS TABLE (
  member_a_id uuid,
  member_a_name text,
  member_b_id uuid,
  member_b_name text,
  weight_total numeric,
  event_count integer,
  last_event_at timestamptz,
  a_is_report boolean,
  b_is_report boolean,
  a_team_id uuid,
  a_team_name text,
  b_team_id uuid,
  b_team_name text
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
    public.is_team_leader(_uid, e.member_b_id),
    ta.team_id, tta.name,
    tb.team_id, ttb.name
  FROM public.team_network_edges e
  JOIN public.team_members ta ON ta.id = e.member_a_id
  JOIN public.team_members tb ON tb.id = e.member_b_id
  LEFT JOIN public.teams tta ON tta.id = ta.team_id
  LEFT JOIN public.teams ttb ON ttb.id = tb.team_id
  WHERE e.window_days = _window_days
    AND public.can_view_network_pair(e.workspace_id, e.member_a_id, e.member_b_id, false)
  ORDER BY e.weight_total DESC
  LIMIT 600;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_network(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_network(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_workspace_network(_window_days integer DEFAULT 30)
RETURNS TABLE (
  member_a_id uuid,
  member_a_name text,
  member_b_id uuid,
  member_b_name text,
  weight_total numeric,
  event_count integer,
  last_event_at timestamptz,
  a_is_report boolean,
  b_is_report boolean,
  a_team_id uuid,
  a_team_name text,
  b_team_id uuid,
  b_team_name text
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
    public.is_team_leader(_uid, e.member_b_id),
    ta.team_id, tta.name,
    tb.team_id, ttb.name
  FROM public.team_network_edges e
  JOIN public.team_members ta ON ta.id = e.member_a_id
  JOIN public.team_members tb ON tb.id = e.member_b_id
  LEFT JOIN public.teams tta ON tta.id = ta.team_id
  LEFT JOIN public.teams ttb ON ttb.id = tb.team_id
  JOIN public.workspaces w ON w.id = e.workspace_id
  WHERE e.window_days = _window_days
    AND (
      public.is_admin()
      OR w.owner_id = _uid
      OR public.is_hr_admin_of_workspace(e.workspace_id)
    )
  ORDER BY e.weight_total DESC
  LIMIT 1500;
END;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_network(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_network(integer) TO authenticated, service_role;

SELECT public._assert_rpc_runs($$SELECT * FROM public.get_team_network(30) LIMIT 1$$);
SELECT public._assert_rpc_runs($$SELECT * FROM public.get_workspace_network(30) LIMIT 1$$);