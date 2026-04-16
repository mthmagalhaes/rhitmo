-- Migrate "own data" SELECT/UPDATE policies from auth.uid() to effective_user_id()
-- so impersonation flows show the impersonated user's data correctly.

-- ============================================================================
-- feedbacks
-- ============================================================================
DROP POLICY IF EXISTS "Linked users can view shared feedbacks" ON public.feedbacks;
CREATE POLICY "Linked users can view shared feedbacks"
  ON public.feedbacks FOR SELECT TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = feedbacks.member_id
        AND tm.linked_user_id = effective_user_id()
    ))
    AND visibility = 'shared'
  );

-- ============================================================================
-- performance_reviews
-- ============================================================================
DROP POLICY IF EXISTS "Linked members can view shared reviews" ON public.performance_reviews;
CREATE POLICY "Linked members can view shared reviews"
  ON public.performance_reviews FOR SELECT
  USING (
    shared_with_member = true
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = performance_reviews.member_id
        AND tm.linked_user_id = effective_user_id()
    )
  );

-- ============================================================================
-- development_plans
-- ============================================================================
DROP POLICY IF EXISTS "Linked member can view own plans" ON public.development_plans;
CREATE POLICY "Linked member can view own plans"
  ON public.development_plans FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = development_plans.member_id
        AND tm.linked_user_id = effective_user_id()
    )
  );

DROP POLICY IF EXISTS "Linked member can update own plans" ON public.development_plans;
CREATE POLICY "Linked member can update own plans"
  ON public.development_plans FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = development_plans.member_id
        AND tm.linked_user_id = effective_user_id()
    )
  );

DROP POLICY IF EXISTS "Linked member can create own plans" ON public.development_plans;
CREATE POLICY "Linked member can create own plans"
  ON public.development_plans FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = development_plans.member_id
        AND tm.linked_user_id = effective_user_id()
    )
  );

-- ============================================================================
-- development_items
-- ============================================================================
DROP POLICY IF EXISTS "Linked member can view own items" ON public.development_items;
CREATE POLICY "Linked member can view own items"
  ON public.development_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.development_plans dp
      JOIN public.team_members tm ON tm.id = dp.member_id
      WHERE dp.id = development_items.plan_id
        AND tm.linked_user_id = effective_user_id()
    )
  );

DROP POLICY IF EXISTS "Linked member can update own items" ON public.development_items;
CREATE POLICY "Linked member can update own items"
  ON public.development_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.development_plans dp
      JOIN public.team_members tm ON tm.id = dp.member_id
      WHERE dp.id = development_items.plan_id
        AND tm.linked_user_id = effective_user_id()
    )
  );

DROP POLICY IF EXISTS "Linked member can create own items" ON public.development_items;
CREATE POLICY "Linked member can create own items"
  ON public.development_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.development_plans dp
      JOIN public.team_members tm ON tm.id = dp.member_id
      WHERE dp.id = development_items.plan_id
        AND tm.linked_user_id = effective_user_id()
    )
  );

-- ============================================================================
-- goals
-- ============================================================================
DROP POLICY IF EXISTS "Linked members can view own goals" ON public.goals;
CREATE POLICY "Linked members can view own goals"
  ON public.goals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = goals.member_id
        AND tm.linked_user_id = effective_user_id()
    )
  );

-- ============================================================================
-- bias_detections
-- ============================================================================
DROP POLICY IF EXISTS "HR Admins can view bias detections" ON public.bias_detections;
CREATE POLICY "HR Admins can view bias detections"
  ON public.bias_detections FOR SELECT TO authenticated
  USING (
    leader_id = effective_user_id()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      JOIN public.workspaces w ON w.id = t.workspace_id
      WHERE tm.id = bias_detections.member_id
        AND is_hr_admin_of_workspace(w.id)
    )
  );

DROP POLICY IF EXISTS "Leaders can update own bias detections" ON public.bias_detections;
CREATE POLICY "Leaders can update own bias detections"
  ON public.bias_detections FOR UPDATE TO authenticated
  USING (leader_id = effective_user_id());

-- ============================================================================
-- slack_integrations
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own slack integration" ON public.slack_integrations;
CREATE POLICY "Users can view own slack integration"
  ON public.slack_integrations FOR SELECT
  USING (effective_user_id() = user_id);

DROP POLICY IF EXISTS "Users can update own slack integration" ON public.slack_integrations;
CREATE POLICY "Users can update own slack integration"
  ON public.slack_integrations FOR UPDATE
  USING (effective_user_id() = user_id);

DROP POLICY IF EXISTS "Users can delete own slack integration" ON public.slack_integrations;
CREATE POLICY "Users can delete own slack integration"
  ON public.slack_integrations FOR DELETE
  USING (effective_user_id() = user_id);

-- ============================================================================
-- extension_tokens
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own extension tokens" ON public.extension_tokens;
CREATE POLICY "Users can view own extension tokens"
  ON public.extension_tokens FOR SELECT TO authenticated
  USING (user_id = effective_user_id());

DROP POLICY IF EXISTS "Users can update own extension tokens" ON public.extension_tokens;
CREATE POLICY "Users can update own extension tokens"
  ON public.extension_tokens FOR UPDATE TO authenticated
  USING (user_id = effective_user_id());

-- ============================================================================
-- recall_bots
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own recall bots" ON public.recall_bots;
CREATE POLICY "Users can view own recall bots"
  ON public.recall_bots FOR SELECT
  USING (user_id = effective_user_id());

-- ============================================================================
-- leader_nudges
-- ============================================================================
DROP POLICY IF EXISTS "Leaders can view their nudges" ON public.leader_nudges;
CREATE POLICY "Leaders can view their nudges"
  ON public.leader_nudges FOR SELECT TO authenticated
  USING (effective_user_id() = leader_id);

DROP POLICY IF EXISTS "Leaders can dismiss nudges" ON public.leader_nudges;
CREATE POLICY "Leaders can dismiss nudges"
  ON public.leader_nudges FOR UPDATE TO authenticated
  USING (effective_user_id() = leader_id)
  WITH CHECK (effective_user_id() = leader_id);

-- ============================================================================
-- rhitmo_sync_notifications
-- ============================================================================
DROP POLICY IF EXISTS "Leaders can view own sync notifications" ON public.rhitmo_sync_notifications;
CREATE POLICY "Leaders can view own sync notifications"
  ON public.rhitmo_sync_notifications FOR SELECT TO authenticated
  USING (leader_user_id = effective_user_id());

DROP POLICY IF EXISTS "Leaders can update own sync notifications" ON public.rhitmo_sync_notifications;
CREATE POLICY "Leaders can update own sync notifications"
  ON public.rhitmo_sync_notifications FOR UPDATE TO authenticated
  USING (leader_user_id = effective_user_id())
  WITH CHECK (leader_user_id = effective_user_id());

-- ============================================================================
-- kudos
-- ============================================================================
DROP POLICY IF EXISTS "Users can view kudos in own workspace" ON public.kudos;
CREATE POLICY "Users can view kudos in own workspace"
  ON public.kudos FOR SELECT
  USING (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_id = effective_user_id()
      UNION
      SELECT w.id FROM public.workspaces w WHERE effective_user_id() = ANY (COALESCE(w.hr_admin_ids, '{}'::uuid[]))
      UNION
      SELECT t.workspace_id FROM public.teams t WHERE t.leader_user_id = effective_user_id()
      UNION
      SELECT t.workspace_id FROM public.teams t
      JOIN public.team_members tm ON tm.team_id = t.id
      WHERE tm.linked_user_id = effective_user_id()
    )
  );

-- ============================================================================
-- feedback_streaks
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own streak" ON public.feedback_streaks;
CREATE POLICY "Users can view own streak"
  ON public.feedback_streaks FOR SELECT
  USING (effective_user_id() = user_id);

-- ============================================================================
-- pending_slack_invites
-- ============================================================================
DROP POLICY IF EXISTS "Leaders can view invites" ON public.pending_slack_invites;
CREATE POLICY "Leaders can view invites"
  ON public.pending_slack_invites FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.id = pending_slack_invites.member_id
        AND t.leader_user_id = effective_user_id()
    )
  );

-- ============================================================================
-- user_preferences
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (user_id = effective_user_id());

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (user_id = effective_user_id());

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (user_id = effective_user_id());

-- ============================================================================
-- team_members (linked member self-access)
-- ============================================================================
DROP POLICY IF EXISTS "tm_read" ON public.team_members;
CREATE POLICY "tm_read"
  ON public.team_members FOR SELECT
  USING (
    rls_check_member_read_access(team_id)
    OR linked_user_id = effective_user_id()
    OR is_admin()
  );

DROP POLICY IF EXISTS "tm_update" ON public.team_members;
CREATE POLICY "tm_update"
  ON public.team_members FOR UPDATE
  USING (
    rls_check_member_access(team_id)
    OR linked_user_id = effective_user_id()
    OR is_admin()
  );
