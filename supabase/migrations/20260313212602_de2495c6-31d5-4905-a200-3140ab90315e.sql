-- 1. Revoke all access from anon role
REVOKE ALL ON public.team_members FROM anon;

-- 2. Drop all existing policies
DROP POLICY IF EXISTS "Owners podem ver membros do time" ON public.team_members;
DROP POLICY IF EXISTS "HR Admin pode ver membros" ON public.team_members;
DROP POLICY IF EXISTS "Linked users can view own profile" ON public.team_members;
DROP POLICY IF EXISTS "Owners podem criar membros no time" ON public.team_members;
DROP POLICY IF EXISTS "Owners podem atualizar membros do time" ON public.team_members;
DROP POLICY IF EXISTS "Linked users can update own basic profile" ON public.team_members;
DROP POLICY IF EXISTS "Owners podem deletar membros do time" ON public.team_members;

-- 3. Recreate all policies with explicit TO authenticated

CREATE POLICY "Owners podem ver membros do time"
ON public.team_members FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM teams t JOIN workspaces w ON w.id = t.workspace_id
  WHERE t.id = team_members.team_id AND w.owner_id = effective_user_id() AND w.is_active = true
));

CREATE POLICY "HR Admin pode ver membros"
ON public.team_members FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM teams t JOIN workspaces w ON w.id = t.workspace_id
  WHERE t.id = team_members.team_id AND is_hr_admin_of_workspace(w.id)
));

CREATE POLICY "Linked users can view own profile"
ON public.team_members FOR SELECT TO authenticated
USING (linked_user_id = auth.uid());

CREATE POLICY "Owners podem criar membros no time"
ON public.team_members FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM teams t JOIN workspaces w ON w.id = t.workspace_id
  WHERE t.id = team_members.team_id AND w.owner_id = effective_user_id() AND w.is_active = true
));

CREATE POLICY "Owners podem atualizar membros do time"
ON public.team_members FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM teams t JOIN workspaces w ON w.id = t.workspace_id
  WHERE t.id = team_members.team_id AND w.owner_id = effective_user_id() AND w.is_active = true
));

CREATE POLICY "Linked users can update own basic profile"
ON public.team_members FOR UPDATE TO authenticated
USING (linked_user_id = auth.uid())
WITH CHECK (linked_user_id = auth.uid());

CREATE POLICY "Owners podem deletar membros do time"
ON public.team_members FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM teams t JOIN workspaces w ON w.id = t.workspace_id
  WHERE t.id = team_members.team_id AND w.owner_id = effective_user_id() AND w.is_active = true
));

-- 4. Ensure authenticated has proper grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;