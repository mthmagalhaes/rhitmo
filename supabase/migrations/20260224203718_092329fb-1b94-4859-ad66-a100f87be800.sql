ALTER TABLE public.upcoming_meetings
ADD COLUMN IF NOT EXISTS brief_cache JSONB,
ADD COLUMN IF NOT EXISTS brief_generated_at TIMESTAMPTZ;