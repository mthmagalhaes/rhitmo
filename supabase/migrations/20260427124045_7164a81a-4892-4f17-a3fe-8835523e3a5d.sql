CREATE TABLE IF NOT EXISTS public.slack_app_home_throttle (
  slack_user_id TEXT NOT NULL PRIMARY KEY,
  slack_team_id TEXT NOT NULL,
  last_welcome_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_dm_menu_sent_at TIMESTAMPTZ
);

ALTER TABLE public.slack_app_home_throttle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages slack throttle"
  ON public.slack_app_home_throttle
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_slack_app_home_throttle_team ON public.slack_app_home_throttle(slack_team_id);