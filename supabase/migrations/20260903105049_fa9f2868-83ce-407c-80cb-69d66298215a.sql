CREATE OR REPLACE FUNCTION public.get_account_context(p_user_id uuid, p_user_email text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'is_workspace_owner', false,
      'is_team_leader', false,
      'linked_member', NULL,
      'has_pending_invite', false
    );
  END IF;

  SELECT id INTO v_workspace_id
  FROM public.workspaces
  WHERE owner_id = p_user_id AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_workspace_id IS NOT NULL THEN
    v_is_owner := true;
  END IF;

  IF NOT v_is_owner THEN
    SELECT id INTO v_workspace_id
    FROM public.workspaces
    WHERE p_user_id = ANY(hr_admin_ids) AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    IF v_workspace_id IS NOT NULL THEN
      v_is_hr_admin := true;
    END IF;
  ELSE
    v_is_hr_admin := EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE id = v_workspace_id AND p_user_id = ANY(hr_admin_ids)
    );
  END IF;

  IF v_workspace_id IS NULL THEN
    SELECT t.workspace_id INTO v_workspace_id
    FROM public.teams t
    JOIN public.workspaces w ON w.id = t.workspace_id
    WHERE t.leader_user_id = p_user_id AND w.is_active = true
    ORDER BY t.created_at ASC
    LIMIT 1;
    IF v_workspace_id IS NOT NULL THEN
      v_is_leader := true;
    END IF;
  ELSE
    v_is_leader := EXISTS (
      SELECT 1 FROM public.teams WHERE leader_user_id = p_user_id LIMIT 1
    );
  END IF;

  IF v_is_hr_admin THEN
    v_role := 'hr_admin';
  ELSIF v_is_owner OR v_is_leader THEN
    v_role := 'leader';
  ELSE
    v_role := 'user';
  END IF;

  -- O vínculo de liderado é resolvido SEMPRE, inclusive para líderes e owners.
  -- Uma mesma pessoa pode liderar times e, ao mesmo tempo, ser liderada por
  -- outra (ex.: gerente que reporta ao C-Level). Quem decide qual visão exibir
  -- é o modo ativo no frontend (`useActiveMode` / `resolvePersona`), não esta
  -- função. Antes havia um IF NOT (owner OR leader) aqui, o que tornava o
  -- vínculo invisível para líderes.
  SELECT to_jsonb(tm) - 'created_at' INTO v_linked
  FROM (
    SELECT id, name, email, role, skills_data, work_style_data,
           chronotype, feedback_style, recognition_style,
           motivators, user_manual, updated_at
    FROM public.team_members
    WHERE linked_user_id = p_user_id
      AND COALESCE(invite_status, 'none') <> 'revoked'
      AND archived_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1
  ) tm;

  IF v_linked IS NULL AND p_user_email IS NOT NULL THEN
    v_pending := EXISTS (
      SELECT 1 FROM public.team_members
      WHERE email = p_user_email
        AND linked_user_id IS NULL
        AND COALESCE(invite_status, 'none') IN ('pending', 'none')
      LIMIT 1
    );
  END IF;

  RETURN jsonb_build_object(
    'workspace_id', v_workspace_id,
    'role', v_role,
    'is_workspace_owner', v_is_owner,
    'is_team_leader', v_is_leader,
    'linked_member', v_linked,
    'has_pending_invite', v_pending
  );
END;
$function$;