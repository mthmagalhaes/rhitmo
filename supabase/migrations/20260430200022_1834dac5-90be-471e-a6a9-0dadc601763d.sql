-- Revogar EXECUTE público nas novas funções SECURITY DEFINER do Sprint 8.1
REVOKE EXECUTE ON FUNCTION public._ctx_resolve_workspace(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ctx_evidence_from_feedback() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ctx_evidence_from_meeting() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ctx_evidence_from_slack() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ctx_evidence_from_kudo() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ctx_evidence_from_prompt() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ctx_evidence_from_goal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ctx_evidence_from_review() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ctx_evidence_from_nudge() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_member_timeline(uuid, int, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.backfill_context_evidence(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_timeline(uuid, int, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_context_evidence(uuid) TO authenticated;