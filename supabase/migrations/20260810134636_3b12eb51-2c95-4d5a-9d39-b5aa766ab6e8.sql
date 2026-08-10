CREATE OR REPLACE FUNCTION public.get_hr_member_rhythm_profile(_workspace_id uuid, _member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_member RECORD;
  v_result JSONB;
BEGIN
  IF NOT public.is_workspace_admin(_workspace_id) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT tm.id, tm.name, tm.role, tm.invite_status, tm.created_at,
         t.leader_user_id,
         COALESCE(au.raw_user_meta_data->>'full_name', au.email) AS leader_name,
         au.email AS leader_email
    INTO v_member
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    LEFT JOIN auth.users au ON au.id = t.leader_user_id
   WHERE tm.id = _member_id
     AND t.workspace_id = _workspace_id
     AND tm.archived_at IS NULL
   LIMIT 1;

  IF v_member.id IS NULL THEN
    RETURN jsonb_build_object('member', NULL);
  END IF;

  SELECT jsonb_build_object(
    'member', jsonb_build_object(
      'member_id', v_member.id,
      'member_name', v_member.name,
      'member_role', v_member.role,
      'invite_status', v_member.invite_status,
      'member_since', v_member.created_at,
      'leader_name', v_member.leader_name,
      'leader_email', v_member.leader_email
    ),
    'last_feedback_at', (
      SELECT MAX(f.occurred_at) FROM public.feedbacks f WHERE f.member_id = v_member.id
    ),
    'feedback_count_90d', (
      SELECT COUNT(*) FROM public.feedbacks f
       WHERE f.member_id = v_member.id AND f.occurred_at > NOW() - INTERVAL '90 days'
    ),
    'feedback_count_total', (
      SELECT COUNT(*) FROM public.feedbacks f WHERE f.member_id = v_member.id
    ),
    'monthly_counts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('month', to_char(m.month, 'YYYY-MM'), 'count', m.cnt) ORDER BY m.month)
        FROM (
          SELECT date_trunc('month', f.occurred_at) AS month, COUNT(*) AS cnt
            FROM public.feedbacks f
           WHERE f.member_id = v_member.id
             AND f.occurred_at > date_trunc('month', NOW()) - INTERVAL '11 months'
           GROUP BY 1
        ) m
    ), '[]'::jsonb),
    'by_source', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('source', s.src, 'count', s.cnt) ORDER BY s.cnt DESC)
        FROM (
          SELECT COALESCE(f.source, 'manual') AS src, COUNT(*) AS cnt
            FROM public.feedbacks f
           WHERE f.member_id = v_member.id
           GROUP BY 1
        ) s
    ), '[]'::jsonb),
    'reviews', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', pr.id,
               'review_type', COALESCE(pr.review_type, 'formal'),
               'period_type', pr.period_type,
               'period_start', pr.period_start,
               'period_end', pr.period_end,
               'created_at', pr.created_at,
               'shared_at', pr.sent_at,
               'acknowledged_at', pr.acknowledged_at,
               'status', CASE
                 WHEN pr.acknowledged_at IS NOT NULL THEN 'acknowledged'
                 WHEN pr.shared_with_member THEN 'shared'
                 ELSE 'draft'
               END,
               'evidence_count', pr.evidence_count
             ) ORDER BY pr.created_at DESC)
        FROM public.performance_reviews pr
       WHERE pr.member_id = v_member.id
    ), '[]'::jsonb),
    'has_active_plan', EXISTS (
      SELECT 1 FROM public.development_plans dp
       WHERE dp.member_id = v_member.id AND dp.status IN ('active', 'approved', 'proposed')
    )
  ) INTO v_result;

  RETURN v_result;
END $function$;

GRANT EXECUTE ON FUNCTION public.get_hr_member_rhythm_profile(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hr_member_rhythm_profile(uuid, uuid) TO service_role;