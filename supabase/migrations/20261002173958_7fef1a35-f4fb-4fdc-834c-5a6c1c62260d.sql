CREATE TABLE public.content_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  source text NOT NULL,
  utm jsonb,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_leads_email_idx ON public.content_leads (email, created_at DESC);
CREATE INDEX content_leads_ip_idx ON public.content_leads (ip_hash, created_at DESC);
GRANT ALL ON public.content_leads TO service_role;
ALTER TABLE public.content_leads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.public_ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_hash text NOT NULL,
  tool text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX public_ai_usage_idx ON public.public_ai_usage (tool, created_at DESC);
GRANT ALL ON public.public_ai_usage TO service_role;
ALTER TABLE public.public_ai_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.admin_content_leads()
RETURNS TABLE(id uuid, name text, email text, company text, source text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.check_is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT l.id, l.name, l.email, l.company, l.source, l.created_at
    FROM public.content_leads l ORDER BY l.created_at DESC LIMIT 500;
END $$;
REVOKE ALL ON FUNCTION public.admin_content_leads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_content_leads() TO authenticated;