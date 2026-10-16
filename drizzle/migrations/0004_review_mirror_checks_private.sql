
CREATE TABLE public.review_mirror_checks (
  review_id uuid PRIMARY KEY REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  checked_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_mirror_checks TO authenticated;
GRANT ALL ON public.review_mirror_checks TO service_role;
ALTER TABLE public.review_mirror_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review managers manage mirror checks" ON public.review_mirror_checks FOR ALL TO authenticated
  USING (public.can_manage_review(review_id)) WITH CHECK (public.can_manage_review(review_id));
COMMENT ON COLUMN public.performance_reviews.mirror_findings IS 'DEPRECATED: replaced by review_mirror_checks (members can read shared reviews)';
COMMENT ON COLUMN public.performance_reviews.mirror_checked_at IS 'DEPRECATED: replaced by review_mirror_checks';
