ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS evidence_id uuid REFERENCES public.slack_ambient_evidence(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_feedbacks_evidence_id
  ON public.feedbacks(evidence_id)
  WHERE evidence_id IS NOT NULL;