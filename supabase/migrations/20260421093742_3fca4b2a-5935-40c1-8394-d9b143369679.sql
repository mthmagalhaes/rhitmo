
-- =========================================================
-- Sprint 3 / Onda 3A — Automation Infrastructure
-- =========================================================

-- 1) automation_runs: observabilidade dos jobs cron
CREATE TABLE public.automation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','partial','error')),
  items_processed INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_automation_runs_job_started ON public.automation_runs(job_name, started_at DESC);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

-- Apenas super admin lê (via is_admin_user existente)
CREATE POLICY "automation_runs_admin_read"
  ON public.automation_runs FOR SELECT
  USING (public.is_admin_user(auth.uid()));

-- Service role (edge functions) escreve via bypass de RLS — nenhuma policy de write necessária.

-- =========================================================

-- 2) mirror_insights: insights da Mirror Function por líder/semana
CREATE TABLE public.mirror_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  week_starting DATE NOT NULL,
  summary TEXT NOT NULL,
  contradiction_score NUMERIC(5,2) NOT NULL CHECK (contradiction_score >= 0 AND contradiction_score <= 100),
  declared_priorities JSONB NOT NULL DEFAULT '[]'::jsonb,
  observed_themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_action TEXT,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (manager_id, week_starting)
);

CREATE INDEX idx_mirror_insights_manager_week ON public.mirror_insights(manager_id, week_starting DESC);
CREATE INDEX idx_mirror_insights_active ON public.mirror_insights(manager_id) WHERE dismissed_at IS NULL;

ALTER TABLE public.mirror_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mirror_insights_owner_read"
  ON public.mirror_insights FOR SELECT
  USING (manager_id = auth.uid());

CREATE POLICY "mirror_insights_owner_update"
  ON public.mirror_insights FOR UPDATE
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

-- HR admins do workspace também leem (visibilidade gerencial)
CREATE POLICY "mirror_insights_hr_read"
  ON public.mirror_insights FOR SELECT
  USING (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = mirror_insights.workspace_id
        AND auth.uid() = ANY(w.hr_admin_ids)
    )
  );

-- =========================================================

-- 3) member_prompts: prompts de auto-reflexão semanais
CREATE TABLE public.member_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_key TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  week_starting DATE NOT NULL,
  response TEXT,
  answered_at TIMESTAMPTZ,
  shared_with_leader BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, week_starting)
);

CREATE INDEX idx_member_prompts_user_week ON public.member_prompts(linked_user_id, week_starting DESC);
CREATE INDEX idx_member_prompts_unanswered ON public.member_prompts(linked_user_id) WHERE answered_at IS NULL;

ALTER TABLE public.member_prompts ENABLE ROW LEVEL SECURITY;

-- Liderado vinculado lê e atualiza seus próprios prompts
CREATE POLICY "member_prompts_self_read"
  ON public.member_prompts FOR SELECT
  USING (linked_user_id = auth.uid());

CREATE POLICY "member_prompts_self_update"
  ON public.member_prompts FOR UPDATE
  USING (linked_user_id = auth.uid())
  WITH CHECK (linked_user_id = auth.uid());

-- Líder do time lê apenas se o liderado optou por compartilhar
CREATE POLICY "member_prompts_leader_read_if_shared"
  ON public.member_prompts FOR SELECT
  USING (
    shared_with_leader = true
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.id = member_prompts.member_id
        AND t.leader_user_id = auth.uid()
    )
  );

-- =========================================================
-- Trigger para preencher linked_user_id automaticamente em member_prompts
CREATE OR REPLACE FUNCTION public.populate_member_prompt_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.linked_user_id IS NULL THEN
    SELECT linked_user_id INTO NEW.linked_user_id
    FROM public.team_members
    WHERE id = NEW.member_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER member_prompts_set_user_id
  BEFORE INSERT ON public.member_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_member_prompt_user_id();
