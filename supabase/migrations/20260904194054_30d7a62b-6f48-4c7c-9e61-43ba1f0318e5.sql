DO $$
DECLARE
  _cmd text;
BEGIN
  SELECT replace(command, 'hr-risk-alerts', 'detect-network-signals')
  INTO _cmd
  FROM cron.job
  WHERE jobname = 'hr-risk-alerts-daily';

  IF _cmd IS NULL THEN
    RAISE EXCEPTION 'job base hr-risk-alerts-daily nao encontrado';
  END IF;

  PERFORM cron.unschedule('detect-network-signals-daily')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'detect-network-signals-daily');

  PERFORM cron.schedule('detect-network-signals-daily', '20 4 * * *', _cmd);
END $$;
