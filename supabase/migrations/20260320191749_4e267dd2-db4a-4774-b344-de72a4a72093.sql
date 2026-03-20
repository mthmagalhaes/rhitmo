
-- 1. job_roles table
CREATE TABLE IF NOT EXISTS public.job_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES public.competency_frameworks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  level TEXT CHECK (level IN ('Júnior', 'Pleno', 'Sênior', 'Especialista', 'Staff', 'Principal')),
  department TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_roles_framework ON public.job_roles(framework_id);

CREATE TRIGGER update_job_roles_updated_at
  BEFORE UPDATE ON public.job_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner/HR can view job roles"
  ON public.job_roles FOR SELECT TO authenticated
  USING (
    framework_id IN (
      SELECT cf.id FROM competency_frameworks cf
      JOIN workspaces w ON cf.workspace_id = w.id
      WHERE w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id)
    )
  );

CREATE POLICY "Owner/HR can manage job roles"
  ON public.job_roles FOR ALL TO authenticated
  USING (
    framework_id IN (
      SELECT cf.id FROM competency_frameworks cf
      JOIN workspaces w ON cf.workspace_id = w.id
      WHERE w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id)
    )
  )
  WITH CHECK (
    framework_id IN (
      SELECT cf.id FROM competency_frameworks cf
      JOIN workspaces w ON cf.workspace_id = w.id
      WHERE w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id)
    )
  );

-- 2. role_competencies table
CREATE TABLE IF NOT EXISTS public.role_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_role_id UUID NOT NULL REFERENCES public.job_roles(id) ON DELETE CASCADE,
  competency_id UUID NOT NULL REFERENCES public.competencies(id) ON DELETE CASCADE,
  expected_level TEXT CHECK (expected_level IN ('Júnior', 'Pleno', 'Sênior', 'Especialista')),
  is_required BOOLEAN DEFAULT true,
  weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_role_id, competency_id)
);

CREATE INDEX idx_role_competencies_role ON public.role_competencies(job_role_id);
CREATE INDEX idx_role_competencies_competency ON public.role_competencies(competency_id);

ALTER TABLE public.role_competencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner/HR can view role competencies"
  ON public.role_competencies FOR SELECT TO authenticated
  USING (
    job_role_id IN (
      SELECT jr.id FROM job_roles jr
      JOIN competency_frameworks cf ON jr.framework_id = cf.id
      JOIN workspaces w ON cf.workspace_id = w.id
      WHERE w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id)
    )
  );

CREATE POLICY "Owner/HR can manage role competencies"
  ON public.role_competencies FOR ALL TO authenticated
  USING (
    job_role_id IN (
      SELECT jr.id FROM job_roles jr
      JOIN competency_frameworks cf ON jr.framework_id = cf.id
      JOIN workspaces w ON cf.workspace_id = w.id
      WHERE w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id)
    )
  )
  WITH CHECK (
    job_role_id IN (
      SELECT jr.id FROM job_roles jr
      JOIN competency_frameworks cf ON jr.framework_id = cf.id
      JOIN workspaces w ON cf.workspace_id = w.id
      WHERE w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id)
    )
  );

-- 3. competency_templates table
CREATE TABLE IF NOT EXISTS public.competency_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  job_title TEXT NOT NULL,
  level TEXT,
  description TEXT,
  competencies JSONB NOT NULL,
  source TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_competency_templates_company ON public.competency_templates(company);
CREATE INDEX idx_competency_templates_job ON public.competency_templates(job_title);

ALTER TABLE public.competency_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public templates"
  ON public.competency_templates FOR SELECT TO authenticated
  USING (is_public = true);

-- 4. RPC get_job_roles_with_competencies
CREATE OR REPLACE FUNCTION public.get_job_roles_with_competencies(
  _framework_id UUID
)
RETURNS TABLE (
  role_id UUID,
  role_title TEXT,
  role_level TEXT,
  role_department TEXT,
  role_description TEXT,
  competency_count INTEGER,
  competencies JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jr.id AS role_id,
    jr.title AS role_title,
    jr.level AS role_level,
    jr.department AS role_department,
    jr.description AS role_description,
    COUNT(rc.id)::INTEGER AS competency_count,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'competency_id', c.id,
        'name', c.name,
        'description', c.description,
        'expected_level', rc.expected_level,
        'is_required', rc.is_required,
        'weight', rc.weight
      ) ORDER BY c."order", c.name
    ) FILTER (WHERE c.id IS NOT NULL), '[]'::jsonb) AS competencies
  FROM job_roles jr
  LEFT JOIN role_competencies rc ON jr.id = rc.job_role_id
  LEFT JOIN competencies c ON rc.competency_id = c.id
  WHERE jr.framework_id = _framework_id
  GROUP BY jr.id, jr.title, jr.level, jr.department, jr.description
  ORDER BY jr.title, jr.level;
END;
$$;

-- 5. Seed templates
INSERT INTO public.competency_templates (name, company, job_title, level, description, competencies, source) VALUES
(
  'Spotify Engineering Framework',
  'Spotify',
  'Software Engineer',
  'L3-L6',
  'Framework de engenharia do Spotify com competências core',
  '[
    {
      "name": "Technical Leadership",
      "description": "Demonstra liderança técnica e mentoria",
      "levels": {
        "Júnior": "Busca mentoria, executa tarefas com supervisão",
        "Pleno": "Mentoram juniors, lideram features pequenas",
        "Sênior": "Mentoram plenos/sêniors, definem arquitetura de sistemas",
        "Especialista": "Mentoram sêniors, definem padrões de toda a área"
      }
    },
    {
      "name": "Code Quality",
      "description": "Escreve código limpo, testável e manutenível",
      "levels": {
        "Júnior": "Segue padrões estabelecidos, recebe revisões frequentes",
        "Pleno": "Define padrões para time, revisões consistentes",
        "Sênior": "Define padrões org-level, evangeliza qualidade",
        "Especialista": "Define padrões company-wide, cria ferramentas"
      }
    }
  ]'::JSONB,
  'https://engineering.atspotify.com/career-framework'
),
(
  'Nubank Values Framework',
  'Nubank',
  'Individual Contributor',
  'IC1-IC4',
  'Valores comportamentais do Nubank aplicáveis a todas as áreas',
  '[
    {
      "name": "Obsessão pelo Cliente",
      "description": "Prioriza experiência do cliente em todas decisões",
      "levels": {
        "Júnior": "Entende pain points de clientes, escala dúvidas",
        "Pleno": "Propõe melhorias em features baseado em feedback",
        "Sênior": "Desenha soluções end-to-end priorizando experiência",
        "Especialista": "Define visão de produto considerando milhões de clientes"
      }
    },
    {
      "name": "Ownership",
      "description": "Age como dono, assume responsabilidade end-to-end",
      "levels": {
        "Júnior": "Ownership de tarefas individuais",
        "Pleno": "Ownership de features completas",
        "Sênior": "Ownership de produtos/sistemas",
        "Especialista": "Ownership de áreas inteiras"
      }
    }
  ]'::JSONB,
  'https://building.nubank.com.br'
);
