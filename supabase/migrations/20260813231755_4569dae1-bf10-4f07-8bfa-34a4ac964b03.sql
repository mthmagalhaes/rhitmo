
CREATE OR REPLACE FUNCTION public.is_workspace_participant(_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = _workspace_id
      AND (w.owner_id = auth.uid() OR auth.uid() = ANY(COALESCE(w.hr_admin_ids, '{}'::uuid[])))
  ) OR EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.workspace_id = _workspace_id AND t.leader_user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.team_members tm ON tm.team_id = t.id
    WHERE t.workspace_id = _workspace_id AND tm.linked_user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.member_belongs_to_workspace(_member_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.id = _member_id AND t.workspace_id = _workspace_id
  );
END;
$$;

DROP POLICY IF EXISTS "Authenticated users can insert kudos" ON public.kudos;

CREATE POLICY "Members can send kudos within their workspace"
ON public.kudos
FOR INSERT
TO authenticated
WITH CHECK (
  from_user_id = auth.uid()
  AND public.is_workspace_participant(workspace_id)
  AND public.member_belongs_to_workspace(to_member_id, workspace_id)
);

ALTER FUNCTION public._assert_rpc_runs(text) SET search_path = public;
