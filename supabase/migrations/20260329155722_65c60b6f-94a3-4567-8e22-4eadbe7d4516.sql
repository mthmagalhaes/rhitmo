ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS is_beta_user BOOLEAN DEFAULT FALSE;
UPDATE workspaces SET is_beta_user = TRUE WHERE created_at < NOW();
COMMENT ON COLUMN workspaces.is_beta_user IS 'Grandfathered beta users with unlimited access';