ALTER TABLE public.workspace_slack_settings
  ADD COLUMN IF NOT EXISTS rollup_frequency text NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS last_rollup_at timestamptz;

ALTER TABLE public.workspace_slack_settings
  DROP CONSTRAINT IF EXISTS workspace_slack_settings_rollup_frequency_check;

ALTER TABLE public.workspace_slack_settings
  ADD CONSTRAINT workspace_slack_settings_rollup_frequency_check
  CHECK (rollup_frequency IN ('off','weekly','biweekly','monthly'));