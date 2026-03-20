

## Plan: Fix "+ Adicionar Competência" Button Not Opening Dialog

### Root Cause
The `AICompetencyDialog` is conditionally rendered only when `data` exists (line 277: `{data && (`). If the competency framework query fails (e.g., no framework row exists for the workspace yet, causing `.single()` to throw), `data` is undefined and the dialog never mounts — so clicking the button sets state but nothing renders.

### Fix (`src/pages/CompetencyFramework.tsx`)

1. **Move `AICompetencyDialog` outside the `{data && ...}` guard** so it always renders
2. Pass `frameworkId` as `data?.frameworkId ?? ''` and handle the missing-framework case inside the dialog (disable "Salvar" if no frameworkId)
3. Alternatively, auto-create the framework on first visit if none exists — but simpler fix is just always rendering the dialog

Specific change: Move lines 277-286 outside the `data` conditional, passing optional props:

```tsx
<AICompetencyDialog
  open={showAIDialog}
  onClose={() => setShowAIDialog(false)}
  frameworkId={data?.frameworkId ?? ''}
  currentMaxOrder={data?.competencies?.length ? Math.max(...data.competencies.map(c => c.order)) : 0}
  onCreatedManually={() => setShowCreateModal(true)}
  onSaved={() => queryClient.invalidateQueries({ queryKey: ['competency-framework'] })}
/>
```

This is a single-file, ~5-line change.

