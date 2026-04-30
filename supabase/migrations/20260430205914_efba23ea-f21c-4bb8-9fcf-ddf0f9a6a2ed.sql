-- =====================================================================
-- SPRINT 9.1 — PULSE SURVEYS (Conversational, leader-triggered)
-- =====================================================================

-- 1. Table -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pulse_surveys (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL,
  member_id         uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  requested_by      uuid NOT NULL,
  type              text NOT NULL CHECK (type IN ('blockers','priorities','retro','goal_progress')),
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','completed','expired')),
  questions         jsonb NOT NULL DEFAULT '[]'::jsonb,
  responses         jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary           jsonb,
  context_metadata  jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at           timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pulse_surveys_member_sent
  ON public.pulse_surveys (member_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_pulse_surveys_workspace_status_sent
  ON public.pulse_surveys (workspace_id, status, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_pulse_surveys_requester_sent
  ON public.pulse_surveys (requested_by, sent_at DESC);

-- updated_at trigger
DROP TRIGGER IF EXISTS update_pulse_surveys_updated_at ON public.pulse_surveys;
CREATE TRIGGER update_pulse_surveys_updated_at
  BEFORE UPDATE ON public.pulse_surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Workspace integrity guard ----------------------------------------
CREATE OR REPLACE FUNCTION public.pulse_surveys_validate_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected uuid;
BEGIN
  v_expected := public._ctx_resolve_workspace(NEW.member_id);
  IF v_expected IS NULL THEN
    RAISE EXCEPTION 'pulse_surveys: member_id % does not resolve to a workspace', NEW.member_id;
  END IF;
  IF NEW.workspace_id IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'pulse_surveys: workspace_id (%) does not match member''s team workspace (%)',
      NEW.workspace_id, v_expected;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pulse_surveys_validate_workspace ON public.pulse_surveys;
CREATE TRIGGER trg_pulse_surveys_validate_workspace
  BEFORE INSERT OR UPDATE OF workspace_id, member_id
  ON public.pulse_surveys
  FOR EACH ROW EXECUTE FUNCTION public.pulse_surveys_validate_workspace();

-- 3. Member-can-only-respond guard ------------------------------------
-- If the actor is the linked member (and not the leader), restrict the
-- columns they can change to: responses, status, completed_at, updated_at.
CREATE OR REPLACE FUNCTION public.pulse_surveys_restrict_member_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_leader boolean;
  v_is_member boolean;
BEGIN
  IF v_uid IS NULL THEN
    -- Service role / triggers: allow.
    RETURN NEW;
  END IF;

  v_is_leader := public.is_team_leader(v_uid, NEW.member_id);
  IF v_is_leader THEN
    RETURN NEW; -- leader can update anything
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = NEW.member_id AND tm.linked_user_id = v_uid
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    -- Workspace owners / HR / super admin will pass through here too.
    -- We don't restrict their updates beyond what RLS allows.
    RETURN NEW;
  END IF;

  -- Member: block changes to sensitive columns.
  IF NEW.workspace_id   IS DISTINCT FROM OLD.workspace_id
     OR NEW.member_id   IS DISTINCT FROM OLD.member_id
     OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
     OR NEW.type        IS DISTINCT FROM OLD.type
     OR NEW.questions   IS DISTINCT FROM OLD.questions
     OR NEW.summary     IS DISTINCT FROM OLD.summary
     OR NEW.context_metadata IS DISTINCT FROM OLD.context_metadata
     OR NEW.sent_at     IS DISTINCT FROM OLD.sent_at
     OR NEW.expires_at  IS DISTINCT FROM OLD.expires_at
  THEN
    RAISE EXCEPTION 'pulse_surveys: linked member can only update responses, status and completed_at';
  END IF;

  -- Member can only set status to completed (or keep pending).
  IF NEW.status NOT IN ('pending','completed') THEN
    RAISE EXCEPTION 'pulse_surveys: linked member cannot set status to %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pulse_surveys_restrict_member ON public.pulse_surveys;
CREATE TRIGGER trg_pulse_surveys_restrict_member
  BEFORE UPDATE ON public.pulse_surveys
  FOR EACH ROW EXECUTE FUNCTION public.pulse_surveys_restrict_member_update();

-- 4. RLS ---------------------------------------------------------------
ALTER TABLE public.pulse_surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pulse_surveys_select ON public.pulse_surveys;
CREATE POLICY pulse_surveys_select ON public.pulse_surveys
  FOR SELECT
  USING (
    public.is_team_leader(public.effective_user_id(), member_id)
    OR public.is_workspace_owner_of_member(member_id)
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

DROP POLICY IF EXISTS pulse_surveys_insert_leader ON public.pulse_surveys;
CREATE POLICY pulse_surveys_insert_leader ON public.pulse_surveys
  FOR INSERT
  WITH CHECK (
    requested_by = public.effective_user_id()
    AND public.is_team_leader(public.effective_user_id(), member_id)
  );

DROP POLICY IF EXISTS pulse_surveys_update_leader ON public.pulse_surveys;
CREATE POLICY pulse_surveys_update_leader ON public.pulse_surveys
  FOR UPDATE
  USING (public.is_team_leader(public.effective_user_id(), member_id))
  WITH CHECK (public.is_team_leader(public.effective_user_id(), member_id));

DROP POLICY IF EXISTS pulse_surveys_update_member ON public.pulse_surveys;
CREATE POLICY pulse_surveys_update_member ON public.pulse_surveys
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = pulse_surveys.member_id
        AND tm.linked_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = pulse_surveys.member_id
        AND tm.linked_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS pulse_surveys_delete ON public.pulse_surveys;
CREATE POLICY pulse_surveys_delete ON public.pulse_surveys
  FOR DELETE
  USING (
    public.is_team_leader(public.effective_user_id(), member_id)
    OR public.is_workspace_owner_of_member(member_id)
  );

-- 5. Context Graph integration ----------------------------------------
CREATE OR REPLACE FUNCTION public.ctx_evidence_from_pulse_survey()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary_text text;
  v_sentiment    text;
  v_themes       text[];
BEGIN
  -- Not completed: ensure no stale evidence remains.
  IF NEW.status <> 'completed' THEN
    IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
      DELETE FROM public.context_evidence
      WHERE source_table = 'pulse_surveys' AND source_id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  -- Build summary text: prefer AI tldr, fall back to concatenated answers.
  v_summary_text := COALESCE(
    NULLIF(NEW.summary->>'tldr', ''),
    (
      SELECT NULLIF(string_agg(r->>'answer', ' • '), '')
      FROM jsonb_array_elements(NEW.responses) AS r
    ),
    'Pulse Survey respondido'
  );

  v_sentiment := COALESCE(NULLIF(NEW.summary->>'sentiment', ''), 'neutral');

  v_themes := COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(COALESCE(NEW.summary->'themes', '[]'::jsonb))
    ),
    ARRAY[]::text[]
  );

  INSERT INTO public.context_evidence (
    workspace_id, member_id, source_table, source_id, evidence_type,
    occurred_at, title, summary, sentiment, tags, actor_user_id,
    visibility, metadata
  ) VALUES (
    NEW.workspace_id,
    NEW.member_id,
    'pulse_surveys',
    NEW.id,
    'pulse_response',
    COALESCE(NEW.completed_at, now()),
    'Pulse Survey: ' || NEW.type,
    LEFT(v_summary_text, 500),
    v_sentiment,
    ARRAY['pulse_survey', NEW.type] || v_themes,
    NEW.requested_by,
    'shared',
    jsonb_build_object(
      'survey_type',      NEW.type,
      'questions_count',  jsonb_array_length(NEW.questions),
      'responses_count',  jsonb_array_length(NEW.responses),
      'summary',          NEW.summary,
      'context_metadata', NEW.context_metadata
    )
  )
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    summary     = EXCLUDED.summary,
    sentiment   = EXCLUDED.sentiment,
    tags        = EXCLUDED.tags,
    metadata    = EXCLUDED.metadata,
    occurred_at = EXCLUDED.occurred_at,
    embedding   = NULL,
    updated_at  = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ctx_evidence_pulse_survey ON public.pulse_surveys;
CREATE TRIGGER trg_ctx_evidence_pulse_survey
  AFTER INSERT OR UPDATE OF status, summary, responses, completed_at
  ON public.pulse_surveys
  FOR EACH ROW EXECUTE FUNCTION public.ctx_evidence_from_pulse_survey();