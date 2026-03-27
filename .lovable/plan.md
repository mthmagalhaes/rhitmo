

## Plan: Review Sharing & Comments System

### Summary
Add `sent_at` and `acknowledged_at` columns to `performance_reviews`, create `review_comments` table with RLS, and build comment UI in the direct report's review view.

### Database Migration

**Add columns + create table:**

```sql
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
```

**RLS policies on `review_comments`:**
- **Member access**: SELECT/INSERT on comments for reviews where `tm.linked_user_id = effective_user_id()` AND `pr.shared_with_member = true`
- **Manager access**: ALL on comments for reviews where `w.owner_id = effective_user_id()`
- **Delete own**: users can delete their own comments (`user_id = effective_user_id()`)

Note: No `REFERENCES auth.users(id)` on `user_id` — following project convention (no FK to auth schema).

### Frontend Changes

**1. `src/components/review/FormalReviewSheet.tsx`**
- Set `sent_at` timestamp when sending review (alongside `shared_with_member = true`)

**2. `src/components/review/ReviewCommentsSection.tsx`** (new)
- Fetch comments for a review via `review_comments` table
- Display comments with author info, timestamp, optional section tag
- Input field to add new comment
- Delete button for own comments

**3. `src/components/dashboard/DirectReportDashboard.tsx`**
- Add "Confirmar Leitura" button on shared reviews that sets `acknowledged_at`
- Show `ReviewCommentsSection` when viewing a shared review
- Show acknowledgment status badge

### Technical Notes
- `acknowledged_at` serves as the member's explicit confirmation (vs `member_viewed_at` which is auto-set on open)
- Comments use `effective_user_id()` in RLS for admin impersonation compatibility
- No FK to `auth.users` to avoid cross-schema issues — user identity resolved via `auth.uid()` at query time

