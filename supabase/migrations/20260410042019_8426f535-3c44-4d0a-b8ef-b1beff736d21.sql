
-- ============================================================
-- Phase 1: Add leader_user_id to teams
-- ============================================================
ALTER TABLE public.teams ADD COLUMN leader_user_id UUID;

-- Migrate existing data: leader = workspace owner
UPDATE public.teams t
SET leader_user_id = w.owner_id
FROM public.workspaces w
WHERE t.workspace_id = w.id;

-- ============================================================
-- Phase 2: Helper functions (SECURITY DEFINER to avoid recursion)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_team_leader(_user_id uuid, _member_id uuid)
RETURNS boolean
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
      AND t.leader_user_id = _user_id
      AND w.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_leader_of_team(_user_id uuid, _team_id uuid)
RETURNS boolean
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
      AND t.leader_user_id = _user_id
      AND w.is_active = true
  )
$$;

-- ============================================================
-- Phase 3: Update TEAMS policies (leader + workspace owner)
-- ============================================================

DROP POLICY IF EXISTS "Owners podem ver times do workspace" ON public.teams;
CREATE POLICY "Owners and leaders can view teams"
ON public.teams FOR SELECT TO authenticated
USING (
  leader_user_id = effective_user_id()
  OR EXISTS (SELECT 1 FROM workspaces w WHERE w.id = teams.workspace_id AND w.owner_id = effective_user_id() AND w.is_active = true)
);

DROP POLICY IF EXISTS "Owners podem criar times" ON public.teams;
CREATE POLICY "Owners and leaders can create teams"
ON public.teams FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = teams.workspace_id AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id)) AND w.is_active = true)
);

DROP POLICY IF EXISTS "Owners podem atualizar times" ON public.teams;
CREATE POLICY "Owners and leaders can update teams"
ON public.teams FOR UPDATE TO authenticated
USING (
  leader_user_id = effective_user_id()
  OR EXISTS (SELECT 1 FROM workspaces w WHERE w.id = teams.workspace_id AND w.owner_id = effective_user_id() AND w.is_active = true)
);

DROP POLICY IF EXISTS "Owners podem deletar times" ON public.teams;
CREATE POLICY "Owners can delete teams"
ON public.teams FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = teams.workspace_id AND w.owner_id = effective_user_id() AND w.is_active = true)
);

-- ============================================================
-- Phase 4: Update TEAM_MEMBERS policies (leader + workspace owner)
-- ============================================================

DROP POLICY IF EXISTS "Owners podem ver membros do time" ON public.team_members;
CREATE POLICY "Leaders and owners can view team members"
ON public.team_members FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND (t.leader_user_id = effective_user_id() OR w.owner_id = effective_user_id())
    AND w.is_active = true
  )
);

DROP POLICY IF EXISTS "Owners podem criar membros no time" ON public.team_members;
CREATE POLICY "Leaders and owners can create team members"
ON public.team_members FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND (t.leader_user_id = effective_user_id() OR w.owner_id = effective_user_id())
    AND w.is_active = true
  )
);

DROP POLICY IF EXISTS "Owners podem atualizar membros do time" ON public.team_members;
CREATE POLICY "Leaders and owners can update team members"
ON public.team_members FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND (t.leader_user_id = effective_user_id() OR w.owner_id = effective_user_id())
    AND w.is_active = true
  )
);

DROP POLICY IF EXISTS "Owners podem deletar membros do time" ON public.team_members;
CREATE POLICY "Leaders and owners can delete team members"
ON public.team_members FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND (t.leader_user_id = effective_user_id() OR w.owner_id = effective_user_id())
    AND w.is_active = true
  )
);

-- ============================================================
-- Phase 5: Update FEEDBACKS policies (ONLY leader, not workspace owner)
-- ============================================================

DROP POLICY IF EXISTS "Managers can create feedbacks" ON public.feedbacks;
CREATE POLICY "Leaders can create feedbacks"
ON public.feedbacks FOR INSERT TO public
WITH CHECK (
  effective_user_id() = manager_id
  AND is_team_leader(effective_user_id(), member_id)
);

DROP POLICY IF EXISTS "Managers can delete own feedbacks" ON public.feedbacks;
CREATE POLICY "Leaders can delete own feedbacks"
ON public.feedbacks FOR DELETE TO public
USING (
  effective_user_id() = manager_id
  AND is_team_leader(effective_user_id(), member_id)
);

DROP POLICY IF EXISTS "Managers can update own feedbacks" ON public.feedbacks;
CREATE POLICY "Leaders can update own feedbacks"
ON public.feedbacks FOR UPDATE TO public
USING (
  effective_user_id() = manager_id
  AND is_team_leader(effective_user_id(), member_id)
);

DROP POLICY IF EXISTS "Managers can view own feedbacks" ON public.feedbacks;
CREATE POLICY "Leaders can view own feedbacks"
ON public.feedbacks FOR SELECT TO public
USING (
  effective_user_id() = manager_id
  AND is_team_leader(effective_user_id(), member_id)
);

-- ============================================================
-- Phase 6: Update GOALS policies (ONLY leader)
-- ============================================================

DROP POLICY IF EXISTS "Owners podem ver metas dos membros" ON public.goals;
CREATE POLICY "Leaders can view member goals"
ON public.goals FOR SELECT TO public
USING (is_team_leader(effective_user_id(), member_id));

DROP POLICY IF EXISTS "Owners podem criar metas" ON public.goals;
CREATE POLICY "Leaders can create goals"
ON public.goals FOR INSERT TO public
WITH CHECK (is_team_leader(effective_user_id(), member_id));

DROP POLICY IF EXISTS "Owners podem atualizar metas" ON public.goals;
CREATE POLICY "Leaders can update goals"
ON public.goals FOR UPDATE TO public
USING (is_team_leader(effective_user_id(), member_id));

DROP POLICY IF EXISTS "Owners podem deletar metas" ON public.goals;
CREATE POLICY "Leaders can delete goals"
ON public.goals FOR DELETE TO public
USING (is_team_leader(effective_user_id(), member_id));

-- ============================================================
-- Phase 7: Update MEETING_TRANSCRIPTS policies (ONLY leader)
-- ============================================================

DROP POLICY IF EXISTS "Managers can create meeting transcripts" ON public.meeting_transcripts;
CREATE POLICY "Leaders can create meeting transcripts"
ON public.meeting_transcripts FOR INSERT TO authenticated
WITH CHECK (
  manager_id = effective_user_id()
  AND is_team_leader(effective_user_id(), member_id)
);

DROP POLICY IF EXISTS "Managers can delete own meeting transcripts" ON public.meeting_transcripts;
CREATE POLICY "Leaders can delete own meeting transcripts"
ON public.meeting_transcripts FOR DELETE TO authenticated
USING (
  manager_id = effective_user_id()
  AND is_team_leader(effective_user_id(), member_id)
);

DROP POLICY IF EXISTS "Managers can update own meeting transcripts" ON public.meeting_transcripts;
CREATE POLICY "Leaders can update own meeting transcripts"
ON public.meeting_transcripts FOR UPDATE TO authenticated
USING (
  manager_id = effective_user_id()
  AND is_team_leader(effective_user_id(), member_id)
);

DROP POLICY IF EXISTS "Managers can view own meeting transcripts" ON public.meeting_transcripts;
CREATE POLICY "Leaders can view own meeting transcripts"
ON public.meeting_transcripts FOR SELECT TO authenticated
USING (
  manager_id = effective_user_id()
  AND is_team_leader(effective_user_id(), member_id)
);

-- ============================================================
-- Phase 8: Update PERFORMANCE_REVIEWS policies (ONLY leader)
-- ============================================================

DROP POLICY IF EXISTS "Owners podem ver avaliações dos membros" ON public.performance_reviews;
CREATE POLICY "Leaders can view member reviews"
ON public.performance_reviews FOR SELECT TO public
USING (is_team_leader(effective_user_id(), member_id));

DROP POLICY IF EXISTS "Owners podem criar avaliações" ON public.performance_reviews;
CREATE POLICY "Leaders can create reviews"
ON public.performance_reviews FOR INSERT TO public
WITH CHECK (is_team_leader(effective_user_id(), member_id));

DROP POLICY IF EXISTS "Owners podem atualizar avaliações" ON public.performance_reviews;
CREATE POLICY "Leaders can update reviews"
ON public.performance_reviews FOR UPDATE TO public
USING (is_team_leader(effective_user_id(), member_id));

DROP POLICY IF EXISTS "Owners podem deletar avaliações" ON public.performance_reviews;
CREATE POLICY "Leaders can delete reviews"
ON public.performance_reviews FOR DELETE TO public
USING (is_team_leader(effective_user_id(), member_id));

-- ============================================================
-- Phase 9: Update DEVELOPMENT policies (ONLY leader)
-- ============================================================

DROP POLICY IF EXISTS "Leader can update member items" ON public.development_items;
CREATE POLICY "Leaders can update member items"
ON public.development_items FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM development_plans dp
    WHERE dp.id = development_items.plan_id
    AND is_team_leader(effective_user_id(), dp.member_id)
  )
);

DROP POLICY IF EXISTS "Leader can view member items" ON public.development_items;
CREATE POLICY "Leaders can view member items"
ON public.development_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM development_plans dp
    WHERE dp.id = development_items.plan_id
    AND is_team_leader(effective_user_id(), dp.member_id)
  )
);

DROP POLICY IF EXISTS "Leader can update member plans" ON public.development_plans;
CREATE POLICY "Leaders can update member plans"
ON public.development_plans FOR UPDATE TO authenticated
USING (is_team_leader(effective_user_id(), member_id));

DROP POLICY IF EXISTS "Leader can view member plans" ON public.development_plans;
CREATE POLICY "Leaders can view member plans"
ON public.development_plans FOR SELECT TO authenticated
USING (is_team_leader(effective_user_id(), member_id));

-- ============================================================
-- Phase 10: Update REVIEW_COMMENTS policies
-- ============================================================

DROP POLICY IF EXISTS "review_comments_manager_access" ON public.review_comments;
CREATE POLICY "review_comments_leader_access"
ON public.review_comments FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM performance_reviews pr
    WHERE pr.id = review_comments.review_id
    AND is_team_leader(effective_user_id(), pr.member_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM performance_reviews pr
    WHERE pr.id = review_comments.review_id
    AND is_team_leader(effective_user_id(), pr.member_id)
  )
  AND user_id = effective_user_id()
);

-- ============================================================
-- Phase 11: Add workspace visibility for leaders
-- ============================================================

CREATE POLICY "Leaders can view workspace"
ON public.workspaces FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    WHERE t.workspace_id = workspaces.id
    AND t.leader_user_id = effective_user_id()
  )
);

-- ============================================================
-- Phase 12: Update kudos visibility for leaders
-- ============================================================

DROP POLICY IF EXISTS "Users can view kudos in own workspace" ON public.kudos;
CREATE POLICY "Users can view kudos in own workspace"
ON public.kudos FOR SELECT TO public
USING (
  workspace_id IN (
    SELECT w.id FROM workspaces w WHERE w.owner_id = auth.uid()
    UNION
    SELECT w.id FROM workspaces w WHERE auth.uid() = ANY(COALESCE(w.hr_admin_ids, '{}'))
    UNION
    SELECT t.workspace_id FROM teams t WHERE t.leader_user_id = auth.uid()
  )
);

-- ============================================================
-- Phase 13: Update pending_slack_invites for leaders
-- ============================================================

DROP POLICY IF EXISTS "Workspace owners can view invites" ON public.pending_slack_invites;
CREATE POLICY "Leaders can view invites"
ON public.pending_slack_invites FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.id = pending_slack_invites.member_id
    AND t.leader_user_id = auth.uid()
  )
);

-- ============================================================
-- Phase 14: Update helper functions
-- ============================================================

-- is_workspace_owner: now checks team leader OR workspace owner
CREATE OR REPLACE FUNCTION public.is_workspace_owner(_user_id uuid, _member_id uuid)
RETURNS boolean
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
      AND (t.leader_user_id = _user_id OR w.owner_id = _user_id)
  )
$$;

-- user_owns_team: now checks team leader OR workspace owner
CREATE OR REPLACE FUNCTION public.user_owns_team(_user_id uuid, _team_id uuid)
RETURNS boolean
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
      AND (t.leader_user_id = _user_id OR w.owner_id = _user_id)
  )
$$;

-- ============================================================
-- Phase 15: Update notify_leader_sync_change trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_leader_sync_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_leader_id UUID;
  v_changes JSONB := '{}';
  v_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NEW.linked_user_id IS NULL OR NEW.linked_user_id != auth.uid() THEN
    RETURN NEW;
  END IF;

  SELECT t.leader_user_id INTO v_leader_id
  FROM teams t
  WHERE t.id = NEW.team_id;

  IF v_leader_id IS NULL THEN RETURN NEW; END IF;

  IF OLD.chronotype IS DISTINCT FROM NEW.chronotype THEN
    v_changes := v_changes || jsonb_build_object('chronotype',
      jsonb_build_object('before', to_jsonb(OLD.chronotype), 'after', to_jsonb(NEW.chronotype)));
    v_fields := array_append(v_fields, 'Cronotipo');
  END IF;
  IF OLD.feedback_style IS DISTINCT FROM NEW.feedback_style THEN
    v_changes := v_changes || jsonb_build_object('feedback_style',
      jsonb_build_object('before', to_jsonb(OLD.feedback_style), 'after', to_jsonb(NEW.feedback_style)));
    v_fields := array_append(v_fields, 'Estilo de feedback');
  END IF;
  IF OLD.recognition_style IS DISTINCT FROM NEW.recognition_style THEN
    v_changes := v_changes || jsonb_build_object('recognition_style',
      jsonb_build_object('before', to_jsonb(OLD.recognition_style), 'after', to_jsonb(NEW.recognition_style)));
    v_fields := array_append(v_fields, 'Estilo de reconhecimento');
  END IF;
  IF OLD.work_style_data IS DISTINCT FROM NEW.work_style_data THEN
    v_changes := v_changes || jsonb_build_object('work_style_data',
      jsonb_build_object('before', COALESCE(OLD.work_style_data, '{}'::jsonb), 'after', COALESCE(NEW.work_style_data, '{}'::jsonb)));
    v_fields := array_append(v_fields, 'Estilo de trabalho');
  END IF;
  IF OLD.motivators IS DISTINCT FROM NEW.motivators THEN
    v_changes := v_changes || jsonb_build_object('motivators',
      jsonb_build_object('before', COALESCE(OLD.motivators, '[]'::jsonb), 'after', COALESCE(NEW.motivators, '[]'::jsonb)));
    v_fields := array_append(v_fields, 'Motivadores');
  END IF;
  IF OLD.user_manual IS DISTINCT FROM NEW.user_manual THEN
    v_changes := v_changes || jsonb_build_object('user_manual',
      jsonb_build_object('before', COALESCE(OLD.user_manual, '{}'::jsonb), 'after', COALESCE(NEW.user_manual, '{}'::jsonb)));
    v_fields := array_append(v_fields, 'Manual de instruções');
  END IF;

  IF array_length(v_fields, 1) > 0 THEN
    INSERT INTO rhitmo_sync_notifications (member_id, leader_user_id, changes, change_summary)
    VALUES (NEW.id, v_leader_id, v_changes, array_to_string(v_fields, ', '));
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- Phase 16: Update HR functions to use leader_user_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_hr_leaders_overview(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF NOT (public.is_admin() OR is_hr_admin_of_workspace(_workspace_id)) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT COALESCE(jsonb_agg(leader_row), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'leader_id', t.leader_user_id,
      'leader_name', COALESCE(au.raw_user_meta_data->>'full_name', au.email),
      'leader_email', au.email,
      'total_members', COUNT(DISTINCT tm.id),
      'feedbacks_last_30d', COUNT(DISTINCT f30.id),
      'last_feedback_at', MAX(fall.occurred_at),
      'days_since_last_feedback',
        CASE
          WHEN MAX(fall.occurred_at) IS NULL THEN 999
          ELSE EXTRACT(DAY FROM NOW() - MAX(fall.occurred_at))::INT
        END
    ) AS leader_row
    FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    JOIN auth.users au ON au.id = t.leader_user_id
    LEFT JOIN team_members tm ON tm.team_id = t.id
    LEFT JOIN feedbacks f30 ON f30.manager_id = t.leader_user_id
      AND f30.member_id = tm.id
      AND f30.occurred_at > NOW() - INTERVAL '30 days'
    LEFT JOIN feedbacks fall ON fall.manager_id = t.leader_user_id
      AND fall.member_id = tm.id
    WHERE w.id = _workspace_id
      AND w.is_active = true
      AND t.leader_user_id IS NOT NULL
    GROUP BY t.leader_user_id, au.email, au.raw_user_meta_data
  ) sub;

  RETURN jsonb_build_object('leaders', result);
END $function$;

CREATE OR REPLACE FUNCTION public.get_hr_all_members(
  _workspace_id uuid,
  _search text DEFAULT NULL,
  _leader_id uuid DEFAULT NULL,
  _has_pdi boolean DEFAULT NULL,
  _limit integer DEFAULT 20,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  member_id uuid, member_name text, member_email text, member_role text,
  leader_id uuid, leader_name text, last_feedback_date timestamp with time zone,
  days_since_last_feedback integer, pdi_count integer, has_sync boolean,
  has_skills_map boolean, total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total BIGINT;
BEGIN
  IF NOT (public.is_admin() OR public.is_hr_admin_of_workspace(_workspace_id)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT COUNT(*)
  INTO v_total
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  WHERE w.id = _workspace_id
    AND w.is_active = true
    AND (_search IS NULL OR tm.name ILIKE '%' || _search || '%' OR tm.email ILIKE '%' || _search || '%')
    AND (_leader_id IS NULL OR t.leader_user_id = _leader_id)
    AND (_has_pdi IS NULL OR
         (_has_pdi = true AND EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)) OR
         (_has_pdi = false AND NOT EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)));

  RETURN QUERY
  SELECT
    tm.id AS member_id,
    tm.name AS member_name,
    tm.email AS member_email,
    tm.role AS member_role,
    t.leader_user_id AS leader_id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email)::TEXT AS leader_name,
    (SELECT MAX(f.occurred_at) FROM feedbacks f WHERE f.member_id = tm.id) AS last_feedback_date,
    COALESCE(
      EXTRACT(DAY FROM NOW() - (SELECT MAX(f.occurred_at) FROM feedbacks f WHERE f.member_id = tm.id))::INTEGER,
      999
    ) AS days_since_last_feedback,
    (SELECT COUNT(*)::INTEGER FROM development_plans dp WHERE dp.member_id = tm.id) AS pdi_count,
    (tm.work_style_data IS NOT NULL) AS has_sync,
    (tm.skills_data IS NOT NULL AND tm.skills_data != '{}'::jsonb) AS has_skills_map,
    v_total AS total_count
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  LEFT JOIN auth.users au ON au.id = t.leader_user_id
  WHERE w.id = _workspace_id
    AND w.is_active = true
    AND (_search IS NULL OR tm.name ILIKE '%' || _search || '%' OR tm.email ILIKE '%' || _search || '%')
    AND (_leader_id IS NULL OR t.leader_user_id = _leader_id)
    AND (_has_pdi IS NULL OR
         (_has_pdi = true AND EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)) OR
         (_has_pdi = false AND NOT EXISTS (SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id)))
  ORDER BY
    COALESCE(EXTRACT(DAY FROM NOW() - (SELECT MAX(f.occurred_at) FROM feedbacks f WHERE f.member_id = tm.id))::INTEGER, 999) ASC,
    tm.name ASC
  LIMIT _limit
  OFFSET _offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_hr_member_profile(_workspace_id uuid, _member_id uuid)
RETURNS TABLE(
  member_id uuid, member_name text, member_email text, member_role text,
  leader_id uuid, leader_name text, motivators jsonb, user_manual jsonb,
  chronotype text, feedback_style text, recognition_style text,
  skills_data jsonb, work_style_data jsonb, created_at timestamp with time zone,
  feedback_count integer, last_feedback_date timestamp with time zone,
  pdi_count integer, has_pdi boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_admin() OR public.is_hr_admin_of_workspace(_workspace_id)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    tm.id AS member_id,
    tm.name AS member_name,
    tm.email AS member_email,
    tm.role AS member_role,
    t.leader_user_id AS leader_id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email)::TEXT AS leader_name,
    tm.motivators,
    tm.user_manual,
    tm.chronotype,
    tm.feedback_style,
    tm.recognition_style,
    tm.skills_data,
    tm.work_style_data,
    tm.created_at,
    (SELECT COUNT(*)::INTEGER FROM feedbacks f WHERE f.member_id = tm.id) AS feedback_count,
    (SELECT MAX(f.occurred_at) FROM feedbacks f WHERE f.member_id = tm.id) AS last_feedback_date,
    (
      SELECT COUNT(*)::INTEGER
      FROM development_items di
      JOIN development_plans dp ON dp.id = di.plan_id
      WHERE dp.member_id = tm.id
    ) AS pdi_count,
    EXISTS (
      SELECT 1
      FROM development_items di
      JOIN development_plans dp ON dp.id = di.plan_id
      WHERE dp.member_id = tm.id
    ) AS has_pdi
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN workspaces w ON w.id = t.workspace_id
  LEFT JOIN auth.users au ON au.id = t.leader_user_id
  WHERE w.id = _workspace_id
    AND tm.id = _member_id
    AND w.is_active = true
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_hr_leader_team(_workspace_id uuid, _leader_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF NOT (public.is_admin() OR is_hr_admin_of_workspace(_workspace_id)) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT COALESCE(jsonb_agg(member_row), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', tm.id,
      'name', tm.name,
      'email', tm.email,
      'role', tm.role,
      'last_feedback_at', MAX(f.occurred_at),
      'days_since_last_feedback',
        CASE
          WHEN MAX(f.occurred_at) IS NULL THEN 999
          ELSE EXTRACT(DAY FROM NOW() - MAX(f.occurred_at))::INT
        END,
      'pdi_count', COUNT(DISTINCT dp.id),
      'has_sync', (tm.work_style_data IS NOT NULL)
    ) AS member_row
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    JOIN workspaces w ON w.id = t.workspace_id
    LEFT JOIN feedbacks f ON f.member_id = tm.id
    LEFT JOIN development_plans dp ON dp.member_id = tm.id
    WHERE t.workspace_id = _workspace_id
      AND t.leader_user_id = _leader_id
      AND w.is_active = true
    GROUP BY tm.id, tm.name, tm.email, tm.role, tm.work_style_data
    ORDER BY tm.name
  ) sub;

  RETURN jsonb_build_object('members', result);
END $function$;

CREATE OR REPLACE FUNCTION public.get_hr_dashboard_metrics(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      SELECT COUNT(DISTINCT t.leader_user_id)
      FROM teams t
      WHERE t.workspace_id = _workspace_id
      AND t.leader_user_id IS NOT NULL
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
    'pdi_coverage_percentage', (
      SELECT CASE WHEN COUNT(DISTINCT tm.id) = 0 THEN 0
        ELSE ROUND(COUNT(DISTINCT dp.member_id)::numeric / COUNT(DISTINCT tm.id) * 100)
      END
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      LEFT JOIN development_plans dp ON dp.member_id = tm.id
      WHERE t.workspace_id = _workspace_id
    ),
    'bias_detected_last_7d', (
      SELECT COUNT(*)
      FROM bias_detections bd
      JOIN team_members tm ON tm.id = bd.member_id
      JOIN teams t ON t.id = tm.team_id
      WHERE t.workspace_id = _workspace_id
      AND bd.created_at > NOW() - INTERVAL '7 days'
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
        'muito_positivo', COUNT(*) FILTER (WHERE f.sentiment = 'muito_positivo'),
        'positivo', COUNT(*) FILTER (WHERE f.sentiment = 'positivo'),
        'neutro', COUNT(*) FILTER (WHERE f.sentiment = 'neutro'),
        'construtivo', COUNT(*) FILTER (WHERE f.sentiment = 'construtivo'),
        'critico', COUNT(*) FILTER (WHERE f.sentiment = 'critico')
      )
      FROM feedbacks f
      JOIN team_members tm ON tm.id = f.member_id
      JOIN teams t ON t.id = tm.team_id
      WHERE t.workspace_id = _workspace_id
      AND f.occurred_at > NOW() - INTERVAL '30 days'
    )
  ) INTO result;

  RETURN result;
END $function$;

CREATE OR REPLACE FUNCTION public.get_hr_analytics_advanced(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF NOT (public.is_admin() OR public.is_hr_admin_of_workspace(_workspace_id)) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT jsonb_build_object(
    'weekly_trend', (
      SELECT COALESCE(jsonb_agg(week_row ORDER BY week_start), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'week_start', gs.week_start::date,
          'week_label', to_char(gs.week_start, 'DD/MM'),
          'count', COALESCE(fc.cnt, 0)
        ) AS week_row, gs.week_start
        FROM generate_series(
          date_trunc('week', NOW() - INTERVAL '11 weeks'),
          date_trunc('week', NOW()),
          '1 week'::interval
        ) AS gs(week_start)
        LEFT JOIN (
          SELECT date_trunc('week', f.occurred_at) AS w, COUNT(*) AS cnt
          FROM feedbacks f
          JOIN team_members tm ON tm.id = f.member_id
          JOIN teams t ON t.id = tm.team_id
          WHERE t.workspace_id = _workspace_id
            AND f.occurred_at > NOW() - INTERVAL '12 weeks'
          GROUP BY 1
        ) fc ON fc.w = gs.week_start
      ) sub
    ),
    'tag_distribution', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('tag', tag, 'count', tag_count)), '[]'::jsonb)
      FROM (
        SELECT unnest(f.tags) AS tag, COUNT(*) AS tag_count
        FROM feedbacks f
        JOIN team_members tm ON tm.id = f.member_id
        JOIN teams t ON t.id = tm.team_id
        WHERE t.workspace_id = _workspace_id
          AND f.occurred_at > NOW() - INTERVAL '30 days'
          AND f.tags IS NOT NULL
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10
      ) sub
    ),
    'at_risk_members', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'member_id', tm.id,
        'member_name', tm.name,
        'member_role', tm.role,
        'leader_id', t.leader_user_id,
        'leader_name', COALESCE(au.raw_user_meta_data->>'full_name', au.email),
        'days_since_feedback', COALESCE(
          EXTRACT(DAY FROM NOW() - (SELECT MAX(f2.occurred_at) FROM feedbacks f2 WHERE f2.member_id = tm.id))::INT,
          999
        ),
        'has_pdi', EXISTS(SELECT 1 FROM development_plans dp WHERE dp.member_id = tm.id AND dp.status != 'completed')
      ) ORDER BY COALESCE(
          EXTRACT(DAY FROM NOW() - (SELECT MAX(f3.occurred_at) FROM feedbacks f3 WHERE f3.member_id = tm.id))::INT,
          999
        ) DESC), '[]'::jsonb)
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      JOIN workspaces w ON w.id = t.workspace_id
      LEFT JOIN auth.users au ON au.id = t.leader_user_id
      WHERE t.workspace_id = _workspace_id
        AND w.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM feedbacks f WHERE f.member_id = tm.id AND f.occurred_at > NOW() - INTERVAL '30 days'
        )
    ),
    'engagement_heatmap', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'leader_id', sub.leader_id,
        'leader_name', sub.leader_name,
        'weeks', sub.weeks
      )), '[]'::jsonb)
      FROM (
        SELECT
          t.leader_user_id AS leader_id,
          COALESCE(au.raw_user_meta_data->>'full_name', au.email) AS leader_name,
          (
            SELECT jsonb_agg(jsonb_build_object(
              'week_start', gs.week_start::date,
              'week_label', to_char(gs.week_start, 'DD/MM'),
              'count', COALESCE((
                SELECT COUNT(*)
                FROM feedbacks f
                JOIN team_members tm2 ON tm2.id = f.member_id
                WHERE tm2.team_id = t.id
                  AND f.manager_id = t.leader_user_id
                  AND f.occurred_at >= gs.week_start
                  AND f.occurred_at < gs.week_start + INTERVAL '1 week'
              ), 0)
            ) ORDER BY gs.week_start)
            FROM generate_series(
              date_trunc('week', NOW() - INTERVAL '7 weeks'),
              date_trunc('week', NOW()),
              '1 week'::interval
            ) AS gs(week_start)
          ) AS weeks
        FROM teams t
        JOIN workspaces w ON w.id = t.workspace_id
        JOIN auth.users au ON au.id = t.leader_user_id
        WHERE w.id = _workspace_id
          AND w.is_active = true
          AND t.leader_user_id IS NOT NULL
        GROUP BY t.leader_user_id, t.id, au.raw_user_meta_data, au.email
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$function$;

-- Update get_review_evidence to use is_team_leader
CREATE OR REPLACE FUNCTION public.get_review_evidence(_member_id uuid, _period_start date, _period_end date)
RETURNS TABLE(feedbacks_count integer, meetings_count integer, total_evidence_count integer, feedbacks jsonb, meetings jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_feedbacks JSONB;
  v_meetings JSONB;
  v_count_feedbacks INTEGER;
  v_count_meetings INTEGER;
  v_workspace_id UUID;
BEGIN
  SELECT t.workspace_id INTO v_workspace_id
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE tm.id = _member_id;

  IF NOT (
    public.is_team_leader(effective_user_id(), _member_id)
    OR public.is_admin()
    OR (v_workspace_id IS NOT NULL AND public.is_hr_admin_of_workspace(v_workspace_id))
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT
    COUNT(*)::INTEGER,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', f.id, 'date', f.occurred_at, 'content_preview', LEFT(f.content, 150),
        'sentiment', f.sentiment, 'tags', f.tags, 'type', f.type
      ) ORDER BY f.occurred_at DESC
    ), '[]'::JSONB)
  INTO v_count_feedbacks, v_feedbacks
  FROM feedbacks f
  WHERE f.member_id = _member_id
    AND f.occurred_at::DATE BETWEEN _period_start AND _period_end;

  SELECT
    COUNT(*)::INTEGER,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', mt.id, 'date', mt.created_at, 'leader_notes_preview', LEFT(mt.leader_notes, 150),
        'duration_seconds', mt.duration_seconds, 'themes', mt.extracted_themes
      ) ORDER BY mt.created_at DESC
    ), '[]'::JSONB)
  INTO v_count_meetings, v_meetings
  FROM meeting_transcripts mt
  WHERE mt.member_id = _member_id
    AND mt.created_at::DATE BETWEEN _period_start AND _period_end
    AND mt.processing_status = 'completed';

  RETURN QUERY
  SELECT COALESCE(v_count_feedbacks, 0), COALESCE(v_count_meetings, 0),
    COALESCE(v_count_feedbacks, 0) + COALESCE(v_count_meetings, 0), v_feedbacks, v_meetings;
END;
$function$;
