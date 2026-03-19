

## Plan: Add yourself as HR Admin via direct data update

Since the `/admin` page already has a full "Gestão de Acessos" tab (AdminAccess component) for managing HR Admins long-term, the fastest solution is a direct SQL data update.

### Action

Use the insert/update tool to run:

```sql
UPDATE workspaces w
SET hr_admin_ids = ARRAY(
  SELECT DISTINCT unnest(
    COALESCE(w.hr_admin_ids, ARRAY[]::uuid[]) || 
    ARRAY[(SELECT id FROM auth.users WHERE email = 'matheus@rhitmo.co')]
  )
)
WHERE w.name = 'Trabalho';
```

This appends your user ID to the `hr_admin_ids` array of the "Trabalho" workspace (idempotent — won't duplicate if already present).

### No code changes needed

The existing AdminAccess tab at `/admin` → "Acessos" already supports:
- Inviting new HR Admins (via email)
- Viewing active HR Admins per workspace
- Removing HR Admins

### After execution

1. Refresh or re-login
2. Navigate to `/hr/competency-framework`
3. The `HRAdminGuard` should grant access since your user ID will be in `hr_admin_ids`

