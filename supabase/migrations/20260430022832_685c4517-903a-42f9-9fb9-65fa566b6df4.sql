-- Tabela append-only de logs de Edge Functions
CREATE TABLE IF NOT EXISTS public.function_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    uuid NOT NULL,
  function_name text NOT NULL,
  level         text NOT NULL CHECK (level IN ('debug','info','warn','error')),
  event         text NOT NULL,
  duration_ms   integer,
  user_id       uuid,
  workspace_id  uuid,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_function_logs_function_created
  ON public.function_logs (function_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_function_logs_request
  ON public.function_logs (request_id);

CREATE INDEX IF NOT EXISTS idx_function_logs_errors
  ON public.function_logs (created_at DESC)
  WHERE level IN ('warn','error');

CREATE INDEX IF NOT EXISTS idx_function_logs_workspace_created
  ON public.function_logs (workspace_id, created_at DESC)
  WHERE workspace_id IS NOT NULL;

ALTER TABLE public.function_logs ENABLE ROW LEVEL SECURITY;

-- Apenas super_admin pode ler (usa is_admin_user para não ser afetado por impersonation)
CREATE POLICY "function_logs_super_admin_select"
ON public.function_logs
FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- INSERT/UPDATE/DELETE somente via service_role (que bypassa RLS)

-- Retenção semanal
SELECT cron.schedule(
  'function_logs_retention_weekly',
  '0 3 * * 1',
  $$
  DELETE FROM public.function_logs
  WHERE level IN ('debug','info')
    AND created_at < now() - interval '14 days';

  DELETE FROM public.function_logs
  WHERE level IN ('warn','error')
    AND created_at < now() - interval '90 days';
  $$
);

COMMENT ON TABLE public.function_logs IS
  'Onda 4.1: Logs centralizados de Edge Functions. Append-only via service_role. Leitura restrita a super_admin. Retenção automática: 14d info/debug, 90d warn/error.';