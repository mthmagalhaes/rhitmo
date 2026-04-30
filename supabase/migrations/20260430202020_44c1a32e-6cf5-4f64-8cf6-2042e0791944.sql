-- Sprint 8.3: get_team_timeline RPC
-- Returns paginated, cross-member evidence feed scoped to the caller's leadership reach.

CREATE OR REPLACE FUNCTION public.get_team_timeline(
  _workspace_id uuid DEFAULT NULL,
  _member_ids uuid[] DEFAULT NULL,
  _source_tables text[] DEFAULT NULL,
  _before timestamptz DEFAULT NULL,
  _limit int DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  member_id uuid,
  member_name text,
  member_avatar text,
  evidence_type text,
  source_table text,
  source_id uuid,
  occurred_at timestamptz,
  title text,
  summary text,
  sentiment text,
  visibility text,
  metadata jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := effective_user_id();
  v_allowed_members uuid[];
  v_is_admin boolean := public.is_admin();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Build allowed member set: union of (a) members of teams the caller leads,
  -- (b) members of workspaces the caller owns or HR-administers,
  -- (c) the member row linked to the caller (so liderados see themselves).
  SELECT COALESCE(array_agg(DISTINCT tm.id), '{}'::uuid[]) INTO v_allowed_members
  FROM public.team_members tm
  LEFT JOIN public.teams t ON t.id = tm.team_id
  LEFT JOIN public.workspaces w ON w.id = tm.workspace_id
  WHERE
    (_workspace_id IS NULL OR tm.workspace_id = _workspace_id)
    AND (
      v_is_admin
      OR t.leader_user_id = v_uid
      OR w.owner_id = v_uid
      OR v_uid = ANY(COALESCE(w.hr_admin_ids, '{}'::uuid[]))
      OR tm.linked_user_id = auth.uid()
    );

  IF array_length(v_allowed_members, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Apply optional explicit filter by member_ids (intersect with allowed).
  IF _member_ids IS NOT NULL AND array_length(_member_ids, 1) IS NOT NULL THEN
    SELECT COALESCE(array_agg(m), '{}'::uuid[]) INTO v_allowed_members
    FROM unnest(v_allowed_members) AS m
    WHERE m = ANY(_member_ids);

    IF array_length(v_allowed_members, 1) IS NULL THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    ce.id,
    ce.member_id,
    tm.name AS member_name,
    tm.avatar AS member_avatar,
    ce.evidence_type,
    ce.source_table,
    ce.source_id,
    ce.occurred_at,
    ce.title,
    ce.summary,
    ce.sentiment,
    ce.visibility,
    ce.metadata
  FROM public.context_evidence ce
  JOIN public.team_members tm ON tm.id = ce.member_id
  WHERE ce.member_id = ANY(v_allowed_members)
    AND (_source_tables IS NULL OR ce.source_table = ANY(_source_tables))
    AND (_before IS NULL OR ce.occurred_at < _before)
  ORDER BY ce.occurred_at DESC
  LIMIT GREATEST(LEAST(_limit, 100), 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_timeline(uuid, uuid[], text[], timestamptz, int) TO authenticated;