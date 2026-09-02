ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS source_fidelity text;

ALTER TABLE public.feedbacks
  DROP CONSTRAINT IF EXISTS feedbacks_source_fidelity_check;
ALTER TABLE public.feedbacks
  ADD CONSTRAINT feedbacks_source_fidelity_check
  CHECK (source_fidelity IS NULL OR source_fidelity IN ('transcript','summary'));