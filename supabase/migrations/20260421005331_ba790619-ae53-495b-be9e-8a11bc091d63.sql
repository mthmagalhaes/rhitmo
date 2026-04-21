-- ============================================================
-- S2.3 — User notification preferences
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_type),
  CHECK (channel IN ('off', 'in_app', 'email', 'slack')),
  CHECK (notification_type IN (
    'weekly_summary', 'pdi_milestone', 'self_reflection',
    'hr_alerts', 'member_request_1on1', 'ai_pattern'
  ))
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification prefs" ON public.user_notification_preferences;
CREATE POLICY "Users can view own notification prefs"
  ON public.user_notification_preferences FOR SELECT
  USING (user_id = effective_user_id());

DROP POLICY IF EXISTS "Users can insert own notification prefs" ON public.user_notification_preferences;
CREATE POLICY "Users can insert own notification prefs"
  ON public.user_notification_preferences FOR INSERT
  WITH CHECK (user_id = effective_user_id());

DROP POLICY IF EXISTS "Users can update own notification prefs" ON public.user_notification_preferences;
CREATE POLICY "Users can update own notification prefs"
  ON public.user_notification_preferences FOR UPDATE
  USING (user_id = effective_user_id())
  WITH CHECK (user_id = effective_user_id());

DROP POLICY IF EXISTS "Users can delete own notification prefs" ON public.user_notification_preferences;
CREATE POLICY "Users can delete own notification prefs"
  ON public.user_notification_preferences FOR DELETE
  USING (user_id = effective_user_id());

DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON public.user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- S2.7 — Skill radar RPC (5 axes from tag aggregation, last 90 days)
-- Mapping (tags → axes):
--   alignment   → from skills_data.ai_analysis.alignment_score (member_id)
--   execution   → '1:1' + 'Check-in' + 'Reunião Geral'
--   communication → 'Feedback Difícil' + 'Brainstorming'
--   learning    → 'Oportunidade de Melhoria' + 'PDI'
--   leadership  → 'Destaque Positivo' + 'Risco' (negative weight handled below)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_member_skill_radar(_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_alignment int := 0;
  v_execution int := 0;
  v_communication int := 0;
  v_learning int := 0;
  v_leadership int := 0;
  v_total int := 0;
  v_skills_data jsonb;
  v_evidence jsonb;
BEGIN
  -- Authorization: only people who can already view this member
  IF NOT (
    is_team_leader(effective_user_id(), _member_id)
    OR is_workspace_owner_of_member(_member_id)
    OR EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = _member_id AND tm.linked_user_id = effective_user_id()
    )
    OR EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.id = _member_id AND is_hr_admin_of_workspace(t.workspace_id)
    )
  ) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Pull alignment_score from skills_data
  SELECT skills_data INTO v_skills_data
  FROM team_members WHERE id = _member_id;

  v_alignment := COALESCE(((v_skills_data->'ai_analysis'->>'alignment_score')::int), 0);

  -- Aggregate tag counts from feedbacks in last 90 days
  WITH tag_counts AS (
    SELECT unnest(COALESCE(tags, ARRAY[]::text[])) AS tag, count(*) AS c
    FROM feedbacks
    WHERE member_id = _member_id
      AND occurred_at > NOW() - INTERVAL '90 days'
    GROUP BY tag
  )
  SELECT
    LEAST(100, COALESCE(SUM(c) FILTER (WHERE tag IN ('1:1', 'Check-in', 'Reunião Geral')), 0) * 12),
    LEAST(100, COALESCE(SUM(c) FILTER (WHERE tag IN ('Feedback Difícil', 'Brainstorming')), 0) * 18),
    LEAST(100, COALESCE(SUM(c) FILTER (WHERE tag IN ('Oportunidade de Melhoria', 'PDI')), 0) * 20),
    GREATEST(0, LEAST(100,
      COALESCE(SUM(c) FILTER (WHERE tag = 'Destaque Positivo'), 0) * 18
      - COALESCE(SUM(c) FILTER (WHERE tag = 'Risco'), 0) * 25
      + 30
    )),
    COALESCE(SUM(c), 0)
  INTO v_execution, v_communication, v_learning, v_leadership, v_total
  FROM tag_counts;

  -- Evidence: most recent 3 notes per axis
  SELECT jsonb_build_object(
    'execution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', f.id, 'title', f.title, 'occurred_at', f.occurred_at))
      FROM (
        SELECT id, title, occurred_at FROM feedbacks
        WHERE member_id = _member_id
          AND occurred_at > NOW() - INTERVAL '90 days'
          AND tags && ARRAY['1:1', 'Check-in', 'Reunião Geral']
        ORDER BY occurred_at DESC LIMIT 3
      ) f
    ), '[]'::jsonb),
    'communication', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', f.id, 'title', f.title, 'occurred_at', f.occurred_at))
      FROM (
        SELECT id, title, occurred_at FROM feedbacks
        WHERE member_id = _member_id
          AND occurred_at > NOW() - INTERVAL '90 days'
          AND tags && ARRAY['Feedback Difícil', 'Brainstorming']
        ORDER BY occurred_at DESC LIMIT 3
      ) f
    ), '[]'::jsonb),
    'learning', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', f.id, 'title', f.title, 'occurred_at', f.occurred_at))
      FROM (
        SELECT id, title, occurred_at FROM feedbacks
        WHERE member_id = _member_id
          AND occurred_at > NOW() - INTERVAL '90 days'
          AND tags && ARRAY['Oportunidade de Melhoria', 'PDI']
        ORDER BY occurred_at DESC LIMIT 3
      ) f
    ), '[]'::jsonb),
    'leadership', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', f.id, 'title', f.title, 'occurred_at', f.occurred_at))
      FROM (
        SELECT id, title, occurred_at FROM feedbacks
        WHERE member_id = _member_id
          AND occurred_at > NOW() - INTERVAL '90 days'
          AND tags && ARRAY['Destaque Positivo', 'Risco']
        ORDER BY occurred_at DESC LIMIT 3
      ) f
    ), '[]'::jsonb)
  ) INTO v_evidence;

  RETURN jsonb_build_object(
    'axes', jsonb_build_object(
      'alignment', v_alignment,
      'execution', v_execution,
      'communication', v_communication,
      'learning', v_learning,
      'leadership', v_leadership
    ),
    'total_notes_90d', v_total,
    'has_data', (v_total > 0 OR v_alignment > 0),
    'evidence', v_evidence
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_skill_radar(uuid) TO authenticated;

-- ============================================================
-- S2.5 — Leaders at risk RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_leaders_at_risk(_workspace_id uuid)
RETURNS TABLE(
  manager_id uuid,
  manager_name text,
  manager_email text,
  members_without_note_30d int,
  last_mentor_chat_at timestamptz,
  last_activity_at timestamptz,
  risk_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.is_admin() OR is_hr_admin_of_workspace(_workspace_id)) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  RETURN QUERY
  WITH leaders AS (
    SELECT DISTINCT t.leader_user_id AS leader_id
    FROM teams t
    WHERE t.workspace_id = _workspace_id AND t.leader_user_id IS NOT NULL
  ),
  leader_meta AS (
    SELECT
      l.leader_id,
      COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email) AS leader_name,
      u.email::text AS leader_email
    FROM leaders l
    JOIN auth.users u ON u.id = l.leader_id
  ),
  members_per_leader AS (
    SELECT
      t.leader_user_id AS leader_id,
      tm.id AS member_id
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.workspace_id = _workspace_id AND t.leader_user_id IS NOT NULL
  ),
  members_no_note AS (
    SELECT
      mpl.leader_id,
      COUNT(*)::int AS cnt
    FROM members_per_leader mpl
    WHERE NOT EXISTS (
      SELECT 1 FROM feedbacks f
      WHERE f.member_id = mpl.member_id
        AND f.occurred_at > NOW() - INTERVAL '30 days'
    )
    GROUP BY mpl.leader_id
  ),
  last_mentor AS (
    SELECT mm.user_id AS leader_id, MAX(mm.created_at) AS last_chat
    FROM mentor_messages mm
    WHERE mm.role = 'user'
    GROUP BY mm.user_id
  ),
  last_activity AS (
    SELECT f.manager_id AS leader_id, MAX(f.created_at) AS last_act
    FROM feedbacks f
    GROUP BY f.manager_id
  )
  SELECT
    lm.leader_id,
    lm.leader_name,
    lm.leader_email,
    COALESCE(mnn.cnt, 0) AS members_without_note_30d,
    lmc.last_chat,
    la.last_act,
    CASE
      WHEN COALESCE(mnn.cnt, 0) >= 3 AND (lmc.last_chat IS NULL OR lmc.last_chat < NOW() - INTERVAL '14 days')
        THEN 'no_notes_and_no_mentor'
      WHEN COALESCE(mnn.cnt, 0) >= 3 THEN 'no_notes_30d'
      WHEN lmc.last_chat IS NULL OR lmc.last_chat < NOW() - INTERVAL '14 days'
        THEN 'no_mentor_14d'
      ELSE 'ok'
    END AS risk_reason
  FROM leader_meta lm
  LEFT JOIN members_no_note mnn ON mnn.leader_id = lm.leader_id
  LEFT JOIN last_mentor lmc ON lmc.leader_id = lm.leader_id
  LEFT JOIN last_activity la ON la.leader_id = lm.leader_id
  WHERE COALESCE(mnn.cnt, 0) >= 3
     OR lmc.last_chat IS NULL
     OR lmc.last_chat < NOW() - INTERVAL '14 days'
  ORDER BY COALESCE(mnn.cnt, 0) DESC, lmc.last_chat ASC NULLS FIRST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaders_at_risk(uuid) TO authenticated;

-- ============================================================
-- S2.4 — Extend get_hr_dashboard_metrics with health_score + history
-- Health Score = 40% coverage + 30% PDI + 30% (100 - risk%)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_hr_dashboard_metrics(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  v_coverage int;
  v_pdi int;
  v_risk_pct int;
  v_health int;
  v_history jsonb;
BEGIN
  IF NOT (
    public.is_admin() OR
    is_hr_admin_of_workspace(_workspace_id)
  ) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Coverage % (notes in last 30d)
  SELECT CASE WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(
      (COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM feedbacks f
        WHERE f.member_id = tm.id AND f.occurred_at > NOW() - INTERVAL '30 days'
      )))::numeric / COUNT(*) * 100
    )
  END INTO v_coverage
  FROM teams t JOIN team_members tm ON tm.team_id = t.id
  WHERE t.workspace_id = _workspace_id;

  -- PDI %
  SELECT CASE WHEN COUNT(DISTINCT tm.id) = 0 THEN 0
    ELSE ROUND(COUNT(DISTINCT dp.member_id)::numeric / COUNT(DISTINCT tm.id) * 100)
  END INTO v_pdi
  FROM teams t
  JOIN team_members tm ON tm.team_id = t.id
  LEFT JOIN development_plans dp ON dp.member_id = tm.id
  WHERE t.workspace_id = _workspace_id;

  -- Risk % (members without note 30d AND tenure > 30d)
  SELECT CASE WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(
      (COUNT(*) FILTER (
        WHERE NOT EXISTS (
          SELECT 1 FROM feedbacks f
          WHERE f.member_id = tm.id AND f.occurred_at > NOW() - INTERVAL '30 days'
        ) AND tm.created_at < NOW() - INTERVAL '30 days'
      ))::numeric / COUNT(*) * 100
    )
  END INTO v_risk_pct
  FROM teams t JOIN team_members tm ON tm.team_id = t.id
  WHERE t.workspace_id = _workspace_id;

  v_health := ROUND(v_coverage * 0.4 + v_pdi * 0.3 + (100 - v_risk_pct) * 0.3);

  -- 4-week history (current + 3 weeks back, computed via coverage proxy)
  WITH weeks AS (
    SELECT generate_series(0, 3) AS wk
  ),
  weekly AS (
    SELECT w.wk,
      CASE WHEN COUNT(tm.id) = 0 THEN 0
        ELSE ROUND(
          (COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM feedbacks f
            WHERE f.member_id = tm.id
              AND f.occurred_at > NOW() - ((w.wk * 7 + 30)::text || ' days')::interval
              AND f.occurred_at < NOW() - (w.wk * 7 || ' days')::interval
          )))::numeric / NULLIF(COUNT(tm.id), 0) * 100
        )
      END AS coverage_pct
    FROM weeks w
    CROSS JOIN teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.workspace_id = _workspace_id
    GROUP BY w.wk
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'week_offset', wk,
      'health_score', GREATEST(0, LEAST(100, ROUND(coverage_pct * 0.4 + v_pdi * 0.3 + (100 - v_risk_pct) * 0.3)))
    ) ORDER BY wk DESC
  ) INTO v_history FROM weekly;

  SELECT jsonb_build_object(
    'total_leaders', (SELECT COUNT(DISTINCT t.leader_user_id) FROM teams t WHERE t.workspace_id = _workspace_id AND t.leader_user_id IS NOT NULL),
    'total_members', (SELECT COUNT(*) FROM teams t JOIN team_members tm ON tm.team_id = t.id WHERE t.workspace_id = _workspace_id),
    'members_without_recent_feedback', (
      SELECT COUNT(*) FROM teams t JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id
      AND NOT EXISTS (SELECT 1 FROM feedbacks f WHERE f.member_id = tm.id AND f.occurred_at > NOW() - INTERVAL '30 days')
    ),
    'members_without_recent_review', (
      SELECT COUNT(*) FROM teams t JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id AND tm.created_at < NOW() - INTERVAL '60 days'
      AND NOT EXISTS (SELECT 1 FROM performance_reviews pr WHERE pr.member_id = tm.id AND pr.created_at > NOW() - INTERVAL '90 days')
    ),
    'sync_completed_count', (
      SELECT COUNT(*) FROM teams t JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id AND tm.work_style_data IS NOT NULL
    ),
    'reviews_last_90_days', (
      SELECT COUNT(*) FROM teams t JOIN team_members tm ON tm.team_id = t.id
      JOIN performance_reviews pr ON pr.member_id = tm.id
      WHERE t.workspace_id = _workspace_id AND pr.created_at > NOW() - INTERVAL '90 days'
    ),
    'pdi_coverage_percentage', v_pdi,
    'members_at_risk', (
      SELECT COUNT(*) FROM teams t JOIN team_members tm ON tm.team_id = t.id
      WHERE t.workspace_id = _workspace_id
      AND NOT EXISTS (SELECT 1 FROM feedbacks f WHERE f.member_id = tm.id AND f.occurred_at > NOW() - INTERVAL '30 days')
      AND tm.created_at < NOW() - INTERVAL '30 days'
    ),
    'coverage_percentage', v_coverage,
    'bias_detected_last_7d', (
      SELECT COUNT(*) FROM bias_detections bd
      JOIN team_members tm ON tm.id = bd.member_id
      JOIN teams t ON t.id = tm.team_id
      WHERE t.workspace_id = _workspace_id AND bd.created_at > NOW() - INTERVAL '7 days'
    ),
    'health_score', v_health,
    'health_score_history', COALESCE(v_history, '[]'::jsonb),
    'notes_per_leader_last_30d', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'manager_id', note_counts.manager_id,
        'manager_name', note_counts.manager_name,
        'manager_email', note_counts.manager_email,
        'note_count', note_counts.note_count,
        'member_count', note_counts.member_count
      ) ORDER BY note_counts.note_count DESC), '[]'::jsonb)
      FROM (
        SELECT
          f.manager_id,
          COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email) AS manager_name,
          u.email::text AS manager_email,
          COUNT(*)::int AS note_count,
          COUNT(DISTINCT f.member_id)::int AS member_count
        FROM feedbacks f
        JOIN team_members tm ON tm.id = f.member_id
        JOIN teams t ON t.id = tm.team_id
        JOIN auth.users u ON u.id = f.manager_id
        WHERE t.workspace_id = _workspace_id
          AND f.created_at > NOW() - INTERVAL '30 days'
        GROUP BY f.manager_id, u.raw_user_meta_data, u.email
      ) note_counts
    ),
    'sentiment_distribution', '{}'::jsonb
  ) INTO result;

  RETURN result;
END;
$function$;
