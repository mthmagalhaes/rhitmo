-- Defense in Depth: Revogar acesso direto do role anon às tabelas sensíveis
-- Rhitmo Sync continuará funcionando via funções RPC SECURITY DEFINER

-- Revogar todas as permissões do role anon em tabelas sensíveis
REVOKE ALL ON public.team_members FROM anon;
REVOKE ALL ON public.feedbacks FROM anon;
REVOKE ALL ON public.workspaces FROM anon;
REVOKE ALL ON public.teams FROM anon;
REVOKE ALL ON public.goals FROM anon;
REVOKE ALL ON public.performance_reviews FROM anon;
REVOKE ALL ON public.meeting_transcripts FROM anon;
REVOKE ALL ON public.mentor_messages FROM anon;
REVOKE ALL ON public.chat_threads FROM anon;
REVOKE ALL ON public.admin_impersonation FROM anon;
REVOKE ALL ON public.user_roles FROM anon;

-- Manter acesso INSERT para waitlist_leads (formulário público intencional)
-- SELECT já está restrito por RLS para apenas admins