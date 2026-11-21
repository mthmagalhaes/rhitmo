DROP POLICY IF EXISTS "Anyone can submit enterprise leads" ON public.enterprise_leads;
CREATE POLICY "Anyone can submit valid enterprise leads" ON public.enterprise_leads
FOR INSERT TO anon, authenticated
WITH CHECK (
  length(btrim(full_name)) BETWEEN 1 AND 200
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 255
  AND length(btrim(company)) BETWEEN 1 AND 200
  AND length(btrim(job_title)) BETWEEN 1 AND 200
  AND length(btrim(company_size)) BETWEEN 1 AND 50
  AND (phone IS NULL OR length(phone) <= 40)
  AND (message IS NULL OR length(message) <= 5000)
  AND (status IS NULL OR status = 'new')
);