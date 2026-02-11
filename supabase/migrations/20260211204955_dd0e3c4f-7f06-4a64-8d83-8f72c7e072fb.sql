
-- Drop existing policies
DROP POLICY "Managers can view own meeting transcripts" ON public.meeting_transcripts;
DROP POLICY "Managers can create meeting transcripts" ON public.meeting_transcripts;
DROP POLICY "Managers can update own meeting transcripts" ON public.meeting_transcripts;
DROP POLICY "Managers can delete own meeting transcripts" ON public.meeting_transcripts;

-- Recreate with explicit TO authenticated

CREATE POLICY "Managers can view own meeting transcripts"
ON public.meeting_transcripts FOR SELECT
TO authenticated
USING (
  manager_id = effective_user_id()
  AND EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = meeting_transcripts.member_id
    AND w.is_active = true
  )
);

CREATE POLICY "Managers can create meeting transcripts"
ON public.meeting_transcripts FOR INSERT
TO authenticated
WITH CHECK (
  manager_id = effective_user_id()
  AND EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = meeting_transcripts.member_id
    AND w.owner_id = effective_user_id()
    AND w.is_active = true
  )
);

CREATE POLICY "Managers can update own meeting transcripts"
ON public.meeting_transcripts FOR UPDATE
TO authenticated
USING (
  manager_id = effective_user_id()
  AND EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = meeting_transcripts.member_id
    AND w.is_active = true
  )
);

CREATE POLICY "Managers can delete own meeting transcripts"
ON public.meeting_transcripts FOR DELETE
TO authenticated
USING (
  manager_id = effective_user_id()
  AND EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = meeting_transcripts.member_id
    AND w.is_active = true
  )
);
