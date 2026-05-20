
ALTER TABLE public.slack_ambient_evidence
  ADD COLUMN IF NOT EXISTS thread_root_ts text,
  ADD COLUMN IF NOT EXISTS thread_topic text,
  ADD COLUMN IF NOT EXISTS theme_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS executive_summary text,
  ADD COLUMN IF NOT EXISTS key_quote text,
  ADD COLUMN IF NOT EXISTS participants jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_slack_evidence_thread
  ON public.slack_ambient_evidence (slack_channel_id, thread_root_ts)
  WHERE thread_root_ts IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_slack_evidence_theme_tags
  ON public.slack_ambient_evidence USING GIN (theme_tags);

CREATE INDEX IF NOT EXISTS idx_slack_evidence_member_recent
  ON public.slack_ambient_evidence (member_id, status, captured_at DESC);
