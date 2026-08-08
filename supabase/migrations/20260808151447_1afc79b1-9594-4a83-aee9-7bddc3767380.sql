CREATE OR REPLACE FUNCTION public.get_hr_rhythm_overview(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE result JSONB;
BEGIN
  IF NOT public.is_workspace_admin(_workspace_id) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'days_since_last_feedback')::int DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'leader_id', t.leader_user_id,
      'leader_name', COALESCE(au.raw_user_meta_data->>'full_name', au.email),
      'leader_email', au.email,
      'total_members', (
        SELECT COUNT(*) FROM public.team_members tm
        WHERE tm.team_id = t.id AND tm.archived_at IS NULL
      ),
      'members_with_recent_1on1', (
        SELECT COUNT(DISTINCT tm.id) FROM public.team_members tm
        WHERE tm.team_id = t.id AND tm.archived_at IS NULL
          AND EXISTS (
            SELECT 1 FROM public.feedbacks f
            WHERE f.member_id = tm.id
              AND f.manager_id = t.leader_user_id
              AND f.occurred_at > NOW() - INTERVAL '30 days'
          )
      ),
      'last_feedback_at', (
        SELECT MAX(f.occurred_at) FROM public.feedbacks f
        JOIN public.team_members tm ON tm.id = f.member_id
        WHERE tm.team_id = t.id AND f.manager_id = t.leader_user_id
      ),
      'days_since_last_feedback', COALESCE(
        (SELECT EXTRACT(DAY FROM NOW() - MAX(f.occurred_at))::int
           FROM public.feedbacks f
           JOIN public.team_members tm ON tm.id = f.member_id
          WHERE tm.team_id = t.id AND f.manager_id = t.leader_user_id),
        999
      ),
      'formal_reviews_12m', (
        SELECT COUNT(*) FROM public.performance_reviews pr
        JOIN public.team_members tm ON tm.id = pr.member_id
        WHERE tm.team_id = t.id
          AND COALESCE(pr.review_type, 'formal') IN ('formal', 'manager')
          AND pr.created_at > NOW() - INTERVAL '12 months'
      )
    ) AS row_data
    FROM public.teams t
    JOIN public.workspaces w ON w.id = t.workspace_id
    JOIN auth.users au ON au.id = t.leader_user_id
    WHERE w.id = _workspace_id AND w.is_active = true AND t.leader_user_id IS NOT NULL
  ) sub;

  RETURN jsonb_build_object('leaders', result);
END $function$;

CREATE OR REPLACE FUNCTION public.get_hr_leader_rhythm_detail(_workspace_id uuid, _leader_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE result JSONB;
BEGIN
  IF NOT public.is_workspace_admin(_workspace_id) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'member_name'), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'member_id', tm.id,
      'member_name', tm.name,
      'member_role', tm.role,
      'invite_status', tm.invite_status,
      'last_feedback_at', (
        SELECT MAX(f.occurred_at) FROM public.feedbacks f
        WHERE f.member_id = tm.id AND f.manager_id = _leader_user_id
      ),
      'days_since_last_feedback', COALESCE(
        (SELECT EXTRACT(DAY FROM NOW() - MAX(f.occurred_at))::int
           FROM public.feedbacks f
          WHERE f.member_id = tm.id AND f.manager_id = _leader_user_id),
        999
      ),
      'feedback_count_90d', (
        SELECT COUNT(*) FROM public.feedbacks f
        WHERE f.member_id = tm.id AND f.manager_id = _leader_user_id
          AND f.occurred_at > NOW() - INTERVAL '90 days'
      ),
      'review_status', COALESCE((
        SELECT CASE
          WHEN pr.acknowledged_at IS NOT NULL THEN 'acknowledged'
          WHEN pr.shared_with_member THEN 'shared'
          ELSE 'draft'
        END
        FROM public.performance_reviews pr
        WHERE pr.member_id = tm.id
          AND COALESCE(pr.review_type, 'formal') IN ('formal', 'manager')
        ORDER BY pr.created_at DESC
        LIMIT 1
      ), 'none'),
      'last_review_at', (
        SELECT MAX(pr.created_at) FROM public.performance_reviews pr
        WHERE pr.member_id = tm.id
          AND COALESCE(pr.review_type, 'formal') IN ('formal', 'manager')
      ),
      'has_active_plan', EXISTS (
        SELECT 1 FROM public.development_plans dp
        WHERE dp.member_id = tm.id AND dp.status IN ('active', 'approved', 'proposed')
      )
    ) AS row_data
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE t.workspace_id = _workspace_id
      AND t.leader_user_id = _leader_user_id
      AND tm.archived_at IS NULL
  ) sub;

  RETURN jsonb_build_object('members', result);
END $function$;

GRANT EXECUTE ON FUNCTION public.get_hr_rhythm_overview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hr_leader_rhythm_detail(uuid, uuid) TO authenticated;

DO $smoke$
BEGIN
  -- Smoke test: as funções são guardadas por is_workspace_admin, então o
  -- sucesso é a exceção "Não autorizado" (corpo compilou e o guard rodou).
  BEGIN
    PERFORM public.get_hr_rhythm_overview(gen_random_uuid());
    RAISE EXCEPTION 'smoke: get_hr_rhythm_overview deveria bloquear não-admin';
  EXCEPTION WHEN sqlstate 'P0001' THEN
    IF SQLERRM <> 'Não autorizado' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.get_hr_leader_rhythm_detail(gen_random_uuid(), gen_random_uuid());
    RAISE EXCEPTION 'smoke: get_hr_leader_rhythm_detail deveria bloquear não-admin';
  EXCEPTION WHEN sqlstate 'P0001' THEN
    IF SQLERRM <> 'Não autorizado' THEN RAISE; END IF;
  END;
END $smoke$;