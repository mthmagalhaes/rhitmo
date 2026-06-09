CREATE OR REPLACE FUNCTION public.get_hr_all_members(_workspace_id uuid, _search text DEFAULT NULL::text, _leader_id uuid DEFAULT NULL::uuid, _has_pdi boolean DEFAULT NULL::boolean, _limit integer DEFAULT 20, _offset integer DEFAULT 0)
 RETURNS TABLE(member_id uuid, member_name text, member_email text, member_role text, leader_id uuid, leader_name text, invite_status text, last_feedback_date timestamp with time zone, days_since_last_feedback integer, pdi_count integer, has_sync boolean, has_skills_map boolean, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
BEGIN
  IF NOT public.is_workspace_admin(_workspace_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE w.id = _workspace_id
    AND w.is_active = true
    AND (_search IS NULL OR tm.name ILIKE '%' || _search || '%' OR tm.email ILIKE '%' || _search || '%')
    AND (_leader_id IS NULL OR t.leader_user_id = _leader_id)
    AND (_has_pdi IS NULL OR
         (_has_pdi = true AND EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)) OR
         (_has_pdi = false AND NOT EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)));

  RETURN QUERY
  SELECT
    tm.id,
    tm.name,
    tm.email,
    tm.role,
    t.leader_user_id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email)::TEXT,
    COALESCE(tm.invite_status, CASE WHEN tm.linked_user_id IS NOT NULL THEN 'accepted' ELSE 'pending' END),
    (SELECT MAX(f.created_at) FROM feedbacks f WHERE f.member_id = tm.id),
    COALESCE(EXTRACT(DAY FROM (now() - (SELECT MAX(f.created_at) FROM feedbacks f WHERE f.member_id = tm.id)))::int, 999),
    (SELECT COUNT(*)::int FROM development_plans dp WHERE dp.member_id = tm.id),
    (tm.work_style_data IS NOT NULL OR tm.chronotype IS NOT NULL OR tm.feedback_style IS NOT NULL),
    (CASE WHEN tm.skills_data IS NOT NULL
            AND jsonb_typeof(tm.skills_data) = 'array'
            AND jsonb_array_length(tm.skills_data) > 0
          THEN true
          ELSE false END),
    v_total
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  LEFT JOIN auth.users au ON au.id = t.leader_user_id
  WHERE w.id = _workspace_id
    AND w.is_active = true
    AND (_search IS NULL OR tm.name ILIKE '%' || _search || '%' OR tm.email ILIKE '%' || _search || '%')
    AND (_leader_id IS NULL OR t.leader_user_id = _leader_id)
    AND (_has_pdi IS NULL OR
         (_has_pdi = true AND EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)) OR
         (_has_pdi = false AND NOT EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)))
  ORDER BY tm.name
  LIMIT _limit OFFSET _offset;
END;
$function$;