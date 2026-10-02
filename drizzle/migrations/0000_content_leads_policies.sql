GRANT SELECT ON public.content_leads TO authenticated;
CREATE POLICY "Super admins read content leads" ON public.content_leads
  FOR SELECT TO authenticated USING (public.check_is_admin());
CREATE POLICY "Service role manages content leads" ON public.content_leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages public ai usage" ON public.public_ai_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE EXECUTE ON FUNCTION public.admin_content_leads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_content_leads() TO authenticated;