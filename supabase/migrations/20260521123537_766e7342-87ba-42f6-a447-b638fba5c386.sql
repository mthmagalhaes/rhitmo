
CREATE OR REPLACE FUNCTION public.debug_context_access(_workspace_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_auth_uid uuid := auth.uid();
  v_eff_uid uuid := effective_user_id();
  v_is_admin boolean := public.is_admin();
  v_impersonation jsonb;
  v_owned jsonb;
  v_led jsonb;
  v_linked jsonb;
  v_allowed_count int;
  v_ce_count bigint;
  v_slack_count bigint;
  v_slack_pending bigint;
BEGIN
  SELECT to_jsonb(ai) INTO v_impersonation
  FROM public.admin_impersonation ai
  WHERE ai.admin_user_id = v_auth_uid
    AND ai.ended_at IS NULL
    AND (ai.expires_at IS NULL OR ai.expires_at > now())
  ORDER BY ai.created_at DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name)), '[]'::jsonb) INTO v_owned
  FROM public.workspaces WHERE owner_id = v_eff_uid AND is_active = true;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'workspace_id', workspace_id)), '[]'::jsonb) INTO v_led
  FROM public.teams WHERE leader_user_id = v_eff_uid;

  SELECT to_jsonb(tm) - 'created_at' - 'updated_at' INTO v_linked
  FROM public.team_members tm WHERE tm.linked_user_id = v_eff_uid LIMIT 1;

  SELECT count(DISTINCT tm.id) INTO v_allowed_count
  FROM public.team_members tm
  LEFT JOIN public.teams t ON t.id = tm.team_id
  LEFT JOIN public.workspaces w ON w.id = t.workspace_id
  WHERE (_workspace_id IS NULL OR t.workspace_id = _workspace_id)
    AND (
      v_is_admin
      OR t.leader_user_id = v_eff_uid
      OR w.owner_id = v_eff_uid
      OR v_eff_uid = ANY(COALESCE(w.hr_admin_ids, '{}'::uuid[]))
      OR tm.linked_user_id = v_auth_uid
    );

  SELECT count(*) INTO v_ce_count FROM public.context_evidence ce
  WHERE ce.member_id IN (
    SELECT tm.id FROM public.team_members tm
    LEFT JOIN public.teams t ON t.id = tm.team_id
    LEFT JOIN public.workspaces w ON w.id = t.workspace_id
    WHERE (_workspace_id IS NULL OR t.workspace_id = _workspace_id)
      AND (v_is_admin OR t.leader_user_id = v_eff_uid OR w.owner_id = v_eff_uid
           OR v_eff_uid = ANY(COALESCE(w.hr_admin_ids, '{}'::uuid[]))
           OR tm.linked_user_id = v_auth_uid)
  );

  SELECT count(*), count(*) FILTER (WHERE status='pending')
  INTO v_slack_count, v_slack_pending
  FROM public.slack_ambient_evidence
  WHERE manager_id = v_eff_uid;

  RETURN jsonb_build_object(
    'auth_uid', v_auth_uid,
    'effective_user_id', v_eff_uid,
    'is_admin', v_is_admin,
    'has_active_impersonation', v_impersonation IS NOT NULL,
    'impersonation', v_impersonation,
    'workspaces_owned', v_owned,
    'teams_led', v_led,
    'linked_member', v_linked,
    'queried_workspace_id', _workspace_id,
    'allowed_member_count', v_allowed_count,
    'context_evidence_visible_count', v_ce_count,
    'slack_evidence_total', v_slack_count,
    'slack_evidence_pending', v_slack_pending,
    'now', now()
  );
END $$;

GRANT EXECUTE ON FUNCTION public.debug_context_access(uuid) TO authenticated;
