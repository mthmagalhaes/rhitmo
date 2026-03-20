

## Plan: Auto-create Framework Before Saving AI Competencies

### Problem
`frameworkId` is passed as `''` when no framework exists. Inserting a competency with `framework_id: ''` fails because Postgres expects a valid UUID.

### Fix (`src/components/competency/AICompetencyDialog.tsx`)

In `saveAll` (line 121), before the insert loop, add logic to create a framework if `frameworkId` is empty:

```typescript
const saveAll = async () => {
  if (!competencies.length) return;
  setSaving(true);
  try {
    let fwId = frameworkId;

    // Auto-create framework if none exists
    if (!fwId) {
      const { data: fw, error: fwErr } = await supabase
        .from('competency_frameworks')
        .insert({ workspace_id: workspaceId })
        .select('id')
        .single();
      if (fwErr) throw fwErr;
      fwId = fw.id;
    }

    // Then use fwId instead of frameworkId in the loop
    ...
```

This requires passing `workspaceId` as a new prop to `AICompetencyDialog`.

### Changes

**1. `src/components/competency/AICompetencyDialog.tsx`**
- Add `workspaceId` prop to interface
- In `saveAll`: if `!frameworkId`, insert into `competency_frameworks` with `workspace_id` to get a new `fwId`
- Use `fwId` for all competency inserts

**2. `src/pages/CompetencyFramework.tsx`**
- Pass `workspaceId={workspaceId}` to `AICompetencyDialog` (line ~278)

Single-file logic change + one prop addition. No database changes needed.

