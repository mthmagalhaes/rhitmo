
CREATE OR REPLACE FUNCTION public.get_hr_all_members(
  _workspace_id UUID,
  _search TEXT DEFAULT NULL,
  _leader_id UUID DEFAULT NULL,
  _has_pdi BOOLEAN DEFAULT NULL,
  _limit INTEGER DEFAULT 20,
  _offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  member_email TEXT,
  member_role TEXT,
  leader_id UUID,
  leader_name TEXT,
  last_feedback_date TIMESTAMPTZ,
  days_since_last_feedback INTEGER,
  pdi_count INTEGER,
  has_sync BOOLEAN,
  has_skills_map BOOLEAN,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  IF NOT (public.is_admin() OR public.is_hr_admin_of_workspace(_workspace_id)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Count total matching rows first
  SELECT COUNT(*)
  INTO v_total
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE w.id = _workspace_id
    AND w.is_active = true
    AND (_search IS NULL OR tm.name ILIKE '%' || _search || '%' OR tm.email ILIKE '%' || _search || '%')
    AND (_leader_id IS NULL OR w.owner_id = _leader_id)
    AND (_has_pdi IS NULL OR
         (_has_pdi = true AND EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)) OR
         (_has_pdi = false AND NOT EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)));

  RETURN QUERY
  SELECT
    tm.id AS member_id,
    tm.name AS member_name,
    tm.email AS member_email,
    tm.role AS member_role,
    w.owner_id AS leader_id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email)::TEXT AS leader_name,
    (SELECT MAX(f.occurred_at) FROM feedbacks f WHERE f.member_id = tm.id) AS last_feedback_date,
    COALESCE(
      EXTRACT(DAY FROM NOW() - (SELECT MAX(f.occurred_at) FROM feedbacks f WHERE f.member_id = tm.id))::INTEGER,
      999
    ) AS days_since_last_feedback,
    (SELECT COUNT(*)::INTEGER FROM development_plans dp WHERE dp.member_id = tm.id) AS pdi_count,
    (tm.work_style_data IS NOT NULL) AS has_sync,
    (tm.skills_data IS NOT NULL AND tm.skills_data != '{}'::jsonb) AS has_skills_map,
    v_total AS total_count
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  LEFT JOIN auth.users au ON au.id = w.owner_id
  WHERE w.id = _workspace_id
    AND w.is_active = true
    AND (_search IS NULL OR tm.name ILIKE '%' || _search || '%' OR tm.email ILIKE '%' || _search || '%')
    AND (_leader_id IS NULL OR w.owner_id = _leader_id)
    AND (_has_pdi IS NULL OR
         (_has_pdi = true AND EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)) OR
         (_has_pdi = false AND NOT EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)))
  ORDER BY
    COALESCE(EXTRACT(DAY FROM NOW() - (SELECT MAX(f.occurred_at) FROM feedbacks f WHERE f.member_id = tm.id))::INTEGER, 999) ASC,
    tm.name ASC
  LIMIT _limit
  OFFSET _offset;
END;
$$;
