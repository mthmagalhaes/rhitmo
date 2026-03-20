

## Plan: HR Teams & Leaders Page

### Problem
HR Admin needs to see organizational structure: leaders, their team sizes, activity metrics, and drill-down into each leader's team members.

### Key schema corrections from user's proposal
- No `profiles` table — leader names/emails must come from `auth.users` (in SECURITY DEFINER function)
- `is_hr_admin_of_workspace()` takes only `_workspace_id` (not two params)
- `feedbacks` uses `manager_id`, not `created_by`
- No `leader_id` on `team_members` — leader is derived via `teams → workspaces → owner_id`

### Changes

**1. Database migration** — Create `get_hr_leaders_overview` RPC

Returns JSONB array of leaders with:
- `leader_id`, `leader_name`, `leader_email` (from `auth.users`)
- `total_members` (count of team_members in their workspace)
- `feedbacks_last_30d` (count from feedbacks where manager_id = owner_id)
- `last_feedback_at`, `days_since_last_feedback`

Auth check: `is_hr_admin_of_workspace(_workspace_id)` or `is_admin()`.

Query pattern:
```sql
SELECT w.owner_id, au.email, au.raw_user_meta_data->>'full_name',
  COUNT(DISTINCT tm.id), ...
FROM workspaces w
JOIN auth.users au ON au.id = w.owner_id
LEFT JOIN teams t ON t.workspace_id = w.id
LEFT JOIN team_members tm ON tm.team_id = t.id
LEFT JOIN feedbacks f ON f.manager_id = w.owner_id
WHERE w.id = _workspace_id AND w.is_active = true
GROUP BY w.owner_id, au.email, au.raw_user_meta_data
```

**2. Database migration** — Create `get_hr_leader_team` RPC

Takes `_workspace_id` and `_leader_id`. Returns JSONB array of team members under that leader with:
- `id`, `name`, `email`, `role`
- `last_feedback_at`, `days_since_last_feedback`
- `pdi_count` (from development_plans)
- `has_sync` (work_style_data IS NOT NULL)

**3. `src/pages/HRTeams.tsx`** — New page

- Uses `useHRAdmin()` for `workspaceId`
- Calls `get_hr_leaders_overview` RPC
- Displays leader cards with: name, email, member count, feedback activity, color-coded activity badge
- Search filter by name/email
- Click "Ver time" opens Sheet with team member list from `get_hr_leader_team`
- Each member shows: name, last feedback date, PDI count, sync status
- Matches existing HR dashboard visual style (bg-[#F5F0E8], rounded-3xl cards, same header)

**4. `src/App.tsx`** — Add route `/hr/teams`

Wrap in `HRAdminGuard`, same pattern as `/hr/competency-framework`.

**5. `src/pages/HRDashboard.tsx`** — Add quick link

Add "Times e Líderes" button in the Quick Links section (line 96-104), navigating to `/hr/teams`.

### No new RLS policies needed
RPCs use SECURITY DEFINER and check HR admin authorization internally. No direct table access from client.

