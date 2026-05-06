ALTER TABLE public.quarterly_recaps
  ADD COLUMN IF NOT EXISTS peer_voices jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS network_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS slack_delivered_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_quarterly_recaps_slack_delivery
  ON public.quarterly_recaps (manager_id, ai_generated_at)
  WHERE slack_delivered_at IS NULL;