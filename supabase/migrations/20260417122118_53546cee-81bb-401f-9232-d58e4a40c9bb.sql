
-- ============================================================
-- CAMADA 1: Expiração + Auditoria no schema
-- ============================================================

ALTER TABLE public.admin_impersonation
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS reason text;

-- Tabela append-only de auditoria
CREATE TABLE IF NOT EXISTS public.admin_impersonation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  impersonated_user_id uuid NOT NULL,
  impersonated_email text,
  action text NOT NULL CHECK (action IN ('start', 'stop', 'expired')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_impersonation_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read impersonation audit" ON public.admin_impersonation_audit;
CREATE POLICY "Admins can read impersonation audit"
  ON public.admin_impersonation_audit FOR SELECT TO authenticated
  USING (public.is_admin() = true);

-- Service role pode inserir (via trigger SECURITY DEFINER abaixo)
DROP POLICY IF EXISTS "Service role can insert audit" ON public.admin_impersonation_audit;
CREATE POLICY "Service role can insert audit"
  ON public.admin_impersonation_audit FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_impersonation_audit_admin
  ON public.admin_impersonation_audit(admin_user_id, created_at DESC);

-- Trigger de auditoria (AFTER INSERT/DELETE)
CREATE OR REPLACE FUNCTION public.log_impersonation_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_impersonation_audit
      (admin_user_id, impersonated_user_id, impersonated_email, action, reason)
    VALUES
      (NEW.admin_user_id, NEW.impersonated_user_id, NEW.impersonated_email, 'start', NEW.reason);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_impersonation_audit
      (admin_user_id, impersonated_user_id, impersonated_email, action, reason)
    VALUES
      (OLD.admin_user_id, OLD.impersonated_user_id, OLD.impersonated_email,
       CASE WHEN OLD.expires_at < now() THEN 'expired' ELSE 'stop' END,
       OLD.reason);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_impersonation_insert ON public.admin_impersonation;
CREATE TRIGGER trg_log_impersonation_insert
  AFTER INSERT ON public.admin_impersonation
  FOR EACH ROW EXECUTE FUNCTION public.log_impersonation_event();

DROP TRIGGER IF EXISTS trg_log_impersonation_delete ON public.admin_impersonation;
CREATE TRIGGER trg_log_impersonation_delete
  AFTER DELETE ON public.admin_impersonation
  FOR EACH ROW EXECUTE FUNCTION public.log_impersonation_event();

-- ============================================================
-- CAMADA 2: Hardening do effective_user_id() — ignora expirados
-- ============================================================

CREATE OR REPLACE FUNCTION public.effective_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _impersonated uuid;
BEGIN
  SELECT impersonated_user_id INTO _impersonated
  FROM public.admin_impersonation
  WHERE admin_user_id = auth.uid()
    AND (expires_at IS NULL OR expires_at > now())
    AND ended_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(_impersonated, auth.uid());
END;
$$;

-- ============================================================
-- CAMADA 3: Helper anti-escalation + policy restritiva
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'support')
  );
$$;

-- Substituir a policy ALL única por policies separadas com checagens reforçadas no INSERT
DROP POLICY IF EXISTS "Admins can manage own impersonation" ON public.admin_impersonation;

CREATE POLICY "Admins can view own impersonation"
  ON public.admin_impersonation FOR SELECT TO authenticated
  USING (public.is_admin() = true AND admin_user_id = auth.uid());

CREATE POLICY "Admins can start impersonation"
  ON public.admin_impersonation FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() = true
    AND admin_user_id = auth.uid()
    AND NOT public.is_admin_user(impersonated_user_id)
    AND impersonated_user_id <> auth.uid()
    AND expires_at <= now() + interval '4 hours'
    AND expires_at > now()
  );

CREATE POLICY "Admins can update own impersonation"
  ON public.admin_impersonation FOR UPDATE TO authenticated
  USING (public.is_admin() = true AND admin_user_id = auth.uid())
  WITH CHECK (public.is_admin() = true AND admin_user_id = auth.uid());

CREATE POLICY "Admins can stop own impersonation"
  ON public.admin_impersonation FOR DELETE TO authenticated
  USING (public.is_admin() = true AND admin_user_id = auth.uid());

-- ============================================================
-- CAMADA 4: Cleanup automático via pg_cron
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_impersonations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.admin_impersonation
  WHERE expires_at < now();
END;
$$;

-- Agenda cleanup a cada 15 minutos (se job já existe, ignora)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-expired-impersonations')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-impersonations');

    PERFORM cron.schedule(
      'cleanup-expired-impersonations',
      '*/15 * * * *',
      $cron$ SELECT public.cleanup_expired_impersonations(); $cron$
    );
  END IF;
END $$;
