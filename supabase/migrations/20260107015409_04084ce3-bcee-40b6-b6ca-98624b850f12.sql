-- ========================================
-- CORREÇÃO DE VULNERABILIDADES CRÍTICAS RLS
-- ========================================

-- 1. FEEDBACKS: Remover admin cross-tenant
DROP POLICY IF EXISTS "Admin full access to feedbacks" ON public.feedbacks;

-- 2. TEAM_MEMBERS: Corrigir brecha anon + admin cross-tenant
DROP POLICY IF EXISTS "Admin Full Access" ON public.team_members;
DROP POLICY IF EXISTS "Permitir update work_style_data apenas via sync" ON public.team_members;

-- 3. PERFORMANCE_REVIEWS: Remover admin cross-tenant
DROP POLICY IF EXISTS "Admin Full Access" ON public.performance_reviews;

-- 4. MENTOR_MESSAGES: Remover admin cross-tenant
DROP POLICY IF EXISTS "Admin Full Access" ON public.mentor_messages;

-- 5. TEAMS: Remover admin cross-tenant
DROP POLICY IF EXISTS "Admin Full Access" ON public.teams;

-- 6. WORKSPACES: Remover admin cross-tenant
DROP POLICY IF EXISTS "Admin Full Access" ON public.workspaces;