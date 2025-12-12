-- Remover trigger que bloqueia INSERTs quando pg_net não está disponível
DROP TRIGGER IF EXISTS on_new_waitlist_lead ON public.waitlist_leads;

-- Remover função que usa extensions.http_post (não disponível no Lovable Cloud)
DROP FUNCTION IF EXISTS public.notify_admin_new_lead();