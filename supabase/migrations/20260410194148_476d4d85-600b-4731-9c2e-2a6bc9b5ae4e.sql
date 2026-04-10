
-- =============================================================
-- FIX: Break infinite recursion in workspaces/teams/team_members
-- =============================================================

-- 1) Helper: Can user access a workspace? (owner / leader of a team / hr_admin)
CREATE OR REPLACE FUNCTION public.rls_check_workspace_access(_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = _workspace_id
      AND w.is_active = true
      AND (
        w.owner_id = effective_user_id()
        OR effective_user_id() = ANY(COALESCE(w.hr_admin_ids, '{}'))
        OR EXISTS (
          SELECT 1 FROM teams t
          WHERE t.workspace_id = w.id
            AND t.leader_user_id = effective_user_id()
        )
      )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rls_check_workspace_access FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_check_workspace_access TO authenticated;

-- 2) Helper: Can user manage a team? (leader or workspace owner)
CREATE OR REPLACE FUNCTION public.rls_check_team_access(_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = _team_id
      AND w.is_active = true
      AND (t.leader_user_id = effective_user_id() OR w.owner_id = effective_user_id())
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rls_check_team_access FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_check_team_access TO authenticated;

-- 3) Helper: Can user read a team? (leader, owner, or HR admin)
CREATE OR REPLACE FUNCTION public.rls_check_team_read_access(_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = _team_id
      AND w.is_active = true
      AND (
        t.leader_user_id = effective_user_id()
        OR w.owner_id = effective_user_id()
        OR effective_user_id() = ANY(COALESCE(w.hr_admin_ids, '{}'))
      )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rls_check_team_read_access FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_check_team_read_access TO authenticated;

-- 4) Helper: Can user manage a member? (leader or workspace owner)
CREATE OR REPLACE FUNCTION public.rls_check_member_access(_member_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = _member_team_id
      AND w.is_active = true
      AND (t.leader_user_id = effective_user_id() OR w.owner_id = effective_user_id())
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rls_check_member_access FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_check_member_access TO authenticated;

-- 5) Helper: Can user read a member? (leader, owner, or HR admin)
CREATE OR REPLACE FUNCTION public.rls_check_member_read_access(_member_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = _member_team_id
      AND w.is_active = true
      AND (
        t.leader_user_id = effective_user_id()
        OR w.owner_id = effective_user_id()
        OR effective_user_id() = ANY(COALESCE(w.hr_admin_ids, '{}'))
      )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rls_check_member_read_access FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_check_member_read_access TO authenticated;

-- =============================================================
-- DROP old policies on workspaces
-- =============================================================
DROP POLICY IF EXISTS "Owners podem ver seus workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners podem criar workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners podem atualizar seus workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners podem deletar seus workspaces" ON workspaces;
DROP POLICY IF EXISTS "Leaders can view workspace" ON workspaces;
DROP POLICY IF EXISTS "HR Admin pode ver workspace" ON workspaces;
DROP POLICY IF EXISTS "Admin full access workspaces" ON workspaces;

-- Recreate workspaces policies (NO cross-table subqueries)
CREATE POLICY "ws_owner_select" ON workspaces FOR SELECT
  TO authenticated USING (effective_user_id() = owner_id);

CREATE POLICY "ws_leader_select" ON workspaces FOR SELECT
  TO authenticated USING (rls_check_workspace_access(id));

CREATE POLICY "ws_owner_insert" ON workspaces FOR INSERT
  TO authenticated WITH CHECK (effective_user_id() = owner_id);

CREATE POLICY "ws_owner_update" ON workspaces FOR UPDATE
  TO authenticated USING (effective_user_id() = owner_id);

CREATE POLICY "ws_owner_delete" ON workspaces FOR DELETE
  TO authenticated USING (effective_user_id() = owner_id);

CREATE POLICY "ws_admin" ON workspaces FOR ALL
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- =============================================================
-- DROP old policies on teams
-- =============================================================
DROP POLICY IF EXISTS "Owners and leaders can view teams" ON teams;
DROP POLICY IF EXISTS "Owners and leaders can create teams" ON teams;
DROP POLICY IF EXISTS "Owners and leaders can update teams" ON teams;
DROP POLICY IF EXISTS "Owners can delete teams" ON teams;
DROP POLICY IF EXISTS "HR Admin pode ver times" ON teams;
DROP POLICY IF EXISTS "Admin full access teams" ON teams;

-- Recreate teams policies using helper functions
CREATE POLICY "teams_read" ON teams FOR SELECT
  TO authenticated USING (rls_check_team_read_access(id));

CREATE POLICY "teams_insert" ON teams FOR INSERT
  TO authenticated WITH CHECK (rls_check_workspace_access(workspace_id));

CREATE POLICY "teams_update" ON teams FOR UPDATE
  TO authenticated USING (rls_check_team_access(id));

CREATE POLICY "teams_delete" ON teams FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.rls_check_workspace_access(workspace_id) -- owner check done inside
    ) OR rls_check_team_access(id)
  );

CREATE POLICY "teams_admin" ON teams FOR ALL
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- =============================================================
-- DROP old policies on team_members
-- =============================================================
DROP POLICY IF EXISTS "Leaders and owners can view team members" ON team_members;
DROP POLICY IF EXISTS "Leaders and owners can create team members" ON team_members;
DROP POLICY IF EXISTS "Leaders and owners can update team members" ON team_members;
DROP POLICY IF EXISTS "Leaders and owners can delete team members" ON team_members;
DROP POLICY IF EXISTS "HR Admin pode ver membros" ON team_members;
DROP POLICY IF EXISTS "Admin full access team_members" ON team_members;
DROP POLICY IF EXISTS "Linked users can view own profile" ON team_members;
DROP POLICY IF EXISTS "Linked users can update own basic profile" ON team_members;

-- Recreate team_members policies using helper functions
CREATE POLICY "tm_read" ON team_members FOR SELECT
  TO authenticated USING (
    rls_check_member_read_access(team_id)
    OR linked_user_id = auth.uid()
  );

CREATE POLICY "tm_insert" ON team_members FOR INSERT
  TO authenticated WITH CHECK (rls_check_member_access(team_id));

CREATE POLICY "tm_update" ON team_members FOR UPDATE
  TO authenticated USING (
    rls_check_member_access(team_id)
    OR linked_user_id = auth.uid()
  );

CREATE POLICY "tm_delete" ON team_members FOR DELETE
  TO authenticated USING (rls_check_member_access(team_id));

CREATE POLICY "tm_admin" ON team_members FOR ALL
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
