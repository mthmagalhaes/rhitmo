DROP FUNCTION IF EXISTS public.get_hr_member_profile(uuid, uuid);

CREATE FUNCTION public.get_hr_member_profile(_workspace_id uuid, _member_id uuid)
RETURNS TABLE(
  member_id uuid,
  member_name text,
  member_email text,
  member_role text,
  team_id uuid,
  team_name text,
  leader_id uuid,
  leader_name text,
  invite_status text,
  linked_user_id uuid,
  motivators jsonb,
  user_manual jsonb,
  chronotype text,
  feedback_style text,
  recognition_style text,
  skills_data jsonb,
  work_style_data jsonb,
  created_at timestamp with time zone,
  feedback_count integer,
  last_feedback_date timestamp with time zone,
  pdi_count integer,
  has_pdi boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_hr_admin_of_workspace(_workspace_id) OR EXISTS (SELECT 1 FROM workspaces w WHERE w.id = _workspace_id AND w.owner_id = auth.uid())) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    tm.id,
    tm.name,
    tm.email,
    tm.role,
    tm.team_id,
    t.name,
    t.leader_user_id,
    COALESCE(p.full_name, lu.email)::text,
    COALESCE(tm.invite_status, CASE WHEN tm.linked_user_id IS NOT NULL THEN 'accepted' ELSE 'pending' END),
    tm.linked_user_id,
    tm.motivators,
    tm.user_manual,
    tm.chronotype,
    tm.feedback_style,
    tm.recognition_style,
    tm.skills_data,
    tm.work_style_data,
    tm.created_at,
    (SELECT COUNT(*)::int FROM feedbacks f WHERE f.member_id = tm.id),
    (SELECT MAX(f.created_at) FROM feedbacks f WHERE f.member_id = tm.id),
    (SELECT COUNT(*)::int FROM development_plans dp WHERE dp.member_id = tm.id),
    EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id AND dp.status IN ('active','approved','in_progress','draft'))
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  LEFT JOIN auth.users lu ON lu.id = t.leader_user_id
  LEFT JOIN profiles p ON p.id = t.leader_user_id
  WHERE tm.id = _member_id
    AND t.workspace_id = _workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_hr_member_profile(uuid, uuid) TO authenticated, service_role;