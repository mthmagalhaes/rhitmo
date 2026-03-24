

## Plan: Remove Duplicate Review Flow — Single Entry Point

### Problem
Two parallel review creation flows exist:
- **Top bar button** "Avaliação de Desempenho" → `CreateFormalReviewDialog` → `FormalReviewSheet` (new, with evidence preview, rich text — **keep**)
- **PerformanceReviewList** "Nova Avaliação" → `NewReviewDialog` (old, separate dialog — **remove**)

The `FormalReviewSheet` already uses `RichTextEditor` (Tiptap) from a previous implementation. No rich text changes needed.

### Changes

**1. `src/components/PerformanceReviewList.tsx`** — Remove old dialog, wire to parent

- Remove `NewReviewDialog` import and render (lines 8, 151-157)
- Remove `showNewDialog` state (line 30)
- Replace "Nova Avaliação" button with a callback prop: `onCreateReview?: () => void`
- Update buttons (lines 96-99, 111-114) to call `onCreateReview?.()` instead of `setShowNewDialog(true)`
- Rename button text from "Nova Avaliação" to "Avaliação de Desempenho" with `FileText` icon

**2. `src/pages/MemberDetails.tsx`** — Remove top bar button, pass callback to list

- Remove the "Avaliação de Desempenho" button from the top action bar (lines 415-418) — this eliminates the duplicate entry point
- Pass `onCreateReview={() => setFormalReviewOpen(true)}` prop to `PerformanceReviewList` so the button inside the reviews section opens the unified flow
- All other state (`formalReviewOpen`, `reviewSheetOpen`, `selectedReviewId`) and components (`CreateFormalReviewDialog`, `FormalReviewSheet`) remain unchanged

**3. `src/components/NewReviewDialog.tsx`** — Add deprecation comment

Mark as `@deprecated` with comment. Not deleted yet since `PerformanceReviewList` currently imports it — after the edit it will no longer be imported by any file.

### No database changes needed

### Result
Single button "Avaliação de Desempenho" inside the reviews section → `CreateFormalReviewDialog` (evidence preview) → `FormalReviewSheet` (rich text + competencies)

