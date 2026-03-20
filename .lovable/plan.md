

## Plan: HR Members Page with Filters and Activity Badges

### Changes

**1. Database: New RPC `get_hr_all_members`**

Create via migration. Key corrections from user's SQL (adapting to actual schema):
- Use `development_plans` table (not `pdi_items`)
- Use `tm.skills_data` column (not `skills_map`)
- Use `tm.work_style_data IS NOT NULL` for sync check (matches existing pattern in `get_hr_leader_team`)
- Use `f.occurred_at` for feedback dates (not `f.created_at`)
- Join `auth.users` for leader name

```sql
CREATE OR REPLACE FUNCTION public.get_hr_all_members(
  _workspace_id UUID,
  _search TEXT DEFAULT NULL,
  _leader_id UUID DEFAULT NULL,
  _has_pdi BOOLEAN DEFAULT NULL,
  _limit INTEGER DEFAULT 20,
  _offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  member_id UUID, member_name TEXT, member_email TEXT, member_role TEXT,
  leader_id UUID, leader_name TEXT,
  last_feedback_date TIMESTAMPTZ, days_since_last_feedback INTEGER,
  pdi_count INTEGER, has_sync BOOLEAN, has_skills_map BOOLEAN,
  total_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
```

Uses `is_hr_admin_of_workspace` + `is_admin()` for auth check.

**2. New page `src/pages/HRMembers.tsx`**

- Uses `useHRAdmin()` for `workspaceId`
- Filters: search input, leader dropdown (from `get_hr_leaders_overview`), PDI filter
- Member cards with activity badges (color-coded by days since last feedback)
- Status badges: Sync, PDI count, Skills Map
- Pagination (20 per page)
- "Ver Perfil" button (placeholder for now)

**3. Route in `src/App.tsx`**

Add `/hr/members` route wrapped in `AppLayout` + `HRAdminGuard`, same pattern as other HR routes.

**4. Sidebar update `src/components/AppSidebar.tsx`**

Add `{ title: 'Liderados', url: '/hr/members', icon: Users }` to `hrMenuItems` array (after "Times e Líderes"). Use a different icon (`UserCheck` or keep `Users`) to differentiate from "Times e Líderes".

### No other changes needed
RLS is handled by the SECURITY DEFINER function. Existing `get_hr_leaders_overview` RPC provides leader list for the filter dropdown.

