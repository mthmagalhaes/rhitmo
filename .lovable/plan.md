

## Plan: Disable BETA_MODE & Grandfather Existing Users

### Summary
Add `is_beta_user` column to workspaces, mark all existing workspaces as beta, set `BETA_MODE = false`, and update `usePlanLimits` to grant unlimited access based on the DB flag instead of a hardcoded constant. Add a beta badge on the Billing page.

### Changes

**1. Database Migration**

```sql
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS is_beta_user BOOLEAN DEFAULT FALSE;
UPDATE workspaces SET is_beta_user = TRUE WHERE created_at < NOW();
COMMENT ON COLUMN workspaces.is_beta_user IS 'Grandfathered beta users with unlimited access';
```

New workspaces default to `false` — no code changes needed for signup.

**2. `src/hooks/usePlanLimits.ts`**

- Remove `BETA_MODE` constant entirely
- Update workspace query to select `id, plan_tier, is_beta_user`
- Replace `BETA_MODE` checks with `workspace?.is_beta_user` check:
  - If `is_beta_user === true`: return unlimited limits (Infinity values) with `isBetaUser: true` and `planName` set to actual plan tier name (not forced "Business")
  - If `is_beta_user === false` or undefined: use `PLAN_LIMITS[tier]` as normal
- Add `isBetaUser: boolean` to the `PlanLimits` interface
- Update all return fields (`canAddMember`, `hasAnalytics`, etc.) to check `workspace?.is_beta_user` instead of `BETA_MODE`

**3. `src/hooks/useEnforcedLimits.ts`**

No changes needed — already checks `max >= 9999` or `Infinity`, which beta users will have.

**4. `src/pages/Billing.tsx`**

- Update workspace query to also select `is_beta_user`
- Before the plan cards section (for Pulse users), add a beta banner:
  ```
  {workspace?.is_beta_user && (
    <Alert with Crown icon>
      "Acesso Beta Grandfathered" — full free access permanently
    </Alert>
  )}
  ```
- Also show the banner for active subscription users (Pro/Business section)

**5. `src/components/billing/UpgradeBanner.tsx`**

- Add early return if `limits.isBetaUser === true` (beta users should never see upgrade prompts)

### Technical Notes
- `is_beta_user` defaults to `FALSE` in the column definition, so new signups automatically get non-beta status
- The `useEnforcedLimits` hook's `checkLimit` already returns `'allowed'` for `Infinity` values, so beta users pass all limit checks without changes
- The UpgradeBanner already returns null when all limits return `'allowed'`, but an explicit beta check is cleaner

