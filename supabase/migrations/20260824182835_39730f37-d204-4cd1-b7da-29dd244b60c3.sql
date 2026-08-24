ALTER TABLE public.upcoming_meetings
  ADD COLUMN IF NOT EXISTS auto_transcribe_opt_in boolean NOT NULL DEFAULT false;