

## Plan: Remove Review Comments from UI

### Summary
Strip the `ReviewCommentsSection` from both the direct report review page and the direct report dashboard. Keep the database table intact for potential future use.

### Changes

**1. `src/pages/DirectReportReviewView.tsx`**
- Remove `Separator` and `ReviewCommentsSection` imports
- Remove `<Separator />` and `<ReviewCommentsSection reviewId={reviewId!} />` (lines 130-132)

**2. `src/components/dashboard/DirectReportDashboard.tsx`**
- Remove `ReviewCommentsSection` import (line 23)
- Remove `<ReviewCommentsSection reviewId={selectedReview.id} />` block (lines 757-760)

### Not changed
- `review_comments` table and RLS policies kept in database (dormant)
- `ReviewCommentsSection.tsx` file kept (unused but preserved)
- `FormalReviewSheet.tsx` — already has no comments section

