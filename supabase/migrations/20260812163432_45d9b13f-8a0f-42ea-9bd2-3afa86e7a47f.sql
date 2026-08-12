CREATE OR REPLACE FUNCTION public.schedule_note_taker_cron(
  p_cron_secret text,
  p_anon_key text,
  p_supabase_url text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_cmd text;
BEGIN
  PERFORM cron.unschedule('sync-note-taker-every-30min')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-note-taker-every-30min');

  v_cmd := format($cmd$
    SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', %L,
        'x-cron-secret', %L
      ),
      body := jsonb_build_object('triggered_at', now())
    );
  $cmd$, p_supabase_url || '/functions/v1/sync-note-taker', 'Bearer ' || p_anon_key, p_cron_secret);

  PERFORM cron.schedule('sync-note-taker-every-30min', '*/30 * * * *', v_cmd);
  RETURN 'scheduled';
END;
$fn$;

REVOKE ALL ON FUNCTION public.schedule_note_taker_cron(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_note_taker_cron(text, text, text) TO service_role;