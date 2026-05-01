ALTER TABLE public.upcoming_meetings
  ADD COLUMN IF NOT EXISTS brief_dm_sent_at timestamptz;

ALTER TABLE public.pulse_surveys
  ADD COLUMN IF NOT EXISTS dm_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_upcoming_meetings_brief_dm_pending
  ON public.upcoming_meetings (start_time)
  WHERE brief_dm_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pulse_surveys_dm_pending
  ON public.pulse_surveys (sent_at)
  WHERE dm_sent_at IS NULL AND status = 'pending';