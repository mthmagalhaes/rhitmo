

## Plan: Fix Rhitmo Sync Pre-population

### Problem
The edit dialog reads motivators, stress signs, and support info from `work_style_data`, but the initial sync saves them to separate columns (`motivators`, `user_manual`). Also, `useLinkedMember` doesn't fetch these columns. Result: fields appear empty on first edit.

### Changes

**1. `src/hooks/useLinkedMember.ts`** — Add missing columns to query

- Add `motivators, user_manual` to the select query (line 42)
- Add `motivators` and `user_manual` to the `LinkedMemberData` interface

**2. `src/components/dashboard/DirectReportDashboard.tsx`** — Fix pre-population logic (lines 174-191)

Update the `useEffect` to read from the correct sources with fallback:
- `motivators`: Read from `linkedMember.motivators` (array column), fall back to `wsd?.motivators`
- `stress_signs`: Read from `linkedMember.user_manual?.stress_signs`, fall back to `wsd?.stress_signs`
- `support_needed`: Read from `linkedMember.user_manual?.bad_day_support`, fall back to `wsd?.support_needed`
- `energy_drains`: Read from `linkedMember.user_manual?.energy_drainers`, fall back to `wsd?.energy_drains`
- `energy_sources`: Read from `linkedMember.user_manual?.energy_boosters`, fall back to `wsd?.energy_sources`
- `skill_goal`: Read from `linkedMember.user_manual?.skill_goal`, fall back to `wsd?.skill_goal`

Also update the `LinkedMemberData` interface in this file to include `motivators` and `user_manual`.

**3. `src/components/dashboard/DirectReportDashboard.tsx`** — Update `handleSaveSync` (lines 332-367)

Also write back to the `motivators` and `user_manual` columns (not just `work_style_data`) so the trigger correctly detects changes and data stays consistent.

### No database changes needed
All columns already exist. The trigger already watches `work_style_data`, `motivators`, and `user_manual`.

