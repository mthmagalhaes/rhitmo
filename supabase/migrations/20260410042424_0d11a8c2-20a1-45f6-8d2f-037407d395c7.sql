
-- Admin full access on workspaces
CREATE POLICY "Admin full access workspaces"
ON public.workspaces FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admin full access on teams
CREATE POLICY "Admin full access teams"
ON public.teams FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admin full access on team_members
CREATE POLICY "Admin full access team_members"
ON public.team_members FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
