DO $$
DECLARE
  v_cmd TEXT;
  v_secret TEXT;
BEGIN
  SELECT substring(command from 'x-cron-secret"\s*:\s*"([^"]+)"')
    INTO v_secret
  FROM cron.job
  WHERE command LIKE '%x-cron-secret%'
  LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE NOTICE 'cron secret not found — skipping schedule';
    RETURN;
  END IF;

  PERFORM cron.unschedule('purge-recall-recordings-daily')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-recall-recordings-daily');

  v_cmd := format($f$
    SELECT net.http_post(
      url := 'https://lybkgujyezzzvbzypxed.supabase.co/functions/v1/purge-recall-recordings',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer %s',
        'x-cron-secret', %L
      ),
      body := '{}'::jsonb
    );
  $f$, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5YmtndWp5ZXp6enZienlweGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMDQxNDEsImV4cCI6MjA3OTc4MDE0MX0.EeCPUcB0Zs3FR5oHXQWImIoH7Mk2ToXSRbJ4gO66rXY', v_secret);

  PERFORM cron.schedule('purge-recall-recordings-daily', '45 3 * * *', v_cmd);
END $$;