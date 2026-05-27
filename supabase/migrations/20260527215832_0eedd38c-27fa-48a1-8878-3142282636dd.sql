
-- Helper unificado: Owner OR HR Admin do workspace
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = _workspace_id
      AND w.is_active = true
      AND (
        w.owner_id = public.effective_user_id()
        OR public.effective_user_id() = ANY(COALESCE(w.hr_admin_ids, '{}'::uuid[]))
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO authenticated, service_role;

-- ============================================================
-- Remover Owner-vê-tudo das policies SELECT de conteúdo qualitativo
-- ============================================================

-- feedbacks
DROP POLICY IF EXISTS "Leaders or workspace owner can view feedbacks" ON public.feedbacks;
CREATE POLICY "Leaders can view own feedbacks"
ON public.feedbacks FOR SELECT TO public
USING (public.effective_user_id() = manager_id);

-- meeting_transcripts
DROP POLICY IF EXISTS "Leaders or workspace owner can view meeting transcripts" ON public.meeting_transcripts;
CREATE POLICY "Leaders can view own meeting transcripts"
ON public.meeting_transcripts FOR SELECT TO public
USING (manager_id = public.effective_user_id());

-- goals
DROP POLICY IF EXISTS "Leaders or workspace owner can view goals" ON public.goals;
CREATE POLICY "Leaders can view team goals"
ON public.goals FOR SELECT TO public
USING (public.is_team_leader(public.effective_user_id(), member_id));

-- development_plans
DROP POLICY IF EXISTS "Leaders or workspace owner can view PDI plans" ON public.development_plans;
CREATE POLICY "Leaders can view PDI plans"
ON public.development_plans FOR SELECT TO public
USING (public.is_team_leader(public.effective_user_id(), member_id));

-- development_items
DROP POLICY IF EXISTS "Leaders or workspace owner can view PDI items" ON public.development_items;
CREATE POLICY "Leaders can view PDI items"
ON public.development_items FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM public.development_plans dp
    WHERE dp.id = development_items.plan_id
      AND public.is_team_leader(public.effective_user_id(), dp.member_id)
  )
);

-- performance_reviews
DROP POLICY IF EXISTS "Leaders or workspace owner can view reviews" ON public.performance_reviews;
CREATE POLICY "Leaders can view reviews"
ON public.performance_reviews FOR SELECT TO public
USING (public.is_team_leader(public.effective_user_id(), member_id));

-- pulse_surveys: mantém HR, linked member, super_admin; remove owner
DROP POLICY IF EXISTS "pulse_surveys_select" ON public.pulse_surveys;
CREATE POLICY "pulse_surveys_select"
ON public.pulse_surveys FOR SELECT TO public
USING (
  public.is_team_leader(public.effective_user_id(), member_id)
  OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = pulse_surveys.workspace_id
      AND public.is_hr_admin_of_workspace(w.id)
  )
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = pulse_surveys.member_id
      AND tm.linked_user_id = auth.uid()
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "pulse_surveys_delete" ON public.pulse_surveys;
CREATE POLICY "pulse_surveys_delete"
ON public.pulse_surveys FOR DELETE TO public
USING (public.is_team_leader(public.effective_user_id(), member_id));

-- peer_feedback_requests
DROP POLICY IF EXISTS "Leader reads requests for their team" ON public.peer_feedback_requests;
CREATE POLICY "Leader reads requests for their team"
ON public.peer_feedback_requests FOR SELECT TO public
USING (
  leader_user_id = public.effective_user_id()
  OR public.is_team_leader(public.effective_user_id(), subject_member_id)
);

-- review_peers SELECT (mantém HR via is_hr_admin_of_workspace)
DROP POLICY IF EXISTS "review_peers_select" ON public.review_peers;
CREATE POLICY "review_peers_select"
ON public.review_peers FOR SELECT TO public
USING (
  peer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.performance_reviews pr
    WHERE pr.id = review_peers.review_id
      AND (
        public.is_team_leader(auth.uid(), pr.member_id)
        OR EXISTS (
          SELECT 1 FROM public.team_members tm
          JOIN public.teams t ON t.id = tm.team_id
          WHERE tm.id = pr.member_id
            AND public.is_hr_admin_of_workspace(t.workspace_id)
        )
      )
  )
  OR public.is_admin()
);

-- review_peers UPDATE
DROP POLICY IF EXISTS "review_peers_update" ON public.review_peers;
CREATE POLICY "review_peers_update"
ON public.review_peers FOR UPDATE TO public
USING (
  peer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.performance_reviews pr
    WHERE pr.id = review_peers.review_id
      AND public.is_team_leader(auth.uid(), pr.member_id)
  )
);

-- review_peers DELETE
DROP POLICY IF EXISTS "review_peers_delete_leader" ON public.review_peers;
CREATE POLICY "review_peers_delete_leader"
ON public.review_peers FOR DELETE TO public
USING (
  EXISTS (
    SELECT 1 FROM public.performance_reviews pr
    WHERE pr.id = review_peers.review_id
      AND public.is_team_leader(auth.uid(), pr.member_id)
  )
);

-- monthly_recaps: mantém HR
DROP POLICY IF EXISTS "Leader, owner or HR can view monthly recaps" ON public.monthly_recaps;
CREATE POLICY "Leader or HR can view monthly recaps"
ON public.monthly_recaps FOR SELECT TO public
USING (
  manager_id = public.effective_user_id()
  OR public.is_hr_admin_of_workspace(workspace_id)
);

-- quarterly_recaps: mantém HR
DROP POLICY IF EXISTS "Leader, owner or HR can view quarterly recaps" ON public.quarterly_recaps;
CREATE POLICY "Leader or HR can view quarterly recaps"
ON public.quarterly_recaps FOR SELECT TO public
USING (
  manager_id = public.effective_user_id()
  OR public.is_hr_admin_of_workspace(workspace_id)
);

-- context_evidence: remove Owner branch; HR mantém (heavy use em analytics)
DROP POLICY IF EXISTS "context_evidence_select" ON public.context_evidence;
CREATE POLICY "context_evidence_select"
ON public.context_evidence FOR SELECT TO public
USING (
  -- HR Admin: mantém escopo atual
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = context_evidence.workspace_id
      AND w.is_active = true
      AND public.effective_user_id() = ANY(COALESCE(w.hr_admin_ids, '{}'::uuid[]))
  )
  -- Leader do time vê tudo do liderado
  OR public.is_team_leader(public.effective_user_id(), member_id)
  -- Liderado vê o que foi marcado shared/workspace
  OR (
    visibility = ANY(ARRAY['shared'::text, 'workspace'::text])
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = context_evidence.member_id
        AND tm.linked_user_id = auth.uid()
    )
  )
  OR public.is_admin()
);
