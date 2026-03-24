

## Plan: Unify Review Flow + Rich Text Editor

### Summary
Remove the "Nova Anotação" button from MemberDetails action bar (keeping the NewNoteDialog accessible via the "+" button in FeedbackTimeline if it exists), replace the plain Textarea in FormalReviewSheet with the existing RichTextEditor component, and rename the button to "Avaliação de Desempenho".

### Analysis
- `NewNoteDialog` (line 770) creates feedbacks, not reviews — but user wants to consolidate to a single "Avaliação de Desempenho" button
- The project already has `src/components/ui/rich-text-editor.tsx` with Tiptap (Bold, Italic, H1, H2, BulletList, OrderedList) — no new dependencies needed
- `dialogOpen` state (line 53) and the `openNote` deep link (lines 71-77) reference the NewNoteDialog

### Changes

**1. `src/components/review/FormalReviewSheet.tsx`** — Replace Textarea with RichTextEditor

- Import `RichTextEditor` from `@/components/ui/rich-text-editor`
- Remove `Textarea` import
- Replace the Textarea block (lines 263-269) with:
  ```tsx
  <RichTextEditor
    content={draftText}
    onChange={setDraftText}
    placeholder="Digite a avaliação geral do liderado no período..."
    minHeight="400px"
  />
  ```
- Remove `Label` import if no longer used elsewhere (it's still used in competencies tab, so keep it)

**2. `src/pages/MemberDetails.tsx`** — Remove "Nova Anotação" button, rename "Avaliação Formal"

- Remove lines 419-422 (the "Nova Anotação" button)
- Rename "Avaliação Formal" to "Avaliação de Desempenho" (line 417)
- Keep `dialogOpen` state and `NewNoteDialog` render — they're still needed for the `?openNote=true` deep link and the feedback note creation flow from other entry points
- Alternatively, if user wants full removal: remove `dialogOpen` state, the `useEffect` for `openNote`, and the `NewNoteDialog` render. But this would break the deep link from nudges.

**Decision**: Keep `NewNoteDialog` but remove its button from the action bar. The dialog remains accessible via deep link (`?openNote=true`) for nudge-driven note creation.

### No database changes needed
`performance_reviews.content` already stores text — it will now store HTML instead, which is backward-compatible (plain text renders fine in rich text editors).

