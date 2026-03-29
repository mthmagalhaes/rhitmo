

## Plan: Standardize Plan Nomenclature (flow/maestro → pro/business)

### Summary
Replace all `flow`/`maestro` references with `pro`/`business` across 3 source files, 1 type definition, and 1 database migration. Update limits to match landing page pricing.

### Database Migration

Migrate existing data and update validation triggers:

```sql
-- Migrate data
UPDATE workspaces SET plan_tier = 'pro' WHERE plan_tier = 'flow';
UPDATE workspaces SET plan_tier = 'business' WHERE plan_tier = 'maestro';

-- Update validation trigger function
CREATE OR REPLACE FUNCTION validate_workspace_plan_tier() ...
  CHECK plan_tier IN ('pulse', 'pro', 'business', 'enterprise')
```

Also update `validate_subscription_plan_tier()` trigger to accept `pulse/pro/business`.

### File Changes

**1. `src/types/team.ts`**
- `Workspace.plan_tier`: `'pulse' | 'flow' | 'maestro'` → `'pulse' | 'pro' | 'business'`
- `PlanTier`: same change

**2. `src/hooks/usePlanLimits.ts`**
- Replace `PlanLimits` interface with expanded fields (maxTeams, maxMentorMessages, maxRecordingHours, hrDashboard, etc.)
- Replace `PLAN_LIMITS` object with correct values per tier
- Update all type references from `flow/maestro` to `pro/business`
- Keep `BETA_MODE = true` but update beta return to use `'business'` tier
- Add new return fields: `canAddTeam`, `hasMentorChat`, `hasHrDashboard`, etc.

**3. `src/components/admin/AdminOverview.tsx`**
- Update `planNames` record: `flow → 'Pro'`, `maestro → 'Business'`
- Update 4 `SelectItem` values: `flow → pro`, `maestro → business`
- Update emoji labels: `🌊 Flow → 💼 Pro`, `🎼 Maestro → 🏢 Business`

### Already Correct (no changes needed)
- `stripe-webhook/index.ts` — already maps to `'pro'` and `'business'`
- `create-checkout-session` — already uses `pro`/`business`
- `Billing.tsx` — already uses `pro`/`business`

