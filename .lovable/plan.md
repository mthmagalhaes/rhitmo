

## Plan: Hard Limits Enforcement with Warnings & Upgrade Prompts

### Summary
Create a `useEnforcedLimits` hook with `checkLimit`/`showUpgradePrompt`/`showWarning` helpers, then wire it into the 3 creation flows (member, team, review). Add an `UpgradeBanner` component for dashboard. All gated by existing `BETA_MODE` flag (currently `true` = no enforcement).

### Changes

**1. Create `src/hooks/useEnforcedLimits.ts`**

Hook that wraps `usePlanLimits` and exposes:
- `checkLimit(current, max, resourceName)` → returns `'allowed' | 'warning' | 'blocked'` (warning at ≥80%, blocked at ≥100%)
- `enforceLimit(current, max, resourceName)` → returns `boolean` (true = proceed). Shows upgrade toast if blocked, warning toast if near limit. Handles Infinity correctly.
- `showUpgradePrompt(resourceName)` — toast with "Ver Planos" action button navigating to `/billing`, duration 10s
- `showWarning(current, max, resourceName)` — toast with usage info, duration 5s
- Re-exports all `usePlanLimits` return values

**2. Update `src/components/NewMemberDialog.tsx`**

- Replace `usePlanLimits` import with `useEnforcedLimits`
- At top of `handleSubmit` (before any DB calls, ~line 122), add:
  ```
  const status = checkLimit(memberCount, limits.maxMembers, 'liderados');
  if (status === 'blocked') { showUpgradePrompt('liderados'); return; }
  if (status === 'warning') { showWarning(memberCount, limits.maxMembers, 'liderados'); }
  ```
- `memberCount` comes from the hook's existing return value

**3. Update `src/components/NewTeamDialog.tsx`**

- Import `useEnforcedLimits`
- At top of `handleSubmit` (~line 27), add team limit check using `teamCount` and `limits.maxTeams`

**4. Update `src/components/review/CreateFormalReviewDialog.tsx`**

- Import `useEnforcedLimits`
- At start of `createMutation.mutationFn` (~line 75), add review limit check using `reviewCount` and `limits.maxReviews`

**5. Create `src/components/billing/UpgradeBanner.tsx`**

Alert component that:
- Uses `useEnforcedLimits` to check all 3 resource types (members, teams, reviews)
- Shows when any resource is at ≥80% usage
- Lists each near-limit resource with `current/max` display
- "Fazer Upgrade" button linking to `/billing`
- Uses existing `Alert`/`AlertTitle`/`AlertDescription` components
- Only renders when `BETA_MODE` is `false` (returns `null` otherwise)

**6. Update `src/pages/Index.tsx`**

- Import and render `<UpgradeBanner />` at top of dashboard content area (after `NudgesBanner`)

### Technical Notes
- All enforcement respects `BETA_MODE` — when `true`, `usePlanLimits` returns 9999 limits so `checkLimit` always returns `'allowed'`
- No database changes needed
- Toast action button uses `ToastAction` from shadcn with `altText` for accessibility
- Warning threshold: 80% (e.g., 3rd member on Pulse with max 3 triggers warning since 2/3 = 67% < 80%, so actually the 3rd = 100% = blocked). For Pulse members (max 3), warning fires at member #3 attempt which is actually a block. Warning effectively fires on Pro at member #4 (4/5 = 80%).

