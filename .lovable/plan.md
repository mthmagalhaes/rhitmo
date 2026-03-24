

## Plan: Fix 3 Competency Flow Issues

### Fix 1: Hide orphan competencies in Library

**`src/pages/CompetencyFramework.tsx`** — Filter library query to only show competencies with `usage_count > 0`.

In the `libraryCompetencies` query (line 120), add a filter after mapping:
```typescript
return (comps || []).map(...)
  .filter((c: any) => c.usage_count > 0);
```

Update empty state text to: "Nenhuma competência em uso ainda. Crie cargos para popular sua biblioteca."

### Fix 2: Allow editing AI-generated competencies before saving

**`src/components/competency/CreateJobRoleDialog.tsx`** — Add inline editing for AI-generated competency cards.

- Add state: `editingIndex: number | null`
- In the AI competencies list (lines 434-449), replace read-only cards with editable cards:
  - Each card gets an Edit (Pencil) button alongside the existing X (remove) button
  - When editing: show Input for name + Textarea for description inline, with a "OK" button to confirm
  - When not editing: show current name/description (existing behavior) + Edit button
- Add "+ Adicionar Competência" button above the AI list (creates a new blank `isNew` entry in edit mode)
- Reset `editingIndex` on dialog close (add to the useEffect cleanup)

### Fix 3: Connect "Importar Template" to gallery dialog

**`src/components/competency/CreateJobRoleDialog.tsx`**:
- Add `onOpenTemplateGallery?: () => void` prop
- In `handleSourceChoice` (line 119-121), replace the toast with: close dialog + call `onOpenTemplateGallery?.()`

**`src/pages/CompetencyFramework.tsx`**:
- Add `templateGalleryOpen` state
- Pass `onOpenTemplateGallery={() => setTemplateGalleryOpen(true)}` to `CreateJobRoleDialog`
- Render a simple placeholder `Dialog` for the template gallery (title "Galeria de Templates", coming soon message)

### No database changes needed

