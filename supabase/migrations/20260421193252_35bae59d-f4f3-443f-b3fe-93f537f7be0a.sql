-- ============================================================================
-- Rhitmo Core: Monthly + Quarterly Recaps
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) monthly_recaps
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.monthly_recaps (
  id              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id       uuid NOT NULL,
  manager_id      uuid NOT NULL,
  workspace_id    uuid NOT NULL,
  period_month    date NOT NULL, -- always day 1 of the month being recapped
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed')),
  confirmed_at    timestamptz,
  confirmed_by    uuid,

  highlight_text       text,
  highlight_evidence   jsonb NOT NULL DEFAULT '[]'::jsonb,
  concern_text         text,
  concern_evidence     jsonb NOT NULL DEFAULT '[]'::jsonb,
  dominant_pattern     text,

  feedbacks_count   integer NOT NULL DEFAULT 0,
  meetings_count    integer NOT NULL DEFAULT 0,

  ai_generated_at  timestamptz,
  ai_model         text,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT monthly_recaps_unique_member_month UNIQUE (member_id, period_month),
  CONSTRAINT monthly_recaps_period_is_first_of_month CHECK (date_trunc('month', period_month) = period_month)
);

CREATE INDEX idx_monthly_recaps_manager_period
  ON public.monthly_recaps (manager_id, period_month DESC);
CREATE INDEX idx_monthly_recaps_member_period
  ON public.monthly_recaps (member_id, period_month DESC);
CREATE INDEX idx_monthly_recaps_workspace
  ON public.monthly_recaps (workspace_id);
CREATE INDEX idx_monthly_recaps_status
  ON public.monthly_recaps (status) WHERE status = 'draft';

ALTER TABLE public.monthly_recaps ENABLE ROW LEVEL SECURITY;

-- Manager (creator) full access via team leadership
CREATE POLICY "Leaders can create monthly recaps"
  ON public.monthly_recaps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = effective_user_id()
    AND is_team_leader(effective_user_id(), member_id)
  );

CREATE POLICY "Leaders can update own monthly recaps"
  ON public.monthly_recaps
  FOR UPDATE
  TO authenticated
  USING (manager_id = effective_user_id())
  WITH CHECK (manager_id = effective_user_id());

CREATE POLICY "Leaders can delete own monthly recaps"
  ON public.monthly_recaps
  FOR DELETE
  TO authenticated
  USING (manager_id = effective_user_id());

-- Read: leader OR workspace owner OR HR admin of workspace
CREATE POLICY "Leader, owner or HR can view monthly recaps"
  ON public.monthly_recaps
  FOR SELECT
  TO authenticated
  USING (
    manager_id = effective_user_id()
    OR is_workspace_owner_of_member(member_id)
    OR is_hr_admin_of_workspace(workspace_id)
  );

-- updated_at trigger
CREATE TRIGGER trg_monthly_recaps_updated_at
  BEFORE UPDATE ON public.monthly_recaps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ────────────────────────────────────────────────────────────────────────────
-- 2) quarterly_recaps
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.quarterly_recaps (
  id              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id       uuid NOT NULL,
  manager_id      uuid NOT NULL,
  workspace_id    uuid NOT NULL,
  period_quarter  date NOT NULL, -- first day of the quarter (Jan 1, Apr 1, Jul 1, Oct 1)
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed')),
  confirmed_at    timestamptz,
  confirmed_by    uuid,

  highlights              jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{title, detail, source_month}]
  recurring_patterns      jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{pattern, polarity, frequency_note}]
  evolution_vs_previous   text,

  classification          text CHECK (classification IN ('precisa_subir','dentro_esperado','subindo_barra','acima_esperado')),
  ai_suggested_classification text CHECK (ai_suggested_classification IN ('precisa_subir','dentro_esperado','subindo_barra','acima_esperado')),

  turnover_risk           text CHECK (turnover_risk IN ('low','medium','high')),
  turnover_risk_reason    text,

  next_action_key         text,
  next_action_note        text,
  ai_suggested_next_action_key text,

  source_monthly_recap_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  source_meetings_count    integer NOT NULL DEFAULT 0,
  source_feedbacks_count   integer NOT NULL DEFAULT 0,

  ai_generated_at  timestamptz,
  ai_model         text,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT quarterly_recaps_unique_member_quarter UNIQUE (member_id, period_quarter),
  CONSTRAINT quarterly_recaps_period_is_quarter_start CHECK (
    extract(month from period_quarter)::int IN (1,4,7,10)
    AND extract(day from period_quarter)::int = 1
  )
);

CREATE INDEX idx_quarterly_recaps_manager_period
  ON public.quarterly_recaps (manager_id, period_quarter DESC);
CREATE INDEX idx_quarterly_recaps_member_period
  ON public.quarterly_recaps (member_id, period_quarter DESC);
CREATE INDEX idx_quarterly_recaps_workspace
  ON public.quarterly_recaps (workspace_id);
CREATE INDEX idx_quarterly_recaps_status
  ON public.quarterly_recaps (status) WHERE status = 'draft';

ALTER TABLE public.quarterly_recaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can create quarterly recaps"
  ON public.quarterly_recaps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = effective_user_id()
    AND is_team_leader(effective_user_id(), member_id)
  );

CREATE POLICY "Leaders can update own quarterly recaps"
  ON public.quarterly_recaps
  FOR UPDATE
  TO authenticated
  USING (manager_id = effective_user_id())
  WITH CHECK (manager_id = effective_user_id());

CREATE POLICY "Leaders can delete own quarterly recaps"
  ON public.quarterly_recaps
  FOR DELETE
  TO authenticated
  USING (manager_id = effective_user_id());

CREATE POLICY "Leader, owner or HR can view quarterly recaps"
  ON public.quarterly_recaps
  FOR SELECT
  TO authenticated
  USING (
    manager_id = effective_user_id()
    OR is_workspace_owner_of_member(member_id)
    OR is_hr_admin_of_workspace(workspace_id)
  );

CREATE TRIGGER trg_quarterly_recaps_updated_at
  BEFORE UPDATE ON public.quarterly_recaps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();