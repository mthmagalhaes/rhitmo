
CREATE OR REPLACE FUNCTION public.delete_archived_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team_id uuid;
  v_workspace_id uuid;
  v_archived_at timestamptz;
  v_leader_user_id uuid;
  v_is_authorized boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT tm.team_id, tm.archived_at, t.leader_user_id, t.workspace_id
    INTO v_team_id, v_archived_at, v_leader_user_id, v_workspace_id
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.id = p_member_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'member_not_found';
  END IF;

  IF v_archived_at IS NULL THEN
    RAISE EXCEPTION 'member_not_archived';
  END IF;

  IF v_archived_at > now() - interval '24 hours' THEN
    RAISE EXCEPTION 'archive_cooldown_active';
  END IF;

  -- Authorization: leader of the team, HR admin of workspace, or workspace owner.
  IF v_leader_user_id = v_uid THEN
    v_is_authorized := true;
  ELSIF public.is_hr_admin_of_workspace(v_uid, v_workspace_id) THEN
    v_is_authorized := true;
  ELSIF EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = v_workspace_id AND w.owner_user_id = v_uid
  ) THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.team_members WHERE id = p_member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_archived_member(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.delete_archived_member(uuid) TO authenticated;
