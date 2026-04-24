-- =====================================================
-- Sprint 1: Slack Ambient Mode — Schema
-- =====================================================

-- 1. ENUMs
DO $$ BEGIN
  CREATE TYPE public.slack_evidence_category AS ENUM (
    'entrega',
    'bloqueio',
    'reconhecimento',
    'conflito',
    'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.slack_evidence_status AS ENUM (
    'pending',
    'approved',
    'dismissed',
    'converted_to_feedback'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.digest_cadence AS ENUM (
    'weekly',
    'biweekly',
    'monthly'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.digest_channel AS ENUM (
    'slack',
    'in_app',
    'both'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- 2. workspace_slack_settings
-- =====================================================
CREATE TABLE IF NOT EXISTS public.workspace_slack_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ambient_mode_enabled boolean NOT NULL DEFAULT true,
  autojoin_public_channels boolean NOT NULL DEFAULT true,
  excluded_channel_ids text[] NOT NULL DEFAULT '{}',
  last_classifier_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_slack_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner and HR can view slack settings"
  ON public.workspace_slack_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_slack_settings.workspace_id
        AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id))
    )
  );

CREATE POLICY "Owner and HR can insert slack settings"
  ON public.workspace_slack_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_slack_settings.workspace_id
        AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id))
    )
  );

CREATE POLICY "Owner and HR can update slack settings"
  ON public.workspace_slack_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_slack_settings.workspace_id
        AND (w.owner_id = effective_user_id() OR is_hr_admin_of_workspace(w.id))
    )
  );

-- =====================================================
-- 3. team_members.slack_user_id
-- =====================================================
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS slack_user_id text;

CREATE INDEX IF NOT EXISTS idx_team_members_slack_user_id
  ON public.team_members(slack_user_id)
  WHERE slack_user_id IS NOT NULL;

-- =====================================================
-- 4. slack_ambient_evidence
-- =====================================================
CREATE TABLE IF NOT EXISTS public.slack_ambient_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL,
  member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  slack_channel_id text NOT NULL,
  slack_channel_name text,
  slack_message_ts text NOT NULL,
  message_text text NOT NULL,
  permalink text,
  category public.slack_evidence_category NOT NULL DEFAULT 'outro',
  relevance_score numeric(3,2) NOT NULL DEFAULT 0,
  summary text,
  status public.slack_evidence_status NOT NULL DEFAULT 'pending',
  feedback_id uuid REFERENCES public.feedbacks(id) ON DELETE SET NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slack_ambient_evidence_unique_msg UNIQUE (slack_channel_id, slack_message_ts, member_id)
);

CREATE INDEX IF NOT EXISTS idx_slack_evidence_manager_status
  ON public.slack_ambient_evidence(manager_id, status, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_slack_evidence_workspace
  ON public.slack_ambient_evidence(workspace_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_slack_evidence_member
  ON public.slack_ambient_evidence(member_id, captured_at DESC);

ALTER TABLE public.slack_ambient_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manager can view own evidence"
  ON public.slack_ambient_evidence FOR SELECT
  TO authenticated
  USING (
    manager_id = effective_user_id()
    OR is_hr_admin_of_workspace(workspace_id)
  );

CREATE POLICY "Manager can update own evidence"
  ON public.slack_ambient_evidence FOR UPDATE
  TO authenticated
  USING (manager_id = effective_user_id())
  WITH CHECK (manager_id = effective_user_id());

CREATE POLICY "Manager can delete own evidence"
  ON public.slack_ambient_evidence FOR DELETE
  TO authenticated
  USING (manager_id = effective_user_id());

-- INSERT é feito apenas via service role (cron)
-- Não criamos policy de INSERT para usuários autenticados.

-- =====================================================
-- 5. leader_digest_preferences
-- =====================================================
CREATE TABLE IF NOT EXISTS public.leader_digest_preferences (
  user_id uuid PRIMARY KEY,
  cadence public.digest_cadence NOT NULL DEFAULT 'weekly',
  channel public.digest_channel NOT NULL DEFAULT 'both',
  day_of_week smallint NOT NULL DEFAULT 1 CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hour_local smallint NOT NULL DEFAULT 9 CHECK (hour_local >= 0 AND hour_local <= 23),
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leader_digest_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digest preferences"
  ON public.leader_digest_preferences FOR SELECT
  TO authenticated
  USING (user_id = effective_user_id());

CREATE POLICY "Users can insert own digest preferences"
  ON public.leader_digest_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own digest preferences"
  ON public.leader_digest_preferences FOR UPDATE
  TO authenticated
  USING (user_id = effective_user_id())
  WITH CHECK (user_id = effective_user_id());

CREATE POLICY "Users can delete own digest preferences"
  ON public.leader_digest_preferences FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 6. Triggers de updated_at
-- =====================================================
CREATE TRIGGER trg_workspace_slack_settings_updated
  BEFORE UPDATE ON public.workspace_slack_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_leader_digest_preferences_updated
  BEFORE UPDATE ON public.leader_digest_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();