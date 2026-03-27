

## Plan: Read-Only Review View Page for Direct Reports

### Summary
Create a `/review/:reviewId` route page where direct reports can view their shared performance review in read-only Tiptap, add comments, and acknowledge reading.

### Changes

**1. New `src/pages/DirectReportReviewView.tsx`**

Full page component:
- `useParams()` to get `reviewId`
- Fetch review from `performance_reviews` (RLS ensures only shared reviews for linked member are returned)
- Fetch member info from `team_members` where `linked_user_id = auth.uid()`
- Tiptap editor in read-only mode (`editable: false`) with the review CSS classes
- Status badge: Enviada (blue) or Confirmada (green)
- `ReviewCommentsSection` component (already exists)
- "Confirmar Leitura" button → mutation to set `acknowledged_at = now()`
- After acknowledging, show confirmation timestamp instead of button
- Loading/error/not-found states
- Back button to `/dashboard`

**2. Update `src/App.tsx`**

Add route:
```
<Route path="/review/:reviewId" element={<DirectReportReviewView />} />
```
Place before the catch-all `*` route. No guard needed — RLS handles access control.

### No database changes needed
All tables and RLS policies already exist (`performance_reviews` with `Linked members can view shared reviews` SELECT policy, `member_can_acknowledge_review` UPDATE policy, `review_comments` with member access policies).

### Technical Notes
- Tiptap is initialized with `editable: false` and `content` set from the review HTML — no toolbar rendered
- The existing `ReviewCommentsSection` component is reused as-is
- Review CSS classes (`.review-section`, `.section-header`, etc.) from `index.css` will style the content automatically via `.ProseMirror` / `.prose`
- The page imports `useEditor` and `EditorContent` directly from `@tiptap/react` for the read-only view (lighter than `RichTextEditor` which includes toolbar)

