-- Create goals table for structured objectives tracking
CREATE TABLE public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT, -- HTML from RichTextEditor
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  start_date DATE DEFAULT CURRENT_DATE,
  target_date DATE,
  metric_current NUMERIC,
  metric_target NUMERIC,
  metric_unit TEXT, -- ex: "SQLs", "horas", "%"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Index for member lookup
CREATE INDEX goals_member_id_idx ON public.goals(member_id);

-- Trigger for updated_at
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Owners can manage goals of their team members
CREATE POLICY "Owners podem ver metas dos membros"
  ON public.goals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = goals.member_id
    AND w.owner_id = effective_user_id()
    AND w.is_active = true
  ));

CREATE POLICY "Owners podem criar metas"
  ON public.goals FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = goals.member_id
    AND w.owner_id = effective_user_id()
    AND w.is_active = true
  ));

CREATE POLICY "Owners podem atualizar metas"
  ON public.goals FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = goals.member_id
    AND w.owner_id = effective_user_id()
    AND w.is_active = true
  ));

CREATE POLICY "Owners podem deletar metas"
  ON public.goals FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE tm.id = goals.member_id
    AND w.owner_id = effective_user_id()
    AND w.is_active = true
  ));