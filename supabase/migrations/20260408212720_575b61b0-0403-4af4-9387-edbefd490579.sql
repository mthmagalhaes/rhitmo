CREATE TABLE public.enterprise_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company_size TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  consent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.enterprise_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read enterprise leads"
  ON public.enterprise_leads
  FOR SELECT
  TO authenticated
  USING (public.is_admin());