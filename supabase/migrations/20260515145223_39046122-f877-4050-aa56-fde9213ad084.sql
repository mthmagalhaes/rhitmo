-- Harden tm_update so a linked member cannot reassign themselves to a
-- different team or escalate privileges by editing sensitive columns.
-- Leaders / admins keep full update rights via rls_check_member_access /
-- is_admin(). Self-edits are limited to columns that are safe for a member
-- to change (e.g. avatar_url, name) — team_id and role-like columns are
-- frozen via a per-row WITH CHECK.

DROP POLICY IF EXISTS "tm_update" ON public.team_members;

CREATE POLICY "tm_update"
ON public.team_members
FOR UPDATE
USING (
  rls_check_member_access(team_id)
  OR (linked_user_id = effective_user_id())
  OR is_admin()
)
WITH CHECK (
  -- Leader of the team or admin: anything goes (existing behavior).
  rls_check_member_access(team_id)
  OR is_admin()
  -- Self-edit by the linked member: only allowed if the sensitive
  -- columns are unchanged from the existing row.
  OR (
    linked_user_id = effective_user_id()
    AND team_id = (SELECT tm.team_id FROM public.team_members tm WHERE tm.id = team_members.id)
    AND linked_user_id = (SELECT tm.linked_user_id FROM public.team_members tm WHERE tm.id = team_members.id)
    AND COALESCE(role, '') = COALESCE((SELECT tm.role FROM public.team_members tm WHERE tm.id = team_members.id), '')
    AND performance_score IS NOT DISTINCT FROM (SELECT tm.performance_score FROM public.team_members tm WHERE tm.id = team_members.id)
    AND archived_at IS NOT DISTINCT FROM (SELECT tm.archived_at FROM public.team_members tm WHERE tm.id = team_members.id)
    AND archived_by IS NOT DISTINCT FROM (SELECT tm.archived_by FROM public.team_members tm WHERE tm.id = team_members.id)
  )
);