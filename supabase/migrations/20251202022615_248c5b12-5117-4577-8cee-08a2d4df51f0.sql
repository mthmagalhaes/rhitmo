-- FASE 1: Correções de Segurança RLS (CRÍTICO)

-- 1.1 Criar função de validação para Rhitmo Sync
CREATE OR REPLACE FUNCTION public.can_update_own_sync(member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE id = member_id
    AND work_style_data IS NULL
  )
$$;

-- 1.2 Remover políticas públicas perigosas
DROP POLICY IF EXISTS "Qualquer pessoa pode ler membros para sync" ON public.team_members;
DROP POLICY IF EXISTS "Permitir update work_style_data via link público" ON public.team_members;

-- 1.3 Criar política de update restrita para Sync
CREATE POLICY "Permitir update work_style_data apenas via sync"
ON public.team_members
FOR UPDATE
TO anon, authenticated
USING (work_style_data IS NULL)
WITH CHECK (
  work_style_data IS NOT NULL AND
  jsonb_typeof(work_style_data) = 'object'
);

-- 1.4 Criar função RPC para leitura segura do Sync
CREATE OR REPLACE FUNCTION public.get_member_for_sync(p_member_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  role text,
  work_style_data jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, role, work_style_data
  FROM public.team_members
  WHERE id = p_member_id
$$;

-- FASE 2: Índices de Performance

-- 2.1 Índice para performance_reviews.member_id
CREATE INDEX IF NOT EXISTS idx_performance_reviews_member_id 
ON public.performance_reviews USING btree (member_id);

-- 2.2 Índice para performance_reviews.created_at (ordenação DESC)
CREATE INDEX IF NOT EXISTS idx_performance_reviews_created_at 
ON public.performance_reviews USING btree (created_at DESC);