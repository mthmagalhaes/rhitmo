
-- Drop 4 policies com TO PUBLIC
DROP POLICY IF EXISTS "Owners podem ver membros do time" ON public.team_members;
DROP POLICY IF EXISTS "Owners podem criar membros no time" ON public.team_members;
DROP POLICY IF EXISTS "Owners podem atualizar membros do time" ON public.team_members;
DROP POLICY IF EXISTS "Owners podem deletar membros do time" ON public.team_members;

-- Recriar com TO authenticated explicito
CREATE POLICY "Owners podem ver membros do time"
ON public.team_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND w.owner_id = effective_user_id()
    AND w.is_active = true
  )
);

CREATE POLICY "Owners podem criar membros no time"
ON public.team_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND w.owner_id = effective_user_id()
    AND w.is_active = true
  )
);

CREATE POLICY "Owners podem atualizar membros do time"
ON public.team_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND w.owner_id = effective_user_id()
    AND w.is_active = true
  )
);

CREATE POLICY "Owners podem deletar membros do time"
ON public.team_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND w.owner_id = effective_user_id()
    AND w.is_active = true
  )
);
