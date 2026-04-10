
-- Fix teams_delete policy with correct syntax
DROP POLICY IF EXISTS "teams_delete" ON teams;
CREATE POLICY "teams_delete" ON teams FOR DELETE
  TO authenticated USING (rls_check_team_access(id));
