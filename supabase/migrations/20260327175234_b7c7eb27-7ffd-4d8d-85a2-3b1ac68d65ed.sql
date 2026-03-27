
-- New columns on performance_reviews
ALTER TABLE performance_reviews
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

-- Comments table
CREATE TABLE IF NOT EXISTS review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  section TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_review_comments_review_id ON review_comments(review_id);
CREATE INDEX idx_review_comments_user_id ON review_comments(user_id);

ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;

-- Member access: can read/create comments on their shared reviews
CREATE POLICY "review_comments_member_access"
ON review_comments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM performance_reviews pr
    JOIN team_members tm ON pr.member_id = tm.id
    WHERE pr.id = review_comments.review_id
    AND tm.linked_user_id = effective_user_id()
    AND pr.shared_with_member = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM performance_reviews pr
    JOIN team_members tm ON pr.member_id = tm.id
    WHERE pr.id = review_comments.review_id
    AND tm.linked_user_id = effective_user_id()
    AND pr.shared_with_member = true
  )
  AND user_id = effective_user_id()
);

-- Manager access: full access on comments for their team's reviews
CREATE POLICY "review_comments_manager_access"
ON review_comments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM performance_reviews pr
    JOIN team_members tm ON pr.member_id = tm.id
    JOIN teams t ON tm.team_id = t.id
    JOIN workspaces w ON t.workspace_id = w.id
    WHERE pr.id = review_comments.review_id
    AND w.owner_id = effective_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM performance_reviews pr
    JOIN team_members tm ON pr.member_id = tm.id
    JOIN teams t ON tm.team_id = t.id
    JOIN workspaces w ON t.workspace_id = w.id
    WHERE pr.id = review_comments.review_id
    AND w.owner_id = effective_user_id()
  )
  AND user_id = effective_user_id()
);

-- Allow member to update acknowledged_at on their own shared reviews
CREATE POLICY "member_can_acknowledge_review"
ON performance_reviews
FOR UPDATE
TO authenticated
USING (
  shared_with_member = true
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = performance_reviews.member_id
    AND tm.linked_user_id = auth.uid()
  )
)
WITH CHECK (
  shared_with_member = true
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = performance_reviews.member_id
    AND tm.linked_user_id = auth.uid()
  )
);
