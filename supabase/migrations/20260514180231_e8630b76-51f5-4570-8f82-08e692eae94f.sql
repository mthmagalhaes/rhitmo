ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS archived_by uuid NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_active_by_owner
  ON public.team_members (user_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_active_by_team
  ON public.team_members (team_id)
  WHERE archived_at IS NULL;