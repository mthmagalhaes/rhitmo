CREATE TABLE IF NOT EXISTS public.onboarding_funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  workspace_id UUID,
  member_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_funnel_events_created_at
  ON public.onboarding_funnel_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_funnel_events_event_type
  ON public.onboarding_funnel_events (event_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_funnel_events_workspace
  ON public.onboarding_funnel_events (workspace_id);

ALTER TABLE public.onboarding_funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_own_funnel_events"
  ON public.onboarding_funnel_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "users_read_own_funnel_events"
  ON public.onboarding_funnel_events
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin_user(auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.onboarding_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  workspaces_fixed INT NOT NULL DEFAULT 0,
  members_linked INT NOT NULL DEFAULT 0,
  invites_expired INT NOT NULL DEFAULT 0,
  duration_ms INT,
  errors JSONB DEFAULT '[]'::jsonb,
  summary JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_onboarding_reconciliation_log_ran_at
  ON public.onboarding_reconciliation_log (ran_at DESC);

ALTER TABLE public.onboarding_reconciliation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_reads_reconciliation_log"
  ON public.onboarding_reconciliation_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_suppressed_member_emails()
RETURNS TABLE(email TEXT, reason TEXT, suppressed_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    LOWER(s.email)::text AS email,
    s.reason::text AS reason,
    s.created_at AS suppressed_at
  FROM public.suppressed_emails s
  INNER JOIN public.team_members tm
    ON LOWER(tm.email) = LOWER(s.email)
  WHERE tm.user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_suppressed_member_emails() TO authenticated;