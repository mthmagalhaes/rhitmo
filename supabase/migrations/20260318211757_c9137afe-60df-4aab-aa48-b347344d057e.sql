
-- 1. Tables
CREATE TABLE public.competency_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Framework Padrão Rhitmo',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competency_frameworks_workspace_id_key UNIQUE (workspace_id)
);

CREATE TABLE public.competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL REFERENCES public.competency_frameworks(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  "order" integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.competency_level_descriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id uuid NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  seniority_level text NOT NULL,
  description text NOT NULL,
  examples jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competency_level_unique UNIQUE (competency_id, seniority_level)
);

-- 2. Updated_at triggers
CREATE TRIGGER update_competency_frameworks_updated_at
  BEFORE UPDATE ON public.competency_frameworks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. RLS
ALTER TABLE public.competency_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competency_level_descriptions ENABLE ROW LEVEL SECURITY;

-- competency_frameworks policies
CREATE POLICY "Users can view workspace frameworks" ON public.competency_frameworks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = competency_frameworks.workspace_id
        AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id))
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE t.workspace_id = competency_frameworks.workspace_id
        AND tm.linked_user_id = auth.uid()
    )
  );

CREATE POLICY "Owner/HR can insert frameworks" ON public.competency_frameworks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = competency_frameworks.workspace_id
        AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id))
    )
  );

CREATE POLICY "Owner/HR can update frameworks" ON public.competency_frameworks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = competency_frameworks.workspace_id
        AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id))
    )
  );

CREATE POLICY "Owner/HR can delete frameworks" ON public.competency_frameworks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = competency_frameworks.workspace_id
        AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id))
    )
  );

-- competencies policies
CREATE POLICY "Users can view competencies" ON public.competencies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.competency_frameworks cf
      JOIN public.workspaces w ON w.id = cf.workspace_id
      WHERE cf.id = competencies.framework_id
        AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id))
    )
    OR EXISTS (
      SELECT 1 FROM public.competency_frameworks cf
      JOIN public.teams t ON t.workspace_id = cf.workspace_id
      JOIN public.team_members tm ON tm.team_id = t.id
      WHERE cf.id = competencies.framework_id
        AND tm.linked_user_id = auth.uid()
    )
  );

CREATE POLICY "Owner/HR can insert competencies" ON public.competencies
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.competency_frameworks cf
      JOIN public.workspaces w ON w.id = cf.workspace_id
      WHERE cf.id = competencies.framework_id
        AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id))
    )
  );

CREATE POLICY "Owner/HR can update competencies" ON public.competencies
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.competency_frameworks cf
      JOIN public.workspaces w ON w.id = cf.workspace_id
      WHERE cf.id = competencies.framework_id
        AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id))
    )
  );

CREATE POLICY "Owner/HR can delete competencies" ON public.competencies
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.competency_frameworks cf
      JOIN public.workspaces w ON w.id = cf.workspace_id
      WHERE cf.id = competencies.framework_id
        AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id))
    )
  );

-- competency_level_descriptions policies
CREATE POLICY "Users can view level descriptions" ON public.competency_level_descriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.competencies c
      JOIN public.competency_frameworks cf ON cf.id = c.framework_id
      JOIN public.workspaces w ON w.id = cf.workspace_id
      WHERE c.id = competency_level_descriptions.competency_id
        AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id))
    )
    OR EXISTS (
      SELECT 1 FROM public.competencies c
      JOIN public.competency_frameworks cf ON cf.id = c.framework_id
      JOIN public.teams t ON t.workspace_id = cf.workspace_id
      JOIN public.team_members tm ON tm.team_id = t.id
      WHERE c.id = competency_level_descriptions.competency_id
        AND tm.linked_user_id = auth.uid()
    )
  );

CREATE POLICY "Owner/HR can insert level descriptions" ON public.competency_level_descriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.competencies c
      JOIN public.competency_frameworks cf ON cf.id = c.framework_id
      JOIN public.workspaces w ON w.id = cf.workspace_id
      WHERE c.id = competency_level_descriptions.competency_id
        AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id))
    )
  );

CREATE POLICY "Owner/HR can update level descriptions" ON public.competency_level_descriptions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.competencies c
      JOIN public.competency_frameworks cf ON cf.id = c.framework_id
      JOIN public.workspaces w ON w.id = cf.workspace_id
      WHERE c.id = competency_level_descriptions.competency_id
        AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id))
    )
  );

CREATE POLICY "Owner/HR can delete level descriptions" ON public.competency_level_descriptions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.competencies c
      JOIN public.competency_frameworks cf ON cf.id = c.framework_id
      JOIN public.workspaces w ON w.id = cf.workspace_id
      WHERE c.id = competency_level_descriptions.competency_id
        AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id))
    )
  );

-- 4. Function to create default framework
CREATE OR REPLACE FUNCTION public.create_default_competency_framework(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_framework_id uuid;
  v_comp_id uuid;
BEGIN
  -- Create framework
  INSERT INTO public.competency_frameworks (workspace_id)
  VALUES (p_workspace_id)
  RETURNING id INTO v_framework_id;

  -- 1. Comunicação
  INSERT INTO public.competencies (framework_id, name, description, "order")
  VALUES (v_framework_id, 'Comunicação', 'Habilidade de transmitir ideias de forma clara e eficaz', 1)
  RETURNING id INTO v_comp_id;

  INSERT INTO public.competency_level_descriptions (competency_id, seniority_level, description) VALUES
    (v_comp_id, 'junior', 'Comunica ideias de forma clara em conversas individuais. Pede ajuda quando não entende algo.'),
    (v_comp_id, 'pleno', 'Comunica ideias complexas para diferentes audiências. Facilita discussões em grupo.'),
    (v_comp_id, 'senior', 'Adapta comunicação ao contexto e audiência. Influencia decisões através de argumentação estruturada.'),
    (v_comp_id, 'especialista', 'Define padrões de comunicação para o time. Comunica visão estratégica de forma inspiradora.');

  -- 2. Ownership
  INSERT INTO public.competencies (framework_id, name, description, "order")
  VALUES (v_framework_id, 'Ownership', 'Capacidade de assumir responsabilidade e entregar resultados', 2)
  RETURNING id INTO v_comp_id;

  INSERT INTO public.competency_level_descriptions (competency_id, seniority_level, description) VALUES
    (v_comp_id, 'junior', 'Entrega tarefas atribuídas com qualidade e no prazo. Busca feedback proativo.'),
    (v_comp_id, 'pleno', 'Assume responsabilidade por projetos completos. Identifica e resolve impedimentos.'),
    (v_comp_id, 'senior', 'Assume ownership de iniciativas estratégicas. Antecipa problemas e age preventivamente.'),
    (v_comp_id, 'especialista', 'Define direção técnica/estratégica. Assume ownership de resultados do time/produto.');

  -- 3. Colaboração
  INSERT INTO public.competencies (framework_id, name, description, "order")
  VALUES (v_framework_id, 'Colaboração', 'Habilidade de trabalhar efetivamente com outros', 3)
  RETURNING id INTO v_comp_id;

  INSERT INTO public.competency_level_descriptions (competency_id, seniority_level, description) VALUES
    (v_comp_id, 'junior', 'Trabalha bem com pares. Contribui em discussões de time.'),
    (v_comp_id, 'pleno', 'Colabora efetivamente entre times. Mentora colegas júniores.'),
    (v_comp_id, 'senior', 'Constrói consenso em temas complexos. Remove silos entre áreas.'),
    (v_comp_id, 'especialista', 'Cria cultura de colaboração. Facilita alinhamento entre múltiplas áreas.');

  -- 4. Resolução de Problemas
  INSERT INTO public.competencies (framework_id, name, description, "order")
  VALUES (v_framework_id, 'Resolução de Problemas', 'Capacidade de analisar e resolver problemas de complexidade crescente', 4)
  RETURNING id INTO v_comp_id;

  INSERT INTO public.competency_level_descriptions (competency_id, seniority_level, description) VALUES
    (v_comp_id, 'junior', 'Resolve problemas bem definidos com orientação. Aprende com erros.'),
    (v_comp_id, 'pleno', 'Resolve problemas ambíguos de forma independente. Propõe soluções alternativas.'),
    (v_comp_id, 'senior', 'Quebra problemas complexos em partes gerenciáveis. Equilibra trade-offs.'),
    (v_comp_id, 'especialista', 'Define abordagens para problemas sem precedentes. Ensina frameworks de problem-solving.');

  -- 5. Adaptabilidade
  INSERT INTO public.competencies (framework_id, name, description, "order")
  VALUES (v_framework_id, 'Adaptabilidade', 'Capacidade de se ajustar a mudanças e contextos de incerteza', 5)
  RETURNING id INTO v_comp_id;

  INSERT INTO public.competency_level_descriptions (competency_id, seniority_level, description) VALUES
    (v_comp_id, 'junior', 'Aceita mudanças de prioridade com atitude positiva. Pede clarificação quando necessário.'),
    (v_comp_id, 'pleno', 'Ajusta planos rapidamente frente a novas informações. Mantém produtividade em contextos de incerteza.'),
    (v_comp_id, 'senior', 'Lidera mudanças organizacionais. Ajuda outros a navegarem transições.'),
    (v_comp_id, 'especialista', 'Antecipa necessidade de mudanças. Constrói sistemas e times resilientes.');

  -- 6. Desenvolvimento Contínuo
  INSERT INTO public.competencies (framework_id, name, description, "order")
  VALUES (v_framework_id, 'Desenvolvimento Contínuo', 'Comprometimento com aprendizado e evolução constante', 6)
  RETURNING id INTO v_comp_id;

  INSERT INTO public.competency_level_descriptions (competency_id, seniority_level, description) VALUES
    (v_comp_id, 'junior', 'Busca feedback ativamente. Investe em aprendizado de fundamentos.'),
    (v_comp_id, 'pleno', 'Define plano de desenvolvimento próprio. Busca experiências desafiadoras.'),
    (v_comp_id, 'senior', 'Desenvolve expertise profunda. Ensina e desenvolve outros.'),
    (v_comp_id, 'especialista', 'Referência na área de atuação. Contribui para evolução da indústria.');
END;
$$;

-- 5. Trigger on workspace creation
CREATE OR REPLACE FUNCTION public.trigger_create_default_framework()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.create_default_competency_framework(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workspace_created_create_framework
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_create_default_framework();
