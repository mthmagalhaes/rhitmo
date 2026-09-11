ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS hr_tour_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_tour_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hr_tour_attempts integer NOT NULL DEFAULT 0;