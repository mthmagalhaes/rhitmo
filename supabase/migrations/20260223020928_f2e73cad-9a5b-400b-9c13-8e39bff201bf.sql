
-- 1. Coluna hr_admin_ids em workspaces
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS hr_admin_ids UUID[] DEFAULT '{}';

-- 2. Função helper para verificar se usuário é HR Admin de um workspace
CREATE OR REPLACE FUNCTION public.is_hr_admin_of_workspace(
  _workspace_id UUID
)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT auth.uid() = ANY(
    SELECT unnest(COALESCE(hr_admin_ids, '{}')) 
    FROM workspaces WHERE id = _workspace_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_hr_admin_of_workspace TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_hr_admin_of_workspace FROM anon;

-- 3. Policies RLS novas (sem alterar existentes)
CREATE POLICY "HR Admin pode ver workspace"
ON public.workspaces FOR SELECT TO authenticated
USING (is_hr_admin_of_workspace(id) = true);

CREATE POLICY "HR Admin pode ver times"
ON public.teams FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id 
    AND is_hr_admin_of_workspace(w.id)
  )
);

CREATE POLICY "HR Admin pode ver membros"
ON public.team_members FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_id 
    AND is_hr_admin_of_workspace(w.id)
  )
);

-- 4. RPC para super_admin gerenciar HR Admins
CREATE OR REPLACE FUNCTION public.manage_hr_admin(
  _workspace_id UUID,
  _user_id UUID,
  _action TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores Rhitmo podem gerenciar HR Admins';
  END IF;
  
  IF _action = 'add' THEN
    UPDATE workspaces 
    SET hr_admin_ids = array_append(
      COALESCE(hr_admin_ids, '{}'), _user_id
    )
    WHERE id = _workspace_id
    AND NOT (_user_id = ANY(COALESCE(hr_admin_ids, '{}')));
  ELSIF _action = 'remove' THEN
    UPDATE workspaces 
    SET hr_admin_ids = array_remove(
      COALESCE(hr_admin_ids, '{}'), _user_id
    )
    WHERE id = _workspace_id;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.manage_hr_admin TO authenticated;
REVOKE EXECUTE ON FUNCTION public.manage_hr_admin FROM anon;

-- 5. RPC de métricas agregadas para o Painel de Liderança
CREATE OR REPLACE FUNCTION public.get_hr_dashboard_metrics(
  _workspace_id UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT (
    public.is_admin() OR 
    is_hr_admin_of_workspace(_workspace_id)
  ) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT jsonb_build_object(
    'total_leaders', (
      SELECT COUNT(DISTINCT f.manager_id)
      FROM feedbacks f
      JOIN team_members tm ON tm.id = f.member_id
      JOIN teams t ON t.id = tm.team_id
      WHERE t.workspace_id = _workspace_id
    ),
    'total_members', (
      SELECT COUNT(*) FROM teams t 
      JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id
    ),
    'members_without_recent_feedback', (
      SELECT COUNT(*) FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id
      AND NOT EXISTS (
        SELECT 1 FROM feedbacks f
        WHERE f.member_id = tm.id
        AND f.occurred_at > NOW() - INTERVAL '30 days'
      )
    ),
    'members_without_recent_review', (
      SELECT COUNT(*) FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id
      AND tm.created_at < NOW() - INTERVAL '60 days'
      AND NOT EXISTS (
        SELECT 1 FROM performance_reviews pr
        WHERE pr.member_id = tm.id
        AND pr.created_at > NOW() - INTERVAL '90 days'
      )
    ),
    'sync_completed_count', (
      SELECT COUNT(*) FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id
      AND tm.work_style_data IS NOT NULL
    ),
    'reviews_last_90_days', (
      SELECT COUNT(*) FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      JOIN performance_reviews pr ON pr.member_id = tm.id
      WHERE t.workspace_id = _workspace_id
      AND pr.created_at > NOW() - INTERVAL '90 days'
    ),
    'notes_per_leader_last_30d', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'manager_id', note_counts.manager_id,
        'note_count', note_counts.cnt,
        'member_count', note_counts.member_cnt
      )), '[]'::jsonb)
      FROM (
        SELECT f.manager_id,
          COUNT(*) as cnt,
          COUNT(DISTINCT f.member_id) as member_cnt
        FROM feedbacks f
        JOIN team_members tm ON tm.id = f.member_id
        JOIN teams t ON t.id = tm.team_id
        WHERE t.workspace_id = _workspace_id
        AND f.occurred_at > NOW() - INTERVAL '30 days'
        GROUP BY f.manager_id
      ) note_counts
    ),
    'sentiment_distribution', (
      SELECT jsonb_build_object(
        'muito_positivo', COUNT(*) FILTER (
          WHERE f.sentiment = 'muito_positivo'),
        'positivo', COUNT(*) FILTER (
          WHERE f.sentiment = 'positivo'),
        'neutro', COUNT(*) FILTER (
          WHERE f.sentiment = 'neutro'),
        'construtivo', COUNT(*) FILTER (
          WHERE f.sentiment = 'construtivo'),
        'critico', COUNT(*) FILTER (
          WHERE f.sentiment = 'critico')
      )
      FROM feedbacks f
      JOIN team_members tm ON tm.id = f.member_id
      JOIN teams t ON t.id = tm.team_id
      WHERE t.workspace_id = _workspace_id
      AND f.occurred_at > NOW() - INTERVAL '30 days'
    )
  ) INTO result;

  RETURN result;
END $$;

GRANT EXECUTE ON FUNCTION public.get_hr_dashboard_metrics TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_hr_dashboard_metrics FROM anon;
