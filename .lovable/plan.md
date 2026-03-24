

## Plan: Revoke Public/Anon Access to SECURITY DEFINER Functions

### Problem
All SECURITY DEFINER functions default to `EXECUTE` granted to `public`, meaning unauthenticated (anon) callers can invoke them. While internal auth checks prevent data leakage, the functions still execute unnecessarily, exposing metadata and enabling brute-force attempts.

### Migration

Single SQL migration revoking `EXECUTE` from `anon` and `public`, then granting to `authenticated` only. Based on the actual functions listed in the database:

```sql
-- Helper functions (used in RLS policies too - must keep accessible to authenticated)
REVOKE EXECUTE ON FUNCTION public.effective_user_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.effective_user_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_is_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_workspace_owner(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_hr_admin_of_workspace(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_hr_admin_of_workspace(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_owns_team(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.user_owns_team(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.workspace_is_active(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.workspace_is_active(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_is_linked_member(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.user_is_linked_member(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_update_own_sync(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_update_own_sync(uuid) TO authenticated;

-- HR Admin RPCs
REVOKE EXECUTE ON FUNCTION public.get_hr_dashboard_metrics(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_hr_dashboard_metrics(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_hr_leaders_overview(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_hr_leaders_overview(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_hr_leader_team(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_hr_leader_team(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_hr_all_members(uuid, text, uuid, boolean, integer, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_hr_all_members(uuid, text, uuid, boolean, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_hr_member_profile(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_hr_member_profile(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.manage_hr_admin(uuid, uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.manage_hr_admin(uuid, uuid, text) TO authenticated;

-- Review & Evidence RPCs
REVOKE EXECUTE ON FUNCTION public.get_review_evidence(uuid, date, date) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_review_evidence(uuid, date, date) TO authenticated;

-- Competency RPCs
REVOKE EXECUTE ON FUNCTION public.get_job_roles_with_competencies(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_job_roles_with_competencies(uuid) TO authenticated;

-- Member data RPCs
REVOKE EXECUTE ON FUNCTION public.get_member_for_sync(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_member_for_sync(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_rhitmo_sync(uuid, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_rhitmo_sync(uuid, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_rhitmo_sync_v2(...) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_rhitmo_sync_v2(...) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_member_own_data(jsonb, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_member_own_data(jsonb, jsonb) TO authenticated;

-- Admin RPCs
REVOKE EXECUTE ON FUNCTION public.get_all_users_with_metadata() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_all_users_with_metadata() TO authenticated;

-- Search/Match RPCs
REVOKE EXECUTE ON FUNCTION public.match_feedbacks(...) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.match_feedbacks(...) TO authenticated;

-- Invite (keep accessible - invite flow needs this before full auth)
-- get_invite_details uses invite_token, called during onboarding - KEEP public access

-- Framework auto-creation trigger function
REVOKE EXECUTE ON FUNCTION public.create_default_competency_framework(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_default_competency_framework(uuid) TO authenticated;
```

### Key decisions

- **`get_invite_details`**: Keep public access — it's called during the invite acceptance flow before the user is fully authenticated. It only returns name/email/workspace for a valid pending invite token.
- **`effective_user_id`**: Revoke from anon. It's used in RLS policies which run as the table owner context, so `authenticated` grant is sufficient.
- **`notify_leader_sync_change`**: Trigger function — not callable via RPC, skip.
- **`update_updated_at_column`**: Trigger function — not callable via RPC, skip.
- **`trigger_create_default_framework`**: Trigger function — skip.
- **Validation triggers** (`validate_subscription_*`): Trigger functions — skip.
- **`get_workspace_context`**: Does not exist — removed from migration.

### No frontend changes needed
All frontend calls use the authenticated Supabase client. Edge functions use service_role key. No functionality will break.

