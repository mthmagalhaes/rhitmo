ALTER TABLE performance_reviews 
ADD COLUMN IF NOT EXISTS shared_with_member boolean DEFAULT false;

CREATE POLICY "Linked members can view shared reviews"
ON performance_reviews FOR SELECT
USING (
  shared_with_member = true 
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = performance_reviews.member_id
    AND tm.linked_user_id = auth.uid()
  )
);