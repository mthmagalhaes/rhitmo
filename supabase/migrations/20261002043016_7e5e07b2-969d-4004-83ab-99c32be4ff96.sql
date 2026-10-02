ALTER TABLE public.upcoming_meetings ADD COLUMN IF NOT EXISTS bot_blocked_reason text;

CREATE TABLE public.trial_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  template text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, template)
);
GRANT ALL ON public.trial_email_log TO service_role;
ALTER TABLE public.trial_email_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.admin_unconfirmed_signups()
RETURNS TABLE(user_id uuid, email text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.check_is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT u.id, u.email::text, u.created_at
    FROM auth.users u
    WHERE u.email_confirmed_at IS NULL
      AND u.created_at < now() - interval '1 hour'
      AND u.created_at > now() - interval '30 days'
    ORDER BY u.created_at DESC
    LIMIT 100;
END $$;
REVOKE ALL ON FUNCTION public.admin_unconfirmed_signups() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_unconfirmed_signups() TO authenticated;