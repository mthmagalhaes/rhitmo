-- Consolidated account context resolver: returns workspace_id, role,
-- linked_member, and pending invite flag in a single round-trip.
-- Replaces 4 separate queries in src/contexts/AccountContext.tsx.

CREATE OR REPLACE FUNCTION public.get_account_context(p_user_id uuid, p_user_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_is_owner boolean := false;
  v_is_leader boolean := false;
  v_is_hr_admin boolean := false;
  v_role text;
  v_linked jsonb := NULL;
  v_pending boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'workspace_id', NULL,
      'role', 'user',
      'linked_member', NULL,
      'has_pending_invite', false
    );
  END IF;

  -- 1. Owner workspace (highest priority)
  SELECT id INTO v_workspace_id
  FROM public.workspaces
  WHERE owner_id = p_user_id AND is_active = true
  LIMIT 1;

  IF v_workspace_id IS NOT NULL THEN
    v_is_owner := true;
  END IF;

  -- 2. HR admin (any workspace where user id is in hr_admin_ids)
  IF NOT v_is_owner THEN
    SELECT id INTO v_workspace_id
    FROM public.workspaces
    WHERE p_user_id = ANY(hr_admin_ids) AND is_active = true
    LIMIT 1;
    IF v_workspace_id IS NOT NULL THEN
      v_is_hr_admin := true;
    END IF;
  ELSE
    -- already owner, but still flag hr_admin if applicable
    v_is_hr_admin := EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE id = v_workspace_id AND p_user_id = ANY(hr_admin_ids)
    );
  END IF;

  -- 3. Team leader fallback for workspace resolution
  IF v_workspace_id IS NULL THEN
    SELECT t.workspace_id INTO v_workspace_id
    FROM public.teams t
    JOIN public.workspaces w ON w.id = t.workspace_id
    WHERE t.leader_user_id = p_user_id AND w.is_active = true
    LIMIT 1;
    IF v_workspace_id IS NOT NULL THEN
      v_is_leader := true;
    END IF;
  ELSE
    v_is_leader := EXISTS (
      SELECT 1 FROM public.teams WHERE leader_user_id = p_user_id LIMIT 1
    );
  END IF;

  -- 4. Resolve role with priority: hr_admin > leader/owner > user
  IF v_is_hr_admin THEN
    v_role := 'hr_admin';
  ELSIF v_is_owner OR v_is_leader THEN
    v_role := 'leader';
  ELSE
    v_role := 'user';
  END IF;

  -- 5. Linked member (only if NOT a leader/owner)
  IF NOT (v_is_owner OR v_is_leader) THEN
    SELECT to_jsonb(tm) - 'created_at' INTO v_linked
    FROM (
      SELECT id, name, email, role, skills_data, work_style_data,
             chronotype, feedback_style, recognition_style,
             motivators, user_manual, updated_at
      FROM public.team_members
      WHERE linked_user_id = p_user_id
        AND invite_status = 'accepted'
      LIMIT 1
    ) tm;
  END IF;

  -- 6. Pending invite by email (only if not linked)
  IF v_linked IS NULL AND p_user_email IS NOT NULL THEN
    v_pending := EXISTS (
      SELECT 1 FROM public.team_members
      WHERE email = p_user_email
        AND invite_status = 'pending'
        AND linked_user_id IS NULL
      LIMIT 1
    );
  END IF;

  RETURN jsonb_build_object(
    'workspace_id', v_workspace_id,
    'role', v_role,
    'linked_member', v_linked,
    'has_pending_invite', v_pending
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_context(uuid, text) TO authenticated;