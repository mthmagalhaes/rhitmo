-- Sprint 10.1 — Fundação 360° (Self / Peer / Manager / Upwards)
-- Adiciona suporte a 4 ângulos de avaliação em performance_reviews + tabela review_peers
-- Mantém retrocompatibilidade total com reviews tipo 'manager' existentes

-- ============================================================
-- 1) ALTER performance_reviews — adicionar review_type + author_user_id
-- ============================================================

ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS review_type text NOT NULL DEFAULT 'manager';

ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS author_user_id uuid;

ALTER TABLE public.performance_reviews
  DROP CONSTRAINT IF EXISTS performance_reviews_review_type_check;

ALTER TABLE public.performance_reviews
  ADD CONSTRAINT performance_reviews_review_type_check
  CHECK (review_type IN ('manager','self','peer','upwards'));

CREATE INDEX IF NOT EXISTS idx_perf_reviews_member_type
  ON public.performance_reviews(member_id, review_type);

CREATE INDEX IF NOT EXISTS idx_perf_reviews_author
  ON public.performance_reviews(author_user_id)
  WHERE author_user_id IS NOT NULL;

-- ============================================================
-- 2) Nova tabela review_peers
-- ============================================================

CREATE TABLE IF NOT EXISTS public.review_peers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  peer_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','declined','expired')),
  response_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  invited_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, peer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_peers_review ON public.review_peers(review_id);
CREATE INDEX IF NOT EXISTS idx_review_peers_peer ON public.review_peers(peer_user_id);
CREATE INDEX IF NOT EXISTS idx_review_peers_status ON public.review_peers(status) WHERE status = 'pending';

ALTER TABLE public.review_peers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3) RLS em performance_reviews — adições para self/upwards
-- ============================================================

DROP POLICY IF EXISTS "Linked members can view own self upwards reviews" ON public.performance_reviews;
CREATE POLICY "Linked members can view own self upwards reviews"
ON public.performance_reviews
FOR SELECT
TO authenticated
USING (
  author_user_id = auth.uid()
  AND review_type IN ('self','upwards')
);

DROP POLICY IF EXISTS "Linked members can insert own self upwards reviews" ON public.performance_reviews;
CREATE POLICY "Linked members can insert own self upwards reviews"
ON public.performance_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND review_type IN ('self','upwards')
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.linked_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Linked members can update own self upwards reviews" ON public.performance_reviews;
CREATE POLICY "Linked members can update own self upwards reviews"
ON public.performance_reviews
FOR UPDATE
TO authenticated
USING (
  author_user_id = auth.uid()
  AND review_type IN ('self','upwards')
)
WITH CHECK (
  author_user_id = auth.uid()
  AND review_type IN ('self','upwards')
);

-- Membro também pode ver peer reviews compartilhadas a seu respeito
DROP POLICY IF EXISTS "Linked members can view shared peer upwards about them" ON public.performance_reviews;
CREATE POLICY "Linked members can view shared peer upwards about them"
ON public.performance_reviews
FOR SELECT
TO authenticated
USING (
  shared_with_member = true
  AND review_type IN ('peer','upwards')
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.id = performance_reviews.member_id
      AND tm.linked_user_id = auth.uid()
  )
);

-- ============================================================
-- 4) Trigger de integridade — restringir colunas em self/upwards updates do membro
-- ============================================================

CREATE OR REPLACE FUNCTION public.performance_reviews_restrict_self_upwards_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas aplica se quem está atualizando é o próprio autor (membro) e a review é self/upwards
  -- e NÃO é líder do membro (líder/owner pode tudo via outras policies)
  IF NEW.review_type IN ('self','upwards')
     AND OLD.author_user_id = auth.uid()
     AND NOT public.is_team_leader(auth.uid(), OLD.member_id)
     AND NOT public.is_workspace_owner_of_member(OLD.member_id)
     AND NOT public.is_admin()
  THEN
    -- Bloquear mudança em campos sensíveis
    IF NEW.member_id IS DISTINCT FROM OLD.member_id THEN
      RAISE EXCEPTION 'Cannot change member_id on self/upwards review';
    END IF;
    IF NEW.review_type IS DISTINCT FROM OLD.review_type THEN
      RAISE EXCEPTION 'Cannot change review_type on self/upwards review';
    END IF;
    IF NEW.author_user_id IS DISTINCT FROM OLD.author_user_id THEN
      RAISE EXCEPTION 'Cannot change author_user_id';
    END IF;
    IF NEW.classification IS DISTINCT FROM OLD.classification
       OR NEW.loss_risk IS DISTINCT FROM OLD.loss_risk
       OR NEW.merit_recommendation IS DISTINCT FROM OLD.merit_recommendation
       OR NEW.promotion_recommendation IS DISTINCT FROM OLD.promotion_recommendation
    THEN
      RAISE EXCEPTION 'Calibration fields are leader-only on self/upwards reviews';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_perf_reviews_restrict_self_upwards ON public.performance_reviews;
CREATE TRIGGER trg_perf_reviews_restrict_self_upwards
  BEFORE UPDATE ON public.performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.performance_reviews_restrict_self_upwards_update();

-- ============================================================
-- 5) RLS em review_peers
-- ============================================================

-- SELECT: peer próprio, líder do membro avaliado, owner, HR admin, super admin
DROP POLICY IF EXISTS "review_peers_select" ON public.review_peers;
CREATE POLICY "review_peers_select"
ON public.review_peers
FOR SELECT
TO authenticated
USING (
  peer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.performance_reviews pr
    WHERE pr.id = review_peers.review_id
      AND (
        public.is_team_leader(auth.uid(), pr.member_id)
        OR public.is_workspace_owner_of_member(pr.member_id)
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

-- INSERT: somente líder do membro avaliado (ou owner)
DROP POLICY IF EXISTS "review_peers_insert_leader" ON public.review_peers;
CREATE POLICY "review_peers_insert_leader"
ON public.review_peers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.performance_reviews pr
    WHERE pr.id = review_peers.review_id
      AND (
        public.is_team_leader(auth.uid(), pr.member_id)
        OR public.is_workspace_owner_of_member(pr.member_id)
      )
  )
);

-- UPDATE: peer (constrito por trigger) ou líder/owner (livre)
DROP POLICY IF EXISTS "review_peers_update" ON public.review_peers;
CREATE POLICY "review_peers_update"
ON public.review_peers
FOR UPDATE
TO authenticated
USING (
  peer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.performance_reviews pr
    WHERE pr.id = review_peers.review_id
      AND (
        public.is_team_leader(auth.uid(), pr.member_id)
        OR public.is_workspace_owner_of_member(pr.member_id)
      )
  )
);

-- DELETE: somente líder/owner
DROP POLICY IF EXISTS "review_peers_delete_leader" ON public.review_peers;
CREATE POLICY "review_peers_delete_leader"
ON public.review_peers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.performance_reviews pr
    WHERE pr.id = review_peers.review_id
      AND (
        public.is_team_leader(auth.uid(), pr.member_id)
        OR public.is_workspace_owner_of_member(pr.member_id)
      )
  )
);

-- ============================================================
-- 6) Trigger de integridade em review_peers — peer só edita campos próprios
-- ============================================================

CREATE OR REPLACE FUNCTION public.review_peers_restrict_peer_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_leader_or_owner boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.performance_reviews pr
    WHERE pr.id = OLD.review_id
      AND (
        public.is_team_leader(auth.uid(), pr.member_id)
        OR public.is_workspace_owner_of_member(pr.member_id)
      )
  ) INTO v_is_leader_or_owner;

  -- Se é o peer (e não líder/owner/admin), restringe colunas
  IF OLD.peer_user_id = auth.uid()
     AND NOT v_is_leader_or_owner
     AND NOT public.is_admin()
  THEN
    IF NEW.review_id IS DISTINCT FROM OLD.review_id
       OR NEW.peer_user_id IS DISTINCT FROM OLD.peer_user_id
       OR NEW.invited_at IS DISTINCT FROM OLD.invited_at
    THEN
      RAISE EXCEPTION 'Peer cannot modify identity/invite metadata';
    END IF;
    -- Status só pode ir de pending → completed/declined
    IF NEW.status NOT IN ('pending','completed','declined') THEN
      RAISE EXCEPTION 'Peer can only set status to completed or declined';
    END IF;
    IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
      RAISE EXCEPTION 'Cannot revert completed peer review';
    END IF;
  END IF;

  -- Auto-set completed_at quando status vira completed
  IF NEW.status = 'completed' AND OLD.status <> 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_peers_restrict_peer ON public.review_peers;
CREATE TRIGGER trg_review_peers_restrict_peer
  BEFORE UPDATE ON public.review_peers
  FOR EACH ROW
  EXECUTE FUNCTION public.review_peers_restrict_peer_update();

-- Validação de workspace match em INSERT (peer deve estar no mesmo workspace do membro)
CREATE OR REPLACE FUNCTION public.review_peers_validate_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_workspace uuid;
  v_peer_in_workspace boolean;
BEGIN
  SELECT t.workspace_id INTO v_member_workspace
  FROM public.performance_reviews pr
  JOIN public.team_members tm ON tm.id = pr.member_id
  JOIN public.teams t ON t.id = tm.team_id
  WHERE pr.id = NEW.review_id;

  IF v_member_workspace IS NULL THEN
    RAISE EXCEPTION 'Review or member team workspace not resolvable';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE t.workspace_id = v_member_workspace
      AND tm.linked_user_id = NEW.peer_user_id
    UNION
    SELECT 1 FROM public.workspaces w
    WHERE w.id = v_member_workspace
      AND (w.owner_id = NEW.peer_user_id
           OR NEW.peer_user_id = ANY(COALESCE(w.hr_admin_ids, '{}'::uuid[])))
    UNION
    SELECT 1 FROM public.teams t
    WHERE t.workspace_id = v_member_workspace
      AND t.leader_user_id = NEW.peer_user_id
  ) INTO v_peer_in_workspace;

  IF NOT v_peer_in_workspace THEN
    RAISE EXCEPTION 'Peer user is not part of the same workspace as the reviewed member';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_peers_validate_workspace ON public.review_peers;
CREATE TRIGGER trg_review_peers_validate_workspace
  BEFORE INSERT ON public.review_peers
  FOR EACH ROW
  EXECUTE FUNCTION public.review_peers_validate_workspace();

-- ============================================================
-- 7) Atualizar ctx_evidence_from_review para suportar review_type
-- ============================================================

CREATE OR REPLACE FUNCTION public.ctx_evidence_from_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace uuid;
  v_excerpt text;
  v_visibility text;
  v_should_emit boolean := false;
  v_type text;
BEGIN
  v_type := COALESCE(NEW.review_type, 'manager');

  -- Regras por tipo
  IF v_type = 'manager' THEN
    -- Comportamento legado: só compartilhada
    IF NEW.shared_with_member IS TRUE THEN
      v_should_emit := true;
      v_visibility := 'shared';
    END IF;
  ELSIF v_type = 'self' THEN
    -- Self review sempre vira evidência (visível ao líder)
    v_should_emit := true;
    v_visibility := COALESCE(
      CASE WHEN NEW.shared_with_member THEN 'shared' ELSE 'private_leader' END,
      'private_leader'
    );
  ELSIF v_type IN ('peer','upwards') THEN
    -- Peer/upwards só vira evidência quando explicitamente compartilhada
    IF NEW.shared_with_member IS TRUE THEN
      v_should_emit := true;
      v_visibility := 'shared';
    END IF;
  END IF;

  IF NOT v_should_emit THEN
    -- Se foi des-compartilhado, remover evidência existente (idempotente)
    DELETE FROM public.context_evidence
     WHERE source_table = 'performance_reviews' AND source_id = NEW.id;
    RETURN NEW;
  END IF;

  v_workspace := public._ctx_resolve_workspace(NEW.member_id);
  IF v_workspace IS NULL THEN
    RETURN NEW;
  END IF;

  v_excerpt := LEFT(regexp_replace(COALESCE(NEW.content,''), '<[^>]+>', ' ', 'g'), 600);

  INSERT INTO public.context_evidence (
    workspace_id, member_id, source_table, source_id, evidence_type,
    occurred_at, title, summary, tags, visibility, metadata
  ) VALUES (
    v_workspace, NEW.member_id, 'performance_reviews', NEW.id, 'review_excerpt',
    COALESCE(NEW.sent_at, NEW.updated_at, NEW.created_at),
    NEW.title,
    v_excerpt,
    ARRAY['review', v_type, COALESCE(NEW.period_type, 'manual')],
    v_visibility,
    jsonb_build_object(
      'review_type', v_type,
      'period_type', NEW.period_type,
      'period_start', NEW.period_start,
      'period_end', NEW.period_end,
      'classification', NEW.classification,
      'evidence_count', NEW.evidence_count,
      'author_user_id', NEW.author_user_id
    )
  )
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    title      = EXCLUDED.title,
    summary    = EXCLUDED.summary,
    tags       = EXCLUDED.tags,
    visibility = EXCLUDED.visibility,
    metadata   = EXCLUDED.metadata,
    occurred_at = EXCLUDED.occurred_at,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Recriar trigger incluindo review_type nas colunas observadas
DROP TRIGGER IF EXISTS trg_ctx_evidence_review ON public.performance_reviews;
CREATE TRIGGER trg_ctx_evidence_review
  AFTER INSERT OR UPDATE OF shared_with_member, content, title, sent_at, review_type
  ON public.performance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.ctx_evidence_from_review();
