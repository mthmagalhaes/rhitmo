

## Plan: Unified Role System via `useUserRole` Hook

### Why NOT the user's proposed approach

The user's request assumes a `profiles` table exists — it doesn't. The system already differentiates roles through three separate mechanisms:
- **Leader**: `workspaces.owner_id` matches `auth.uid()`
- **HR Admin**: `workspaces.hr_admin_ids` array contains `auth.uid()`
- **Linked member (user)**: `team_members.linked_user_id` matches `auth.uid()`
- **Super Admin**: `user_roles` table with `app_role` enum

Creating a redundant `role` column on a new `profiles` table would duplicate data already derivable from existing tables, risk inconsistency (what if someone is a workspace owner but their profile says `user`?), and require keeping two sources of truth in sync.

### Recommended approach: Derive roles from existing data

Create a single `useUserRole` hook that queries existing tables to determine the user's role. No schema changes needed.

### Changes

**1. `src/hooks/useUserRole.ts`** — New hook (derived role, no new table)

```typescript
export type UserRole = 'hr_admin' | 'leader' | 'user';
```

Logic:
- Check if user is in any `workspaces.hr_admin_ids` → `hr_admin`
- Check if user owns any active workspace → `leader`
- Otherwise → `user`

Uses a single query combining both checks. Returns `{ role, isHRAdmin, isLeader, isUser, loading }`. Cached for 5 minutes (`staleTime`).

**2. `src/components/AppSidebar.tsx`** — Use `useUserRole` for menu visibility

Replace the current `useAdmin` + `useLinkedMember` filtering logic with `useUserRole` for cleaner conditional rendering (HR Admin sees HR link, Leader sees Analytics/Billing, User sees minimal menu).

**3. No database migration needed**

All role data already exists in the schema. The `is_hr_admin_of_workspace()` and workspace owner checks in RLS already enforce backend security. This hook just provides a clean frontend API.

### Technical details

Hook query pattern:
```sql
-- Check HR admin
SELECT id FROM workspaces WHERE auth.uid() = ANY(hr_admin_ids) LIMIT 1

-- Check leader (workspace owner)
SELECT id FROM workspaces WHERE owner_id = auth.uid() AND is_active = true LIMIT 1
```

Both can be done in parallel with `Promise.all`. If neither matches and user has a `linked_user_id` in `team_members`, they're a `user`.

### What this does NOT change
- RLS policies (already correct)
- Admin system (`user_roles` with `super_admin` — separate concern)
- `HRAdminGuard` (already works via `hr_admin_ids`)
- `DirectReportGuard` (already works via `linked_user_id`)

