-- ============================================================
-- FASE 1: CRIAR NOVAS TABELAS (workspaces e teams)
-- ============================================================

-- Tabela workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspaces_owner_id ON public.workspaces(owner_id);

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teams_workspace_id ON public.teams(workspace_id);

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FASE 2: ALTERAR team_members (adicionar team_id)
-- ============================================================

ALTER TABLE public.team_members
ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);

-- ============================================================
-- FASE 3: MIGRAÇÃO DE DADOS EXISTENTES
-- ============================================================

DO $$
DECLARE
  manager_record RECORD;
  new_workspace_id UUID;
  new_team_id UUID;
BEGIN
  -- Para cada user_id único que tem liderados
  FOR manager_record IN 
    SELECT DISTINCT user_id 
    FROM public.team_members 
    WHERE user_id IS NOT NULL
  LOOP
    -- 1. Criar Workspace padrão "Meu Workspace"
    INSERT INTO public.workspaces (name, owner_id)
    VALUES ('Meu Workspace', manager_record.user_id)
    RETURNING id INTO new_workspace_id;
    
    -- 2. Criar Time padrão "Geral"
    INSERT INTO public.teams (workspace_id, name)
    VALUES (new_workspace_id, 'Geral')
    RETURNING id INTO new_team_id;
    
    -- 3. Atualizar todos os team_members desse gerente
    UPDATE public.team_members
    SET team_id = new_team_id
    WHERE user_id = manager_record.user_id;
    
    RAISE NOTICE 'Migrado: user_id=%, workspace_id=%, team_id=%', 
      manager_record.user_id, new_workspace_id, new_team_id;
  END LOOP;
END $$;

-- Tornar team_id obrigatório após migração
ALTER TABLE public.team_members
ALTER COLUMN team_id SET NOT NULL;

-- ============================================================
-- FASE 4: FUNÇÕES HELPER PARA RLS (evitar recursão)
-- ============================================================

-- Função que verifica se o usuário possui o team
CREATE OR REPLACE FUNCTION public.user_owns_team(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    JOIN public.workspaces w ON w.id = t.workspace_id
    WHERE t.id = _team_id
      AND w.owner_id = _user_id
  )
$$;

-- Função que verifica se o usuário é owner do workspace
CREATE OR REPLACE FUNCTION public.is_workspace_owner(_user_id UUID, _member_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    JOIN public.workspaces w ON w.id = t.workspace_id
    WHERE tm.id = _member_id
      AND w.owner_id = _user_id
  )
$$;

-- ============================================================
-- FASE 5: RLS PARA WORKSPACES
-- ============================================================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners podem ver seus workspaces"
ON public.workspaces FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Owners podem criar workspaces"
ON public.workspaces FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners podem atualizar seus workspaces"
ON public.workspaces FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Owners podem deletar seus workspaces"
ON public.workspaces FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- ============================================================
-- FASE 6: RLS PARA TEAMS
-- ============================================================

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners podem ver times do workspace"
ON public.teams FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners podem criar times"
ON public.teams FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners podem atualizar times"
ON public.teams FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners podem deletar times"
ON public.teams FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND w.owner_id = auth.uid()
  )
);

-- ============================================================
-- FASE 7: ATUALIZAR RLS DE team_members
-- ============================================================

-- Remover políticas antigas baseadas em user_id
DROP POLICY IF EXISTS "Gerentes podem ver seus liderados" ON public.team_members;
DROP POLICY IF EXISTS "Gerentes podem criar liderados" ON public.team_members;
DROP POLICY IF EXISTS "Gerentes podem atualizar seus liderados" ON public.team_members;
DROP POLICY IF EXISTS "Gerentes podem deletar seus liderados" ON public.team_members;

-- Novas políticas baseadas em workspace ownership
CREATE POLICY "Owners podem ver membros do time"
ON public.team_members FOR SELECT
TO authenticated
USING (public.user_owns_team(auth.uid(), team_id));

CREATE POLICY "Owners podem criar membros no time"
ON public.team_members FOR INSERT
TO authenticated
WITH CHECK (public.user_owns_team(auth.uid(), team_id));

CREATE POLICY "Owners podem atualizar membros do time"
ON public.team_members FOR UPDATE
TO authenticated
USING (public.user_owns_team(auth.uid(), team_id));

CREATE POLICY "Owners podem deletar membros do time"
ON public.team_members FOR DELETE
TO authenticated
USING (public.user_owns_team(auth.uid(), team_id));

-- Manter políticas públicas para Rhitmo Sync
-- (já existem: "Qualquer pessoa pode ler membros para sync")
-- (já existem: "Permitir update work_style_data via link público")