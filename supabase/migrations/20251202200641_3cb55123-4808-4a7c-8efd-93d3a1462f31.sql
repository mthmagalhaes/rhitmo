-- Criar tabela waitlist_leads
CREATE TABLE public.waitlist_leads (
  email TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  team_size TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.waitlist_leads ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer pessoa pode inserir (anon e authenticated)
CREATE POLICY "Anon pode inserir na waitlist"
ON public.waitlist_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política: Apenas admin pode ver os leads
CREATE POLICY "Admin pode ver leads"
ON public.waitlist_leads
FOR SELECT
USING (public.is_admin() = true);

-- Política: Admin full access para delete/update
CREATE POLICY "Admin Full Access"
ON public.waitlist_leads
FOR ALL
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);