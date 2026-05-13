ALTER TABLE public.recall_bots
  ADD COLUMN IF NOT EXISTS attempt_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leader_check_attempts int NOT NULL DEFAULT 0;