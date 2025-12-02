-- ============================================
-- FASE 1: ESTRUTURA DE DADOS
-- ============================================

-- 1.1 Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'support');

-- 1.2 Criar tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 1.3 Adicionar coluna is_active em workspaces
ALTER TABLE public.workspaces 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- ============================================
-- FASE 2: FUNÇÕES DE SEGURANÇA
-- ============================================

-- 2.1 Função is_admin() - verifica se o usuário é super admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
$$;

-- 2.2 RPC check_is_admin() para o frontend
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
$$;

-- 2.3 Função auxiliar workspace_is_active()
CREATE OR REPLACE FUNCTION public.workspace_is_active(_workspace_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.workspaces WHERE id = _workspace_id),
    false
  )
$$;

-- ============================================
-- FASE 3: POLÍTICAS RLS "ADMIN FULL ACCESS"
-- ============================================

-- 3.1 Admin Full Access em workspaces
CREATE POLICY "Admin Full Access" ON public.workspaces
  FOR ALL TO authenticated
  USING (is_admin() = true)
  WITH CHECK (is_admin() = true);

-- 3.2 Admin Full Access em teams
CREATE POLICY "Admin Full Access" ON public.teams
  FOR ALL TO authenticated
  USING (is_admin() = true)
  WITH CHECK (is_admin() = true);

-- 3.3 Admin Full Access em team_members
CREATE POLICY "Admin Full Access" ON public.team_members
  FOR ALL TO authenticated
  USING (is_admin() = true)
  WITH CHECK (is_admin() = true);

-- 3.4 Admin Full Access em feedbacks
CREATE POLICY "Admin Full Access" ON public.feedbacks
  FOR ALL TO authenticated
  USING (is_admin() = true)
  WITH CHECK (is_admin() = true);

-- 3.5 Admin Full Access em performance_reviews
CREATE POLICY "Admin Full Access" ON public.performance_reviews
  FOR ALL TO authenticated
  USING (is_admin() = true)
  WITH CHECK (is_admin() = true);

-- 3.6 Admin manage user_roles
CREATE POLICY "Admin manage user_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (is_admin() = true)
  WITH CHECK (is_admin() = true);

-- ============================================
-- FASE 4: ATUALIZAR POLÍTICAS EXISTENTES
-- ============================================

-- 4.1 Atualizar política de SELECT em teams
DROP POLICY IF EXISTS "Owners podem ver times do workspace" ON public.teams;
CREATE POLICY "Owners podem ver times do workspace" ON public.teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = teams.workspace_id 
      AND w.owner_id = auth.uid()
      AND w.is_active = true
    )
  );

-- 4.2 Atualizar política de INSERT em teams
DROP POLICY IF EXISTS "Owners podem criar times" ON public.teams;
CREATE POLICY "Owners podem criar times" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = teams.workspace_id 
      AND w.owner_id = auth.uid()
      AND w.is_active = true
    )
  );

-- 4.3 Atualizar política de UPDATE em teams
DROP POLICY IF EXISTS "Owners podem atualizar times" ON public.teams;
CREATE POLICY "Owners podem atualizar times" ON public.teams
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = teams.workspace_id 
      AND w.owner_id = auth.uid()
      AND w.is_active = true
    )
  );

-- 4.4 Atualizar política de DELETE em teams
DROP POLICY IF EXISTS "Owners podem deletar times" ON public.teams;
CREATE POLICY "Owners podem deletar times" ON public.teams
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = teams.workspace_id 
      AND w.owner_id = auth.uid()
      AND w.is_active = true
    )
  );

-- 4.5 Atualizar políticas de team_members (SELECT)
DROP POLICY IF EXISTS "Owners podem ver membros do time" ON public.team_members;
CREATE POLICY "Owners podem ver membros do time" ON public.team_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.workspaces w ON w.id = t.workspace_id
      WHERE t.id = team_members.team_id
      AND w.owner_id = auth.uid()
      AND w.is_active = true
    )
  );

-- 4.6 Atualizar políticas de team_members (INSERT)
DROP POLICY IF EXISTS "Owners podem criar membros no time" ON public.team_members;
CREATE POLICY "Owners podem criar membros no time" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.workspaces w ON w.id = t.workspace_id
      WHERE t.id = team_members.team_id
      AND w.owner_id = auth.uid()
      AND w.is_active = true
    )
  );

-- 4.7 Atualizar políticas de team_members (UPDATE)
DROP POLICY IF EXISTS "Owners podem atualizar membros do time" ON public.team_members;
CREATE POLICY "Owners podem atualizar membros do time" ON public.team_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.workspaces w ON w.id = t.workspace_id
      WHERE t.id = team_members.team_id
      AND w.owner_id = auth.uid()
      AND w.is_active = true
    )
  );

-- 4.8 Atualizar políticas de team_members (DELETE)
DROP POLICY IF EXISTS "Owners podem deletar membros do time" ON public.team_members;
CREATE POLICY "Owners podem deletar membros do time" ON public.team_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.workspaces w ON w.id = t.workspace_id
      WHERE t.id = team_members.team_id
      AND w.owner_id = auth.uid()
      AND w.is_active = true
    )
  );

-- 4.9 Atualizar políticas de feedbacks
DROP POLICY IF EXISTS "Gerentes podem ver seus feedbacks" ON public.feedbacks;
CREATE POLICY "Gerentes podem ver seus feedbacks" ON public.feedbacks
  FOR SELECT TO authenticated
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

DROP POLICY IF EXISTS "Gerentes podem criar feedbacks" ON public.feedbacks;
CREATE POLICY "Gerentes podem criar feedbacks" ON public.feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = manager_id
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      JOIN public.workspaces w ON w.id = t.workspace_id
      WHERE tm.id = feedbacks.member_id
      AND w.is_active = true
    )
  );

DROP POLICY IF EXISTS "Gerentes podem atualizar seus feedbacks" ON public.feedbacks;
CREATE POLICY "Gerentes podem atualizar seus feedbacks" ON public.feedbacks
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "Gerentes podem deletar seus feedbacks" ON public.feedbacks;
CREATE POLICY "Gerentes podem deletar seus feedbacks" ON public.feedbacks
  FOR DELETE TO authenticated
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

-- 4.10 Atualizar políticas de performance_reviews
DROP POLICY IF EXISTS "Owners podem ver avaliações dos membros" ON public.performance_reviews;
CREATE POLICY "Owners podem ver avaliações dos membros" ON public.performance_reviews
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      JOIN public.workspaces w ON w.id = t.workspace_id
      WHERE tm.id = performance_reviews.member_id
      AND w.owner_id = auth.uid()
      AND w.is_active = true
    )
  );

DROP POLICY IF EXISTS "Owners podem criar avaliações" ON public.performance_reviews;
CREATE POLICY "Owners podem criar avaliações" ON public.performance_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      JOIN public.workspaces w ON w.id = t.workspace_id
      WHERE tm.id = performance_reviews.member_id
      AND w.owner_id = auth.uid()
      AND w.is_active = true
    )
  );

DROP POLICY IF EXISTS "Owners podem atualizar avaliações" ON public.performance_reviews;
CREATE POLICY "Owners podem atualizar avaliações" ON public.performance_reviews
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      JOIN public.workspaces w ON w.id = t.workspace_id
      WHERE tm.id = performance_reviews.member_id
      AND w.owner_id = auth.uid()
      AND w.is_active = true
    )
  );

DROP POLICY IF EXISTS "Owners podem deletar avaliações" ON public.performance_reviews;
CREATE POLICY "Owners podem deletar avaliações" ON public.performance_reviews
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      JOIN public.workspaces w ON w.id = t.workspace_id
      WHERE tm.id = performance_reviews.member_id
      AND w.owner_id = auth.uid()
      AND w.is_active = true
    )
  );

-- ============================================
-- FASE 5: INSERIR SUPER ADMIN INICIAL
-- ============================================

-- Inserir matheus@rhitmo.co como super_admin
-- NOTA: Esta query só funcionará APÓS o usuário fazer login pela primeira vez
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role 
FROM auth.users 
WHERE email = 'matheus@rhitmo.co'
ON CONFLICT (user_id, role) DO NOTHING;