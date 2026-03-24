

## Plan: Fix 2 Issues in Job Role Creation Flow

### Analysis

After reviewing `CreateJobRoleDialog.tsx`:
- **Fix 1 (Voltar button)**: Already exists at line 532 and is outside any source-conditional block. It's visible for both AI and manual modes. This is already working correctly — no change needed.
- **Fix 2 (Orphan competencies)**: The `availableCompetencies` query (lines 54-67) fetches ALL active competencies without filtering by usage count. This shows old orphan competencies in manual mode.

### Changes

**`src/components/competency/CreateJobRoleDialog.tsx`** — Filter manual mode competencies by usage

Update the query at lines 54-67 to include `role_competencies(count)` and filter results:

```typescript
const { data: availableCompetencies } = useQuery({
  queryKey: ['competencies-for-role', frameworkId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('competencies')
      .select('id, name, description, role_competencies(count)')
      .eq('framework_id', frameworkId)
      .eq('is_active', true)
      .order('order');
    if (error) throw error;
    return (data || []).filter(c => (c.role_competencies?.[0]?.count || 0) > 0);
  },
  enabled: open && !!frameworkId,
});
```

Also update the manual mode section (lines 398-401) to show a proper empty state when no competencies are available:

```tsx
<Separator />
{availableCompetencies && availableCompetencies.length > 0 ? (
  <p className="text-xs font-medium text-muted-foreground">Ou selecione competências existentes</p>
) : (
  <div className="text-center py-4">
    <p className="text-xs text-muted-foreground">
      Nenhuma competência disponível ainda. Crie sua primeira competência acima.
    </p>
  </div>
)}
```

### Single file change, no database changes needed

