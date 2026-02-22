ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS leader_sync_data jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS leader_sync_completed_at timestamptz DEFAULT NULL;