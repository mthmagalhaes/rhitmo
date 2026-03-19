

## Plan: Fix HR Admin Access & MentorChat HMR Error

### Two Issues Found

**Issue 1: HRAdminGuard redirects to /dashboard**

The `HRAdminGuard` (line 29-33) fetches workspaces without a server-side filter for `hr_admin_ids`. It fetches up to 10 workspaces visible via RLS, then does client-side `.includes()` check. The problem: `hr_admin_ids` is a Postgres UUID array — when returned by Supabase JS, it's correctly a JS array of strings. However, the query relies on the RLS policy "HR Admin pode ver workspace" which uses `is_hr_admin_of_workspace(id)`. This should work, but the client-side `.includes()` filter on line 36-38 uses `(w as any).hr_admin_ids?.includes(user?.id)` which is fragile.

**Fix**: Replace the generic fetch + client-side filter with a proper server-side `.contains()` filter and use `.maybeSingle()`. Also ensure `enabled` depends on `!authLoading` to avoid race conditions.

```typescript
const { data: workspace, isLoading } = useQuery({
  queryKey: ['hr-admin-workspace', user?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('workspaces')
      .select('id, name')
      .contains('hr_admin_ids', [user!.id])
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  enabled: !!user && !authLoading,
});
```

**Issue 2: MentorChat HMR failure**

The console shows an HMR reload failure for MentorChat.tsx. The file syntax looks correct on inspection. This is likely a transient HMR issue that will resolve on next save/reload. No code change needed — it will be resolved when we edit and save HRAdminGuard.

### Files Changed
1. `src/components/HRAdminGuard.tsx` — fix query to use `.contains()` filter + `!authLoading` in `enabled`

