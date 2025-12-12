-- Habilitar extensão pg_net para chamadas HTTP do PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Função que notifica o admin via Edge Function
CREATE OR REPLACE FUNCTION public.notify_admin_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Montar payload no formato de webhook
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'waitlist_leads',
    'record', jsonb_build_object(
      'email', NEW.email,
      'name', NEW.name,
      'phone', NEW.phone,
      'team_size', NEW.team_size,
      'created_at', NEW.created_at
    )
  );

  -- Chamar Edge Function via HTTP POST
  PERFORM extensions.http_post(
    url := 'https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/notify-admin-new-lead',
    body := payload::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger que dispara após INSERT na waitlist_leads
CREATE TRIGGER on_new_waitlist_lead
  AFTER INSERT ON public.waitlist_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_lead();