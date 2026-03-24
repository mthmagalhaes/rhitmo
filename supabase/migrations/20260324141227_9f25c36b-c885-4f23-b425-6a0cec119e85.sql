
-- ============================================
-- SECURITY FIX: Revoke anon/public access to SECURITY DEFINER functions
-- Only authenticated users should be able to execute these
-- ============================================

-- Helper functions
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

REVOKE EXECUTE ON FUNCTION public.submit_rhitmo_sync_v2(uuid, integer, text, text, text, text, jsonb, jsonb, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_rhitmo_sync_v2(uuid, integer, text, text, text, text, jsonb, jsonb, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_member_own_data(jsonb, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_member_own_data(jsonb, jsonb) TO authenticated;

-- Admin RPCs
REVOKE EXECUTE ON FUNCTION public.get_all_users_with_metadata() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_all_users_with_metadata() TO authenticated;

-- Search/Match RPCs
REVOKE EXECUTE ON FUNCTION public.match_feedbacks(extensions.vector, double precision, integer, uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.match_feedbacks(extensions.vector, double precision, integer, uuid, uuid) TO authenticated;

-- Framework auto-creation
REVOKE EXECUTE ON FUNCTION public.create_default_competency_framework(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_default_competency_framework(uuid) TO authenticated;

-- NOTE: get_invite_details intentionally kept accessible to public (invite flow pre-auth)
-- NOTE: Trigger functions (notify_leader_sync_change, update_updated_at_column, etc.) skipped - not callable via RPC
