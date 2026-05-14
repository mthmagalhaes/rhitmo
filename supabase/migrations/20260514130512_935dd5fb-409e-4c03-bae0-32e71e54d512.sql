REVOKE EXECUTE ON FUNCTION public.get_suppressed_member_emails() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_suppressed_member_emails() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_suppressed_member_emails() TO authenticated;