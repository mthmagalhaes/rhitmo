-- ============================================
-- FIX: waitlist_leads - Remover exposição pública
-- ============================================

-- Dropar políticas existentes que podem estar causando exposição
DROP POLICY IF EXISTS "Admin Full Access" ON public.waitlist_leads;
DROP POLICY IF EXISTS "Anon pode inserir na waitlist" ON public.waitlist_leads;
DROP POLICY IF EXISTS "Admin pode ver leads" ON public.waitlist_leads;

-- Recriar políticas como PERMISSIVE (padrão correto)
-- 1. Admin pode fazer tudo
CREATE POLICY "Admin full access to waitlist"
ON public.waitlist_leads
FOR ALL
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

-- 2. Qualquer pessoa pode inserir (formulário público na landing page)
CREATE POLICY "Public can insert waitlist leads"
ON public.waitlist_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 3. NENHUMA política de SELECT público - apenas admin pode ler

-- ============================================
-- FIX: feedbacks - Garantir acesso apenas ao manager/owner
-- ============================================

-- Dropar políticas existentes
DROP POLICY IF EXISTS "Admin Full Access" ON public.feedbacks;
DROP POLICY IF EXISTS "Gerentes podem ver seus feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Gerentes podem criar feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Gerentes podem atualizar seus feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Gerentes podem deletar seus feedbacks" ON public.feedbacks;

-- Recriar políticas PERMISSIVE corretas
-- 1. Admin pode fazer tudo
CREATE POLICY "Admin full access to feedbacks"
ON public.feedbacks
FOR ALL
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

-- 2. Gerentes podem ver feedbacks que CRIARAM em workspaces ATIVOS
CREATE POLICY "Managers can view own feedbacks"
ON public.feedbacks
FOR SELECT
TO authenticated
USING (
  auth.uid() = manager_id 
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    JOIN public.workspaces w ON w.id = t.workspace_id
    WHERE tm.id = feedbacks.member_id 
    AND w.is_active = true
  )
);

-- 3. Gerentes podem criar feedbacks para membros do seu workspace
CREATE POLICY "Managers can create feedbacks"
ON public.feedbacks
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = manager_id 
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    JOIN public.workspaces w ON w.id = t.workspace_id
    WHERE tm.id = feedbacks.member_id 
    AND w.owner_id = auth.uid()
    AND w.is_active = true
  )
);

-- 4. Gerentes podem atualizar feedbacks que criaram
CREATE POLICY "Managers can update own feedbacks"
ON public.feedbacks
FOR UPDATE
TO authenticated
USING (
  auth.uid() = manager_id 
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    JOIN public.workspaces w ON w.id = t.workspace_id
    WHERE tm.id = feedbacks.member_id 
    AND w.is_active = true
  )
);

-- 5. Gerentes podem deletar feedbacks que criaram
CREATE POLICY "Managers can delete own feedbacks"
ON public.feedbacks
FOR DELETE
TO authenticated
USING (
  auth.uid() = manager_id 
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    JOIN public.workspaces w ON w.id = t.workspace_id
    WHERE tm.id = feedbacks.member_id 
    AND w.is_active = true
  )
);

-- ============================================
-- FIX: user_roles - Usuários só veem seus próprios roles
-- ============================================

-- Dropar política permissiva demais
DROP POLICY IF EXISTS "Authenticated users can read user_roles" ON public.user_roles;

-- Criar política restrita: usuário só vê seus próprios roles
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);