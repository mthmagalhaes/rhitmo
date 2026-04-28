-- ════════════════════════════════════════════════════════════
-- ISSUE 2: OAuth state validation — server-side nonce store
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.oauth_states (
  state_token text PRIMARY KEY,
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'google_calendar',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

CREATE INDEX IF NOT EXISTS oauth_states_expires_at_idx ON public.oauth_states (expires_at);

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Only service role can manage oauth state nonces.
-- No policies for authenticated/anon → they get zero access by RLS default-deny.
CREATE POLICY "Service role manages oauth_states"
ON public.oauth_states
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Helper to opportunistically clean expired entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.oauth_states WHERE expires_at < now();
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_oauth_states() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_oauth_states() TO service_role;

-- ════════════════════════════════════════════════════════════
-- ISSUE 3: enterprise_leads — public INSERT + service_role DELETE
-- ════════════════════════════════════════════════════════════
CREATE POLICY "Anyone can submit enterprise leads"
ON public.enterprise_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Service role can delete enterprise leads"
ON public.enterprise_leads
FOR DELETE
TO service_role
USING (true);