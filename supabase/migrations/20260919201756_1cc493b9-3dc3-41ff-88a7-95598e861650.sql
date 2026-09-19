REVOKE EXECUTE ON FUNCTION public.get_billing_status(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_leader_bot_addon(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_billing_status(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_leader_bot_addon(uuid) TO authenticated, service_role;