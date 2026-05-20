
ALTER TABLE public.slack_ambient_evidence
  ADD COLUMN IF NOT EXISTS attribution text NOT NULL DEFAULT 'author';

ALTER TABLE public.slack_ambient_evidence
  DROP CONSTRAINT IF EXISTS slack_ambient_evidence_unique_msg;

ALTER TABLE public.slack_ambient_evidence
  ADD CONSTRAINT slack_ambient_evidence_unique_msg
  UNIQUE (slack_channel_id, slack_message_ts, member_id, attribution);

ALTER TABLE public.slack_ambient_evidence
  ADD CONSTRAINT slack_ambient_evidence_attribution_check
  CHECK (attribution IN ('author','mentioned','reaction'));
