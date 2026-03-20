

## Plan: Member Profile Sheet from HR Members Page

### Changes

**1. Database: New RPC `get_hr_member_profile`**

Returns a single member's full profile. Key corrections from user's SQL:
- `development_plans` doesn't have `title`/`description`/`target_date` — aggregate `development_items` instead (via `plan_id`)
- `motivators` and `user_manual` are `jsonb`, not `text`
- Recent feedbacks: use a subquery with `LIMIT 5` (the user's SQL had LIMIT in wrong place)
- Return types must match actual column types

```sql
CREATE OR REPLACE FUNCTION public.get_hr_member_profile(
  _workspace_id UUID, _member_id UUID
)
RETURNS TABLE (
  member_id UUID, member_name TEXT, member_email TEXT, member_role TEXT,
  leader_id UUID, leader_name TEXT,
  motivators JSONB, user_manual JSONB,
  chronotype TEXT, feedback_style TEXT, recognition_style TEXT,
  skills_data JSONB, work_style_data JSONB,
  created_at TIMESTAMPTZ, feedback_count INTEGER, last_feedback_date TIMESTAMPTZ,
  pdi_items JSONB, recent_feedbacks JSONB
)
```

- `pdi_items`: aggregates from `development_items` joined through `development_plans`
- `recent_feedbacks`: last 5 feedbacks by `occurred_at`
- Auth: `is_admin() OR is_hr_admin_of_workspace()`

**2. New component `src/components/hr/MemberProfileSheet.tsx`**

Sheet (right side, `sm:max-w-xl`) with:
- **Header**: Avatar initial, name, role, email, leader, join date
- **4 Tabs**: Feedbacks, PDI, Rhitmo Sync, Skills
- Each tab shows data or a clean empty state
- `motivators`/`user_manual` rendered as JSON content (they're jsonb)
- Fetches data via RPC only when `open && memberId` are truthy

**3. Update `src/pages/HRMembers.tsx`**

- Add `selectedMemberId` + `profileSheetOpen` state
- Wire "Ver Perfil" button's `onClick` to set member and open sheet
- Render `MemberProfileSheet` at bottom of component

### No other changes needed
RLS handled by SECURITY DEFINER function. Existing Sheet UI component supports custom width via className.

