CREATE POLICY "Formal reviews deletable only while draft"
ON public.performance_reviews
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (
  NOT (coalesce(period_type,'') = 'formal' OR coalesce(authoring_mode,'') = 'culture_guided')
  OR (coalesce(shared_with_member,false) = false AND acknowledged_at IS NULL)
);