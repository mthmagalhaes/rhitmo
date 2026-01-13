-- Tabela para armazenar impersonations ativas
CREATE TABLE public.admin_impersonation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  impersonated_user_id UUID NOT NULL,
  impersonated_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(admin_user_id)
);

-- RLS: Apenas admins podem gerenciar suas próprias impersonations
ALTER TABLE public.admin_impersonation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage own impersonation"
  ON public.admin_impersonation FOR ALL
  TO authenticated
  USING (is_admin() = true AND admin_user_id = auth.uid())
  WITH CHECK (is_admin() = true AND admin_user_id = auth.uid());

-- Função que retorna o user_id efetivo (impersonado ou real)
CREATE OR REPLACE FUNCTION public.effective_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT impersonated_user_id 
     FROM public.admin_impersonation 
     WHERE admin_user_id = auth.uid()),
    auth.uid()
  )
$$;

-- Atualizar políticas de workspaces para usar effective_user_id()
DROP POLICY IF EXISTS "Owners podem ver seus workspaces" ON public.workspaces;
CREATE POLICY "Owners podem ver seus workspaces" 
  ON public.workspaces FOR SELECT 
  USING (effective_user_id() = owner_id);

DROP POLICY IF EXISTS "Owners podem criar workspaces" ON public.workspaces;
CREATE POLICY "Owners podem criar workspaces" 
  ON public.workspaces FOR INSERT 
  WITH CHECK (effective_user_id() = owner_id);

DROP POLICY IF EXISTS "Owners podem atualizar seus workspaces" ON public.workspaces;
CREATE POLICY "Owners podem atualizar seus workspaces" 
  ON public.workspaces FOR UPDATE 
  USING (effective_user_id() = owner_id);

DROP POLICY IF EXISTS "Owners podem deletar seus workspaces" ON public.workspaces;
CREATE POLICY "Owners podem deletar seus workspaces" 
  ON public.workspaces FOR DELETE 
  USING (effective_user_id() = owner_id);

-- Atualizar políticas de teams
DROP POLICY IF EXISTS "Owners podem ver times do workspace" ON public.teams;
CREATE POLICY "Owners podem ver times do workspace" 
  ON public.teams FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = teams.workspace_id 
    AND w.owner_id = effective_user_id() 
    AND w.is_active = true
  ));

DROP POLICY IF EXISTS "Owners podem criar times" ON public.teams;
CREATE POLICY "Owners podem criar times" 
  ON public.teams FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = teams.workspace_id 
    AND w.owner_id = effective_user_id() 
    AND w.is_active = true
  ));

DROP POLICY IF EXISTS "Owners podem atualizar times" ON public.teams;
CREATE POLICY "Owners podem atualizar times" 
  ON public.teams FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = teams.workspace_id 
    AND w.owner_id = effective_user_id() 
    AND w.is_active = true
  ));

DROP POLICY IF EXISTS "Owners podem deletar times" ON public.teams;
CREATE POLICY "Owners podem deletar times" 
  ON public.teams FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = teams.workspace_id 
    AND w.owner_id = effective_user_id() 
    AND w.is_active = true
  ));

-- Atualizar políticas de team_members
DROP POLICY IF EXISTS "Owners podem ver membros do time" ON public.team_members;
CREATE POLICY "Owners podem ver membros do time" 
  ON public.team_members FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id 
    AND w.owner_id = effective_user_id() 
    AND w.is_active = true
  ));

DROP POLICY IF EXISTS "Owners podem criar membros no time" ON public.team_members;
CREATE POLICY "Owners podem criar membros no time" 
  ON public.team_members FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id 
    AND w.owner_id = effective_user_id() 
    AND w.is_active = true
  ));

DROP POLICY IF EXISTS "Owners podem atualizar membros do time" ON public.team_members;
CREATE POLICY "Owners podem atualizar membros do time" 
  ON public.team_members FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id 
    AND w.owner_id = effective_user_id() 
    AND w.is_active = true
  ));

DROP POLICY IF EXISTS "Owners podem deletar membros do time" ON public.team_members;
CREATE POLICY "Owners podem deletar membros do time" 
  ON public.team_members FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id 
    AND w.owner_id = effective_user_id() 
    AND w.is_active = true
  ));

-- Atualizar políticas de feedbacks
DROP POLICY IF EXISTS "Managers can view own feedbacks" ON public.feedbacks;
CREATE POLICY "Managers can view own feedbacks" 
  ON public.feedbacks FOR SELECT 
  USING (effective_user_id() = manager_id AND EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = feedbacks.member_id AND w.is_active = true
  ));

DROP POLICY IF EXISTS "Managers can create feedbacks" ON public.feedbacks;
CREATE POLICY "Managers can create feedbacks" 
  ON public.feedbacks FOR INSERT 
  WITH CHECK (effective_user_id() = manager_id AND EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = feedbacks.member_id 
    AND w.owner_id = effective_user_id() 
    AND w.is_active = true
  ));

DROP POLICY IF EXISTS "Managers can update own feedbacks" ON public.feedbacks;
CREATE POLICY "Managers can update own feedbacks" 
  ON public.feedbacks FOR UPDATE 
  USING (effective_user_id() = manager_id AND EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = feedbacks.member_id AND w.is_active = true
  ));

DROP POLICY IF EXISTS "Managers can delete own feedbacks" ON public.feedbacks;
CREATE POLICY "Managers can delete own feedbacks" 
  ON public.feedbacks FOR DELETE 
  USING (effective_user_id() = manager_id AND EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = feedbacks.member_id AND w.is_active = true
  ));

-- Atualizar políticas de performance_reviews
DROP POLICY IF EXISTS "Owners podem ver avaliações dos membros" ON public.performance_reviews;
CREATE POLICY "Owners podem ver avaliações dos membros" 
  ON public.performance_reviews FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = performance_reviews.member_id 
    AND w.owner_id = effective_user_id() 
    AND w.is_active = true
  ));

DROP POLICY IF EXISTS "Owners podem criar avaliações" ON public.performance_reviews;
CREATE POLICY "Owners podem criar avaliações" 
  ON public.performance_reviews FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = performance_reviews.member_id 
    AND w.owner_id = effective_user_id() 
    AND w.is_active = true
  ));

DROP POLICY IF EXISTS "Owners podem atualizar avaliações" ON public.performance_reviews;
CREATE POLICY "Owners podem atualizar avaliações" 
  ON public.performance_reviews FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = performance_reviews.member_id 
    AND w.owner_id = effective_user_id() 
    AND w.is_active = true
  ));

DROP POLICY IF EXISTS "Owners podem deletar avaliações" ON public.performance_reviews;
CREATE POLICY "Owners podem deletar avaliações" 
  ON public.performance_reviews FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = performance_reviews.member_id 
    AND w.owner_id = effective_user_id() 
    AND w.is_active = true
  ));

-- Atualizar políticas de chat_threads
DROP POLICY IF EXISTS "Users can view own threads" ON public.chat_threads;
CREATE POLICY "Users can view own threads" 
  ON public.chat_threads FOR SELECT 
  USING (effective_user_id() = user_id);

DROP POLICY IF EXISTS "Users can create own threads" ON public.chat_threads;
CREATE POLICY "Users can create own threads" 
  ON public.chat_threads FOR INSERT 
  WITH CHECK (effective_user_id() = user_id);

DROP POLICY IF EXISTS "Users can update own threads" ON public.chat_threads;
CREATE POLICY "Users can update own threads" 
  ON public.chat_threads FOR UPDATE 
  USING (effective_user_id() = user_id);

DROP POLICY IF EXISTS "Users can delete own threads" ON public.chat_threads;
CREATE POLICY "Users can delete own threads" 
  ON public.chat_threads FOR DELETE 
  USING (effective_user_id() = user_id);

-- Atualizar políticas de mentor_messages
DROP POLICY IF EXISTS "Users can view own mentor messages" ON public.mentor_messages;
CREATE POLICY "Users can view own mentor messages" 
  ON public.mentor_messages FOR SELECT 
  USING (effective_user_id() = user_id);

DROP POLICY IF EXISTS "Users can create own mentor messages" ON public.mentor_messages;
CREATE POLICY "Users can create own mentor messages" 
  ON public.mentor_messages FOR INSERT 
  WITH CHECK (effective_user_id() = user_id);

DROP POLICY IF EXISTS "Users can delete own mentor messages" ON public.mentor_messages;
CREATE POLICY "Users can delete own mentor messages" 
  ON public.mentor_messages FOR DELETE 
  USING (effective_user_id() = user_id);