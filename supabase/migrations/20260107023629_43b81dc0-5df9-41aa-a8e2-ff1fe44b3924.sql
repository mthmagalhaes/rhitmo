-- ========================================
-- WAITLIST_LEADS: Políticas RLS Estritas
-- ========================================

-- 1. Remover políticas antigas
DROP POLICY IF EXISTS "Admin full access to waitlist" ON public.waitlist_leads;
DROP POLICY IF EXISTS "Public can insert waitlist leads" ON public.waitlist_leads;

-- 2. INSERT: Permitir anon e authenticated (formulário público)
CREATE POLICY "Anyone can submit to waitlist"
ON public.waitlist_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 3. SELECT: Apenas admins podem ler (service_role bypassa RLS automaticamente)
CREATE POLICY "Only admins can view waitlist"
ON public.waitlist_leads
FOR SELECT
TO authenticated
USING (public.is_admin() = true);

-- 4. UPDATE: Apenas admins podem atualizar status
CREATE POLICY "Only admins can update waitlist"
ON public.waitlist_leads
FOR UPDATE
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

-- 5. DELETE: Apenas admins podem deletar
CREATE POLICY "Only admins can delete waitlist"
ON public.waitlist_leads
FOR DELETE
TO authenticated
USING (public.is_admin() = true);