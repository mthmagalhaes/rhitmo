-- ============================================================
-- Rhitmo 2.0 — Bloco Calibrações
-- ============================================================

CREATE TABLE public.calibration_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  leader_user_id uuid NOT NULL,
  cycle_label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.calibration_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.calibration_sessions(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  classification text,
  promotion_recommendation text,
  loss_risk text,
  merit_recommendation text,
  note text,
  ai_suggested_classification text,
  confirmed_at timestamptz,
  confirmed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, member_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calibration_sessions TO authenticated;
GRANT ALL ON public.calibration_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calibration_decisions TO authenticated;
GRANT ALL ON public.calibration_decisions TO service_role;

ALTER TABLE public.calibration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_decisions ENABLE ROW LEVEL SECURITY;

-- helper: quem pode operar uma sessão de calibração
CREATE OR REPLACE FUNCTION public.can_access_calibration_session(_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.calibration_sessions cs
    JOIN public.workspaces w ON w.id = cs.workspace_id
    WHERE cs.id = _session_id
      AND (
        cs.leader_user_id = public.effective_user_id()
        OR w.owner_id = public.effective_user_id()
        OR public.effective_user_id() = ANY(COALESCE(w.hr_admin_ids, '{}'))
      )
  );
END;
$$;

CREATE POLICY "calibration_sessions_owner_all"
ON public.calibration_sessions
FOR ALL
TO authenticated
USING (
  leader_user_id = public.effective_user_id()
  OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = calibration_sessions.workspace_id
      AND (w.owner_id = public.effective_user_id()
           OR public.effective_user_id() = ANY(COALESCE(w.hr_admin_ids, '{}')))
  )
)
WITH CHECK (
  leader_user_id = public.effective_user_id()
  OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = calibration_sessions.workspace_id
      AND (w.owner_id = public.effective_user_id()
           OR public.effective_user_id() = ANY(COALESCE(w.hr_admin_ids, '{}')))
  )
);

CREATE POLICY "calibration_decisions_owner_all"
ON public.calibration_decisions
FOR ALL
TO authenticated
USING (public.can_access_calibration_session(session_id))
WITH CHECK (public.can_access_calibration_session(session_id));

CREATE TRIGGER trg_calibration_sessions_updated_at
BEFORE UPDATE ON public.calibration_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_calibration_decisions_updated_at
BEFORE UPDATE ON public.calibration_decisions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_calibration_sessions_leader ON public.calibration_sessions(leader_user_id, period_start DESC);
CREATE INDEX idx_calibration_decisions_session ON public.calibration_decisions(session_id);

-- ============================================================
-- RPC: grade de calibração do time
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_calibration_grid(
  _period_start date,
  _period_end date,
  _session_id uuid DEFAULT NULL
)
RETURNS TABLE (
  member_id uuid,
  member_name text,
  member_role text,
  team_id uuid,
  team_name text,
  ai_classification text,
  ai_turnover_risk text,
  ai_next_action_key text,
  evolution_vs_previous text,
  quarterly_confirmed_count integer,
  monthly_confirmed_count integer,
  feedbacks_count integer,
  meetings_count integer,
  last_review_classification text,
  last_review_promotion text,
  last_review_merit text,
  last_review_loss_risk text,
  decision_classification text,
  decision_promotion text,
  decision_loss_risk text,
  decision_merit text,
  decision_note text,
  decision_confirmed_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := public.effective_user_id();
BEGIN
  RETURN QUERY
  SELECT
    tm.id,
    tm.name,
    tm.role,
    t.id,
    t.name,
    q.classification,
    q.turnover_risk,
    q.next_action_key,
    q.evolution_vs_previous,
    COALESCE(qc.cnt, 0)::integer,
    COALESCE(mc.cnt, 0)::integer,
    COALESCE(fb.cnt, 0)::integer,
    COALESCE(mt.cnt, 0)::integer,
    pr.classification,
    pr.promotion_recommendation,
    pr.merit_recommendation,
    pr.loss_risk,
    cd.classification,
    cd.promotion_recommendation,
    cd.loss_risk,
    cd.merit_recommendation,
    cd.note,
    cd.confirmed_at
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  JOIN public.workspaces w ON w.id = t.workspace_id
  LEFT JOIN LATERAL (
    SELECT qr.classification, qr.ai_suggested_classification, qr.turnover_risk,
           qr.next_action_key, qr.evolution_vs_previous
    FROM public.quarterly_recaps qr
    WHERE qr.member_id = tm.id
      AND qr.period_quarter BETWEEN _period_start AND _period_end
    ORDER BY qr.period_quarter DESC
    LIMIT 1
  ) q ON true
  LEFT JOIN LATERAL (
    SELECT count(*) cnt FROM public.quarterly_recaps qr2
    WHERE qr2.member_id = tm.id AND qr2.status = 'confirmed'
      AND qr2.period_quarter BETWEEN _period_start AND _period_end
  ) qc ON true
  LEFT JOIN LATERAL (
    SELECT count(*) cnt FROM public.monthly_recaps mr
    WHERE mr.member_id = tm.id AND mr.status = 'confirmed'
      AND mr.period_month BETWEEN _period_start AND _period_end
  ) mc ON true
  LEFT JOIN LATERAL (
    SELECT count(*) cnt FROM public.feedbacks f
    WHERE f.member_id = tm.id
      AND COALESCE(f.occurred_at, f.created_at) BETWEEN _period_start AND (_period_end + 1)
  ) fb ON true
  LEFT JOIN LATERAL (
    SELECT count(*) cnt FROM public.meeting_transcripts mtx
    WHERE mtx.member_id = tm.id
      AND mtx.created_at BETWEEN _period_start AND (_period_end + 1)
  ) mt ON true
  LEFT JOIN LATERAL (
    SELECT p.classification, p.promotion_recommendation, p.merit_recommendation, p.loss_risk
    FROM public.performance_reviews p
    WHERE p.member_id = tm.id
    ORDER BY p.created_at DESC
    LIMIT 1
  ) pr ON true
  LEFT JOIN public.calibration_decisions cd
    ON cd.member_id = tm.id AND cd.session_id = _session_id
  WHERE tm.archived_at IS NULL
    AND w.is_active = true
    AND (
      t.leader_user_id = _uid
      OR w.owner_id = _uid
      OR _uid = ANY(COALESCE(w.hr_admin_ids, '{}'))
    )
  ORDER BY t.name, tm.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_calibration_grid(date, date, uuid) TO authenticated;

SELECT public._assert_rpc_runs($$SELECT * FROM public.get_calibration_grid('2026-01-01'::date, '2026-12-31'::date, NULL) LIMIT 1$$);
