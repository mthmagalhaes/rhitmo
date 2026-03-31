
CREATE TABLE public.pending_slack_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  slack_user_id TEXT NOT NULL,
  invited_by UUID NOT NULL,
  member_has_account BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'sent',
  reminded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

CREATE INDEX idx_pending_invites_status ON public.pending_slack_invites(status);
CREATE INDEX idx_pending_invites_member ON public.pending_slack_invites(member_id);

ALTER TABLE public.pending_slack_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners can view invites"
ON public.pending_slack_invites
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = pending_slack_invites.member_id
      AND w.owner_id = auth.uid()
  )
);
