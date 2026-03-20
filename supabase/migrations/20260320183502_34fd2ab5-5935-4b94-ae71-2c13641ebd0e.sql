
CREATE OR REPLACE FUNCTION public.get_hr_member_profile(
  _workspace_id UUID,
  _member_id UUID
)
RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  member_email TEXT,
  member_role TEXT,
  leader_id UUID,
  leader_name TEXT,
  motivators JSONB,
  user_manual JSONB,
  chronotype TEXT,
  feedback_style TEXT,
  recognition_style TEXT,
  skills_data JSONB,
  work_style_data JSONB,
  created_at TIMESTAMPTZ,
  feedback_count INTEGER,
  last_feedback_date TIMESTAMPTZ,
  pdi_items JSONB,
  recent_feedbacks JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_hr_admin_of_workspace(_workspace_id)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    tm.id AS member_id,
    tm.name AS member_name,
    tm.email AS member_email,
    tm.role AS member_role,
    w.owner_id AS leader_id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email)::TEXT AS leader_name,
    tm.motivators,
    tm.user_manual,
    tm.chronotype,
    tm.feedback_style,
    tm.recognition_style,
    tm.skills_data,
    tm.work_style_data,
    tm.created_at,
    (SELECT COUNT(*)::INTEGER FROM feedbacks f WHERE f.member_id = tm.id) AS feedback_count,
    (SELECT MAX(f.occurred_at) FROM feedbacks f WHERE f.member_id = tm.id) AS last_feedback_date,
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', di.id,
          'title', di.title,
          'description', di.description,
          'status', di.status,
          'due_date', di.due_date,
          'category', di.category,
          'created_at', di.created_at
        ) ORDER BY di.created_at DESC
      ), '[]'::jsonb)
      FROM development_items di
      JOIN development_plans dp ON dp.id = di.plan_id
      WHERE dp.member_id = tm.id
    ) AS pdi_items,
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', sub.id,
          'content', sub.content,
          'occurred_at', sub.occurred_at,
          'sentiment', sub.sentiment,
          'type', sub.type,
          'title', sub.title
        )
      ), '[]'::jsonb)
      FROM (
        SELECT f.id, f.content, f.occurred_at, f.sentiment, f.type, f.title
        FROM feedbacks f
        WHERE f.member_id = tm.id
        ORDER BY f.occurred_at DESC
        LIMIT 5
      ) sub
    ) AS recent_feedbacks
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  LEFT JOIN auth.users au ON au.id = w.owner_id
  WHERE w.id = _workspace_id
    AND tm.id = _member_id
    AND w.is_active = true
  LIMIT 1;
END;
$$;
