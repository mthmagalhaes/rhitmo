-- Revoke public/anon/authenticated EXECUTE on the new SECURITY DEFINER functions; keep service_role only
REVOKE ALL ON FUNCTION public.get_active_slack_conversation(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.append_slack_conversation_turn(uuid, jsonb, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_stale_slack_conversations() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_active_slack_conversation(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.append_slack_conversation_turn(uuid, jsonb, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_slack_conversations() TO service_role;