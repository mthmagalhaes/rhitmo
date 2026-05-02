ALTER TABLE public.slack_integrations
  ADD COLUMN IF NOT EXISTS welcome_dm_sent_at TIMESTAMPTZ;