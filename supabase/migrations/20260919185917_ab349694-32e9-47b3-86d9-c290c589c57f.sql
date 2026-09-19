DROP POLICY IF EXISTS "Linked members can insert own self upwards reviews" ON public.performance_reviews;
CREATE POLICY "Linked members can insert own self upwards reviews"
ON public.performance_reviews FOR INSERT TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND review_type = ANY (ARRAY['self'::text, 'upwards'::text])
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = performance_reviews.member_id
      AND tm.linked_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Linked members can update own self upwards reviews" ON public.performance_reviews;
CREATE POLICY "Linked members can update own self upwards reviews"
ON public.performance_reviews FOR UPDATE TO authenticated
USING (
  author_user_id = auth.uid()
  AND review_type = ANY (ARRAY['self'::text, 'upwards'::text])
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = performance_reviews.member_id
      AND tm.linked_user_id = auth.uid()
  )
)
WITH CHECK (
  author_user_id = auth.uid()
  AND review_type = ANY (ARRAY['self'::text, 'upwards'::text])
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = performance_reviews.member_id
      AND tm.linked_user_id = auth.uid()
  )
);