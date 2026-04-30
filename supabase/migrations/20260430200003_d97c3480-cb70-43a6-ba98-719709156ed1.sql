-- =====================================================================
-- SPRINT 8.1 — CONTEXT GRAPH V1
-- Unified evidence layer with member as root entity
-- =====================================================================

-- 1. Main aggregation table -------------------------------------------
CREATE TABLE IF NOT EXISTS public.context_evidence (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL,
  member_id       uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  source_table    text NOT NULL,
  source_id       uuid NOT NULL,
  evidence_type   text NOT NULL,
  occurred_at     timestamptz NOT NULL,
  title           text,
  summary         text,
  sentiment       text,
  tags            text[] NOT NULL DEFAULT '{}',
  actor_user_id   uuid,
  visibility      text NOT NULL DEFAULT 'private_leader'
                    CHECK (visibility IN ('private_leader','shared','workspace')),
  embedding       extensions.vector(1536),
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT context_evidence_source_uniq UNIQUE (source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_context_evidence_member_time
  ON public.context_evidence (member_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_context_evidence_workspace_time
  ON public.context_evidence (workspace_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_context_evidence_member_type_time
  ON public.context_evidence (member_id, evidence_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_context_evidence_pending_embedding
  ON public.context_evidence (created_at) WHERE embedding IS NULL;

CREATE INDEX IF NOT EXISTS idx_context_evidence_embedding_hnsw
  ON public.context_evidence USING hnsw (embedding extensions.vector_cosine_ops);

-- updated_at trigger
DROP TRIGGER IF EXISTS update_context_evidence_updated_at ON public.context_evidence;
CREATE TRIGGER update_context_evidence_updated_at
  BEFORE UPDATE ON public.context_evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. RLS ---------------------------------------------------------------
ALTER TABLE public.context_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS context_evidence_select ON public.context_evidence;
CREATE POLICY context_evidence_select ON public.context_evidence
  FOR SELECT
  USING (
    -- Workspace owner / HR admin
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = context_evidence.workspace_id
        AND w.is_active = true
        AND (
          w.owner_id = effective_user_id()
          OR effective_user_id() = ANY(COALESCE(w.hr_admin_ids, '{}'))
        )
    )
    -- Team leader of the member
    OR public.is_team_leader(effective_user_id(), context_evidence.member_id)
    -- The linked member themselves, only on shared/workspace visibility
    OR (
      visibility IN ('shared','workspace')
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.id = context_evidence.member_id
          AND tm.linked_user_id = auth.uid()
      )
    )
    -- Super admin
    OR public.is_admin()
  );

-- No INSERT/UPDATE/DELETE policies: only triggers (SECURITY DEFINER) and service_role write.

-- 3. Helper to resolve workspace_id from a team_members.id ------------
CREATE OR REPLACE FUNCTION public._ctx_resolve_workspace(_member_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.workspace_id
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.id = _member_id
$$;

-- 4. Trigger functions per source -------------------------------------
-- Each is AFTER INSERT OR UPDATE; UPSERT into context_evidence.

-- 4.1 feedbacks
CREATE OR REPLACE FUNCTION public.ctx_evidence_from_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid;
  v_visibility text;
  v_sentiment text;
BEGIN
  v_workspace := public._ctx_resolve_workspace(NEW.member_id);
  IF v_workspace IS NULL THEN RETURN NEW; END IF;

  v_visibility := CASE WHEN NEW.visibility = 'shared' THEN 'shared' ELSE 'private_leader' END;
  v_sentiment := CASE NEW.type
                   WHEN 'positive' THEN 'positive'
                   WHEN 'constructive' THEN 'constructive'
                   ELSE 'neutral' END;

  INSERT INTO public.context_evidence (
    workspace_id, member_id, source_table, source_id, evidence_type,
    occurred_at, title, summary, sentiment, tags, actor_user_id, visibility,
    metadata
  ) VALUES (
    v_workspace, NEW.member_id, 'feedbacks', NEW.id, 'note',
    NEW.occurred_at,
    COALESCE(NEW.title, LEFT(NEW.content, 80)),
    COALESCE(NEW.summary, LEFT(NEW.content, 400)),
    v_sentiment,
    COALESCE(NEW.tags, '{}'),
    NEW.manager_id,
    v_visibility,
    jsonb_build_object('source', NEW.source, 'feedback_type', NEW.type)
  )
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    title       = EXCLUDED.title,
    summary     = EXCLUDED.summary,
    sentiment   = EXCLUDED.sentiment,
    tags        = EXCLUDED.tags,
    visibility  = EXCLUDED.visibility,
    occurred_at = EXCLUDED.occurred_at,
    metadata    = EXCLUDED.metadata,
    embedding   = NULL,  -- summary changed → re-embed
    updated_at  = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ctx_evidence_feedback ON public.feedbacks;
CREATE TRIGGER trg_ctx_evidence_feedback
  AFTER INSERT OR UPDATE OF content, summary, title, type, visibility, tags, occurred_at
  ON public.feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.ctx_evidence_from_feedback();

-- 4.2 meeting_transcripts
CREATE OR REPLACE FUNCTION public.ctx_evidence_from_meeting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid;
  v_summary text;
BEGIN
  IF NEW.member_id IS NULL OR NEW.processing_status <> 'completed' THEN
    RETURN NEW;
  END IF;

  v_workspace := public._ctx_resolve_workspace(NEW.member_id);
  IF v_workspace IS NULL THEN RETURN NEW; END IF;

  v_summary := COALESCE(
    NEW.leader_notes,
    NULLIF(array_to_string(NEW.extracted_themes, ', '), ''),
    LEFT(COALESCE(NEW.transcript, ''), 400)
  );

  INSERT INTO public.context_evidence (
    workspace_id, member_id, source_table, source_id, evidence_type,
    occurred_at, title, summary, tags, actor_user_id, visibility, metadata
  ) VALUES (
    v_workspace, NEW.member_id, 'meeting_transcripts', NEW.id, 'meeting',
    NEW.created_at,
    'Reunião 1:1',
    v_summary,
    COALESCE(NEW.extracted_themes, '{}'),
    NEW.manager_id,
    'private_leader',
    jsonb_build_object(
      'duration_seconds', NEW.duration_seconds,
      'commitments', COALESCE(to_jsonb(NEW.extracted_commitments), '[]'::jsonb)
    )
  )
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    summary    = EXCLUDED.summary,
    tags       = EXCLUDED.tags,
    metadata   = EXCLUDED.metadata,
    embedding  = NULL,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ctx_evidence_meeting ON public.meeting_transcripts;
CREATE TRIGGER trg_ctx_evidence_meeting
  AFTER INSERT OR UPDATE OF processing_status, leader_notes, extracted_themes, transcript
  ON public.meeting_transcripts
  FOR EACH ROW EXECUTE FUNCTION public.ctx_evidence_from_meeting();

-- 4.3 slack_ambient_evidence
CREATE OR REPLACE FUNCTION public.ctx_evidence_from_slack()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sentiment text;
BEGIN
  IF NEW.status NOT IN ('approved','converted_to_feedback') THEN
    -- If was approved before and now reverted, remove
    IF TG_OP = 'UPDATE' AND OLD.status IN ('approved','converted_to_feedback') THEN
      DELETE FROM public.context_evidence
      WHERE source_table = 'slack_ambient_evidence' AND source_id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  v_sentiment := CASE NEW.category::text
                   WHEN 'reconhecimento' THEN 'positive'
                   WHEN 'entrega' THEN 'positive'
                   WHEN 'bloqueio' THEN 'warning'
                   WHEN 'conflito' THEN 'warning'
                   ELSE 'neutral' END;

  INSERT INTO public.context_evidence (
    workspace_id, member_id, source_table, source_id, evidence_type,
    occurred_at, title, summary, sentiment, tags, actor_user_id, visibility, metadata
  ) VALUES (
    NEW.workspace_id, NEW.member_id, 'slack_ambient_evidence', NEW.id, 'slack_signal',
    NEW.captured_at,
    'Sinal do Slack: ' || NEW.category::text,
    COALESCE(NEW.summary, LEFT(NEW.message_text, 400)),
    v_sentiment,
    ARRAY['slack', NEW.category::text],
    NEW.manager_id,
    'private_leader',
    jsonb_build_object(
      'slack_channel_id', NEW.slack_channel_id,
      'slack_channel_name', NEW.slack_channel_name,
      'permalink', NEW.permalink,
      'relevance_score', NEW.relevance_score
    )
  )
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    summary    = EXCLUDED.summary,
    sentiment  = EXCLUDED.sentiment,
    tags       = EXCLUDED.tags,
    metadata   = EXCLUDED.metadata,
    embedding  = NULL,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ctx_evidence_slack ON public.slack_ambient_evidence;
CREATE TRIGGER trg_ctx_evidence_slack
  AFTER INSERT OR UPDATE OF status, summary, category
  ON public.slack_ambient_evidence
  FOR EACH ROW EXECUTE FUNCTION public.ctx_evidence_from_slack();

-- 4.4 kudos
CREATE OR REPLACE FUNCTION public.ctx_evidence_from_kudo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.context_evidence (
    workspace_id, member_id, source_table, source_id, evidence_type,
    occurred_at, title, summary, sentiment, tags, actor_user_id, visibility, metadata
  ) VALUES (
    NEW.workspace_id, NEW.to_member_id, 'kudos', NEW.id, 'kudo',
    COALESCE(NEW.created_at, now()),
    'Kudo recebido',
    LEFT(NEW.message, 400),
    'positive',
    CASE WHEN NEW.company_value IS NOT NULL
         THEN ARRAY['kudo', NEW.company_value]
         ELSE ARRAY['kudo'] END,
    NEW.from_user_id,
    'shared',
    jsonb_build_object(
      'company_value', NEW.company_value,
      'slack_channel_id', NEW.slack_channel_id
    )
  )
  ON CONFLICT (source_table, source_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ctx_evidence_kudo ON public.kudos;
CREATE TRIGGER trg_ctx_evidence_kudo
  AFTER INSERT ON public.kudos
  FOR EACH ROW EXECUTE FUNCTION public.ctx_evidence_from_kudo();

-- 4.5 member_prompts (pulse responses)
CREATE OR REPLACE FUNCTION public.ctx_evidence_from_prompt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid;
BEGIN
  IF NEW.answered_at IS NULL OR NEW.response IS NULL THEN
    RETURN NEW;
  END IF;

  v_workspace := public._ctx_resolve_workspace(NEW.member_id);
  IF v_workspace IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.context_evidence (
    workspace_id, member_id, source_table, source_id, evidence_type,
    occurred_at, title, summary, tags, actor_user_id, visibility, metadata
  ) VALUES (
    v_workspace, NEW.member_id, 'member_prompts', NEW.id, 'pulse_response',
    NEW.answered_at,
    'Pulse: ' || NEW.prompt_key,
    LEFT(NEW.response, 500),
    ARRAY['pulse', NEW.prompt_key],
    NEW.linked_user_id,
    CASE WHEN NEW.shared_with_leader THEN 'shared' ELSE 'private_member' END,
    jsonb_build_object(
      'prompt_key', NEW.prompt_key,
      'prompt_text', NEW.prompt_text,
      'week_starting', NEW.week_starting,
      'shared_with_leader', NEW.shared_with_leader
    )
  )
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    summary    = EXCLUDED.summary,
    visibility = EXCLUDED.visibility,
    metadata   = EXCLUDED.metadata,
    embedding  = NULL,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ctx_evidence_prompt ON public.member_prompts;
CREATE TRIGGER trg_ctx_evidence_prompt
  AFTER INSERT OR UPDATE OF response, answered_at, shared_with_leader
  ON public.member_prompts
  FOR EACH ROW EXECUTE FUNCTION public.ctx_evidence_from_prompt();

-- Note: visibility check above includes 'private_member' which is not in our CHECK.
-- Fix: collapse to allowed values.
-- (rewrite above query to use only allowed visibilities)
CREATE OR REPLACE FUNCTION public.ctx_evidence_from_prompt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid;
  v_visibility text;
BEGIN
  IF NEW.answered_at IS NULL OR NEW.response IS NULL THEN
    RETURN NEW;
  END IF;

  v_workspace := public._ctx_resolve_workspace(NEW.member_id);
  IF v_workspace IS NULL THEN RETURN NEW; END IF;

  -- Only land in context_evidence if shared with leader; private member responses stay outside the leader graph.
  IF NOT NEW.shared_with_leader THEN
    DELETE FROM public.context_evidence
    WHERE source_table = 'member_prompts' AND source_id = NEW.id;
    RETURN NEW;
  END IF;

  v_visibility := 'shared';

  INSERT INTO public.context_evidence (
    workspace_id, member_id, source_table, source_id, evidence_type,
    occurred_at, title, summary, tags, actor_user_id, visibility, metadata
  ) VALUES (
    v_workspace, NEW.member_id, 'member_prompts', NEW.id, 'pulse_response',
    NEW.answered_at,
    'Pulse: ' || NEW.prompt_key,
    LEFT(NEW.response, 500),
    ARRAY['pulse', NEW.prompt_key],
    NEW.linked_user_id,
    v_visibility,
    jsonb_build_object(
      'prompt_key', NEW.prompt_key,
      'prompt_text', NEW.prompt_text,
      'week_starting', NEW.week_starting
    )
  )
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    summary    = EXCLUDED.summary,
    visibility = EXCLUDED.visibility,
    metadata   = EXCLUDED.metadata,
    embedding  = NULL,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- 4.6 goals
CREATE OR REPLACE FUNCTION public.ctx_evidence_from_goal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid;
  v_event_type text;
  v_title text;
BEGIN
  v_workspace := public._ctx_resolve_workspace(NEW.member_id);
  IF v_workspace IS NULL THEN RETURN NEW; END IF;

  -- Only emit on insert or status change
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event_type := NEW.status;
  ELSE
    RETURN NEW;
  END IF;

  v_title := CASE v_event_type
               WHEN 'created'   THEN 'Meta criada: ' || NEW.title
               WHEN 'completed' THEN 'Meta concluída: ' || NEW.title
               WHEN 'archived'  THEN 'Meta arquivada: ' || NEW.title
               WHEN 'active'    THEN 'Meta reativada: ' || NEW.title
               ELSE 'Meta atualizada: ' || NEW.title
             END;

  INSERT INTO public.context_evidence (
    workspace_id, member_id, source_table, source_id, evidence_type,
    occurred_at, title, summary, sentiment, tags, visibility, metadata
  ) VALUES (
    v_workspace, NEW.member_id, 'goals', NEW.id, 'goal_event',
    COALESCE(NEW.completed_at, NEW.updated_at, now()),
    v_title,
    COALESCE(NEW.description, NEW.title),
    CASE WHEN v_event_type = 'completed' THEN 'positive' ELSE 'neutral' END,
    ARRAY['goal', v_event_type],
    'shared',
    jsonb_build_object(
      'status', NEW.status,
      'event_type', v_event_type,
      'metric_current', NEW.metric_current,
      'metric_target', NEW.metric_target,
      'metric_unit', NEW.metric_unit,
      'target_date', NEW.target_date
    )
  )
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    title      = EXCLUDED.title,
    summary    = EXCLUDED.summary,
    sentiment  = EXCLUDED.sentiment,
    tags       = EXCLUDED.tags,
    metadata   = EXCLUDED.metadata,
    occurred_at = EXCLUDED.occurred_at,
    embedding  = NULL,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ctx_evidence_goal ON public.goals;
CREATE TRIGGER trg_ctx_evidence_goal
  AFTER INSERT OR UPDATE OF status, title, description
  ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.ctx_evidence_from_goal();

-- 4.7 performance_reviews (only shared)
CREATE OR REPLACE FUNCTION public.ctx_evidence_from_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid;
  v_excerpt text;
BEGIN
  IF NEW.shared_with_member IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  v_workspace := public._ctx_resolve_workspace(NEW.member_id);
  IF v_workspace IS NULL THEN RETURN NEW; END IF;

  -- Strip HTML rough: remove tags
  v_excerpt := LEFT(regexp_replace(NEW.content, '<[^>]+>', ' ', 'g'), 600);

  INSERT INTO public.context_evidence (
    workspace_id, member_id, source_table, source_id, evidence_type,
    occurred_at, title, summary, tags, visibility, metadata
  ) VALUES (
    v_workspace, NEW.member_id, 'performance_reviews', NEW.id, 'review_excerpt',
    COALESCE(NEW.sent_at, NEW.updated_at, NEW.created_at),
    NEW.title,
    v_excerpt,
    ARRAY['review', COALESCE(NEW.period_type, 'manual')],
    'shared',
    jsonb_build_object(
      'period_type', NEW.period_type,
      'period_start', NEW.period_start,
      'period_end', NEW.period_end,
      'classification', NEW.classification,
      'evidence_count', NEW.evidence_count
    )
  )
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    title      = EXCLUDED.title,
    summary    = EXCLUDED.summary,
    metadata   = EXCLUDED.metadata,
    occurred_at = EXCLUDED.occurred_at,
    embedding  = NULL,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ctx_evidence_review ON public.performance_reviews;
CREATE TRIGGER trg_ctx_evidence_review
  AFTER INSERT OR UPDATE OF shared_with_member, content, title, sent_at
  ON public.performance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.ctx_evidence_from_review();

-- 4.8 leader_nudges
CREATE OR REPLACE FUNCTION public.ctx_evidence_from_nudge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid;
BEGIN
  IF NEW.member_id IS NULL THEN RETURN NEW; END IF;

  -- If dismissed, remove
  IF NEW.dismissed_at IS NOT NULL THEN
    DELETE FROM public.context_evidence
    WHERE source_table = 'leader_nudges' AND source_id = NEW.id;
    RETURN NEW;
  END IF;

  v_workspace := public._ctx_resolve_workspace(NEW.member_id);
  IF v_workspace IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.context_evidence (
    workspace_id, member_id, source_table, source_id, evidence_type,
    occurred_at, title, summary, sentiment, tags, actor_user_id, visibility, metadata
  ) VALUES (
    v_workspace, NEW.member_id, 'leader_nudges', NEW.id, 'nudge',
    COALESCE(NEW.created_at, now()),
    'Nudge: ' || NEW.nudge_type,
    LEFT(NEW.message, 400),
    CASE NEW.severity WHEN 'warning' THEN 'warning' WHEN 'critical' THEN 'warning' ELSE 'neutral' END,
    ARRAY['nudge', NEW.nudge_type],
    NEW.leader_id,
    'private_leader',
    jsonb_build_object(
      'nudge_type', NEW.nudge_type,
      'severity', NEW.severity,
      'action_url', NEW.action_url
    )
  )
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    summary    = EXCLUDED.summary,
    sentiment  = EXCLUDED.sentiment,
    metadata   = EXCLUDED.metadata,
    embedding  = NULL,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ctx_evidence_nudge ON public.leader_nudges;
CREATE TRIGGER trg_ctx_evidence_nudge
  AFTER INSERT OR UPDATE OF dismissed_at, message, severity
  ON public.leader_nudges
  FOR EACH ROW EXECUTE FUNCTION public.ctx_evidence_from_nudge();

-- 5. Optimized read RPC ------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_member_timeline(
  _member_id uuid,
  _limit int DEFAULT 50,
  _types text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  evidence_type text,
  source_table text,
  source_id uuid,
  occurred_at timestamptz,
  title text,
  summary text,
  sentiment text,
  tags text[],
  actor_user_id uuid,
  visibility text,
  metadata jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid;
BEGIN
  v_workspace := public._ctx_resolve_workspace(_member_id);
  IF v_workspace IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;

  -- Authorization (same logic as RLS)
  IF NOT (
    public.is_team_leader(effective_user_id(), _member_id)
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = v_workspace
        AND (w.owner_id = effective_user_id()
             OR effective_user_id() = ANY(COALESCE(w.hr_admin_ids, '{}')))
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = _member_id AND tm.linked_user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT ce.id, ce.evidence_type, ce.source_table, ce.source_id,
         ce.occurred_at, ce.title, ce.summary, ce.sentiment, ce.tags,
         ce.actor_user_id, ce.visibility, ce.metadata
  FROM public.context_evidence ce
  WHERE ce.member_id = _member_id
    AND (_types IS NULL OR ce.evidence_type = ANY(_types))
  ORDER BY ce.occurred_at DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_timeline(uuid, int, text[]) TO authenticated;

-- 6. Backfill RPC (idempotent) ----------------------------------------
CREATE OR REPLACE FUNCTION public.backfill_context_evidence(_workspace_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counts jsonb := '{}'::jsonb;
  v_count int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  -- Feedbacks
  WITH src AS (
    SELECT f.* FROM public.feedbacks f
    JOIN public.team_members tm ON tm.id = f.member_id
    JOIN public.teams t ON t.id = tm.team_id
    WHERE _workspace_id IS NULL OR t.workspace_id = _workspace_id
  ),
  ins AS (
    INSERT INTO public.context_evidence (
      workspace_id, member_id, source_table, source_id, evidence_type,
      occurred_at, title, summary, sentiment, tags, actor_user_id, visibility, metadata
    )
    SELECT
      t.workspace_id, src.member_id, 'feedbacks', src.id, 'note',
      src.occurred_at,
      COALESCE(src.title, LEFT(src.content, 80)),
      COALESCE(src.summary, LEFT(src.content, 400)),
      CASE src.type WHEN 'positive' THEN 'positive' WHEN 'constructive' THEN 'constructive' ELSE 'neutral' END,
      COALESCE(src.tags, '{}'),
      src.manager_id,
      CASE WHEN src.visibility = 'shared' THEN 'shared' ELSE 'private_leader' END,
      jsonb_build_object('source', src.source, 'feedback_type', src.type)
    FROM src
    JOIN public.team_members tm ON tm.id = src.member_id
    JOIN public.teams t ON t.id = tm.team_id
    ON CONFLICT (source_table, source_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;
  v_counts := v_counts || jsonb_build_object('feedbacks', v_count);

  -- Meetings
  WITH src AS (
    SELECT m.* FROM public.meeting_transcripts m
    JOIN public.team_members tm ON tm.id = m.member_id
    JOIN public.teams t ON t.id = tm.team_id
    WHERE m.processing_status = 'completed'
      AND m.member_id IS NOT NULL
      AND (_workspace_id IS NULL OR t.workspace_id = _workspace_id)
  ),
  ins AS (
    INSERT INTO public.context_evidence (
      workspace_id, member_id, source_table, source_id, evidence_type,
      occurred_at, title, summary, tags, actor_user_id, visibility, metadata
    )
    SELECT t.workspace_id, src.member_id, 'meeting_transcripts', src.id, 'meeting',
      src.created_at, 'Reunião 1:1',
      COALESCE(src.leader_notes, NULLIF(array_to_string(src.extracted_themes,', '),''), LEFT(COALESCE(src.transcript,''),400)),
      COALESCE(src.extracted_themes, '{}'),
      src.manager_id, 'private_leader',
      jsonb_build_object(
        'duration_seconds', src.duration_seconds,
        'commitments', COALESCE(to_jsonb(src.extracted_commitments), '[]'::jsonb)
      )
    FROM src
    JOIN public.team_members tm ON tm.id = src.member_id
    JOIN public.teams t ON t.id = tm.team_id
    ON CONFLICT (source_table, source_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;
  v_counts := v_counts || jsonb_build_object('meetings', v_count);

  -- Slack ambient (approved/converted)
  WITH ins AS (
    INSERT INTO public.context_evidence (
      workspace_id, member_id, source_table, source_id, evidence_type,
      occurred_at, title, summary, sentiment, tags, actor_user_id, visibility, metadata
    )
    SELECT s.workspace_id, s.member_id, 'slack_ambient_evidence', s.id, 'slack_signal',
      s.captured_at, 'Sinal do Slack: ' || s.category::text,
      COALESCE(s.summary, LEFT(s.message_text, 400)),
      CASE s.category::text
        WHEN 'reconhecimento' THEN 'positive'
        WHEN 'entrega' THEN 'positive'
        WHEN 'bloqueio' THEN 'warning'
        WHEN 'conflito' THEN 'warning'
        ELSE 'neutral' END,
      ARRAY['slack', s.category::text],
      s.manager_id, 'private_leader',
      jsonb_build_object(
        'slack_channel_id', s.slack_channel_id,
        'slack_channel_name', s.slack_channel_name,
        'permalink', s.permalink,
        'relevance_score', s.relevance_score
      )
    FROM public.slack_ambient_evidence s
    WHERE s.status IN ('approved','converted_to_feedback')
      AND (_workspace_id IS NULL OR s.workspace_id = _workspace_id)
    ON CONFLICT (source_table, source_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;
  v_counts := v_counts || jsonb_build_object('slack_signals', v_count);

  -- Kudos
  WITH ins AS (
    INSERT INTO public.context_evidence (
      workspace_id, member_id, source_table, source_id, evidence_type,
      occurred_at, title, summary, sentiment, tags, actor_user_id, visibility, metadata
    )
    SELECT k.workspace_id, k.to_member_id, 'kudos', k.id, 'kudo',
      COALESCE(k.created_at, now()), 'Kudo recebido',
      LEFT(k.message, 400), 'positive',
      CASE WHEN k.company_value IS NOT NULL THEN ARRAY['kudo', k.company_value] ELSE ARRAY['kudo'] END,
      k.from_user_id, 'shared',
      jsonb_build_object('company_value', k.company_value, 'slack_channel_id', k.slack_channel_id)
    FROM public.kudos k
    WHERE _workspace_id IS NULL OR k.workspace_id = _workspace_id
    ON CONFLICT (source_table, source_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;
  v_counts := v_counts || jsonb_build_object('kudos', v_count);

  -- Pulse responses (only those shared with leader)
  WITH src AS (
    SELECT mp.* FROM public.member_prompts mp
    JOIN public.team_members tm ON tm.id = mp.member_id
    JOIN public.teams t ON t.id = tm.team_id
    WHERE mp.answered_at IS NOT NULL
      AND mp.response IS NOT NULL
      AND mp.shared_with_leader = true
      AND (_workspace_id IS NULL OR t.workspace_id = _workspace_id)
  ),
  ins AS (
    INSERT INTO public.context_evidence (
      workspace_id, member_id, source_table, source_id, evidence_type,
      occurred_at, title, summary, tags, actor_user_id, visibility, metadata
    )
    SELECT t.workspace_id, src.member_id, 'member_prompts', src.id, 'pulse_response',
      src.answered_at, 'Pulse: ' || src.prompt_key,
      LEFT(src.response, 500),
      ARRAY['pulse', src.prompt_key],
      src.linked_user_id, 'shared',
      jsonb_build_object('prompt_key', src.prompt_key, 'prompt_text', src.prompt_text, 'week_starting', src.week_starting)
    FROM src
    JOIN public.team_members tm ON tm.id = src.member_id
    JOIN public.teams t ON t.id = tm.team_id
    ON CONFLICT (source_table, source_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;
  v_counts := v_counts || jsonb_build_object('pulse_responses', v_count);

  -- Goals (current state)
  WITH src AS (
    SELECT g.* FROM public.goals g
    JOIN public.team_members tm ON tm.id = g.member_id
    JOIN public.teams t ON t.id = tm.team_id
    WHERE _workspace_id IS NULL OR t.workspace_id = _workspace_id
  ),
  ins AS (
    INSERT INTO public.context_evidence (
      workspace_id, member_id, source_table, source_id, evidence_type,
      occurred_at, title, summary, sentiment, tags, visibility, metadata
    )
    SELECT t.workspace_id, src.member_id, 'goals', src.id, 'goal_event',
      COALESCE(src.completed_at, src.updated_at, now()),
      CASE src.status
        WHEN 'completed' THEN 'Meta concluída: ' || src.title
        WHEN 'archived' THEN 'Meta arquivada: ' || src.title
        ELSE 'Meta criada: ' || src.title END,
      COALESCE(src.description, src.title),
      CASE WHEN src.status = 'completed' THEN 'positive' ELSE 'neutral' END,
      ARRAY['goal', src.status],
      'shared',
      jsonb_build_object(
        'status', src.status,
        'event_type', src.status,
        'metric_current', src.metric_current,
        'metric_target', src.metric_target,
        'metric_unit', src.metric_unit,
        'target_date', src.target_date
      )
    FROM src
    JOIN public.team_members tm ON tm.id = src.member_id
    JOIN public.teams t ON t.id = tm.team_id
    ON CONFLICT (source_table, source_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;
  v_counts := v_counts || jsonb_build_object('goals', v_count);

  -- Performance reviews (only shared)
  WITH src AS (
    SELECT pr.* FROM public.performance_reviews pr
    JOIN public.team_members tm ON tm.id = pr.member_id
    JOIN public.teams t ON t.id = tm.team_id
    WHERE pr.shared_with_member = true
      AND (_workspace_id IS NULL OR t.workspace_id = _workspace_id)
  ),
  ins AS (
    INSERT INTO public.context_evidence (
      workspace_id, member_id, source_table, source_id, evidence_type,
      occurred_at, title, summary, tags, visibility, metadata
    )
    SELECT t.workspace_id, src.member_id, 'performance_reviews', src.id, 'review_excerpt',
      COALESCE(src.sent_at, src.updated_at, src.created_at),
      src.title,
      LEFT(regexp_replace(src.content, '<[^>]+>', ' ', 'g'), 600),
      ARRAY['review', COALESCE(src.period_type, 'manual')],
      'shared',
      jsonb_build_object(
        'period_type', src.period_type,
        'period_start', src.period_start,
        'period_end', src.period_end,
        'classification', src.classification,
        'evidence_count', src.evidence_count
      )
    FROM src
    JOIN public.team_members tm ON tm.id = src.member_id
    JOIN public.teams t ON t.id = tm.team_id
    ON CONFLICT (source_table, source_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;
  v_counts := v_counts || jsonb_build_object('reviews', v_count);

  -- Leader nudges (not dismissed)
  WITH src AS (
    SELECT n.* FROM public.leader_nudges n
    JOIN public.team_members tm ON tm.id = n.member_id
    JOIN public.teams t ON t.id = tm.team_id
    WHERE n.dismissed_at IS NULL
      AND n.member_id IS NOT NULL
      AND (_workspace_id IS NULL OR t.workspace_id = _workspace_id)
  ),
  ins AS (
    INSERT INTO public.context_evidence (
      workspace_id, member_id, source_table, source_id, evidence_type,
      occurred_at, title, summary, sentiment, tags, actor_user_id, visibility, metadata
    )
    SELECT t.workspace_id, src.member_id, 'leader_nudges', src.id, 'nudge',
      COALESCE(src.created_at, now()),
      'Nudge: ' || src.nudge_type,
      LEFT(src.message, 400),
      CASE src.severity WHEN 'warning' THEN 'warning' WHEN 'critical' THEN 'warning' ELSE 'neutral' END,
      ARRAY['nudge', src.nudge_type],
      src.leader_id, 'private_leader',
      jsonb_build_object('nudge_type', src.nudge_type, 'severity', src.severity, 'action_url', src.action_url)
    FROM src
    JOIN public.team_members tm ON tm.id = src.member_id
    JOIN public.teams t ON t.id = tm.team_id
    ON CONFLICT (source_table, source_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;
  v_counts := v_counts || jsonb_build_object('nudges', v_count);

  RETURN jsonb_build_object('inserted', v_counts, 'workspace_id', _workspace_id, 'ran_at', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_context_evidence(uuid) TO authenticated;