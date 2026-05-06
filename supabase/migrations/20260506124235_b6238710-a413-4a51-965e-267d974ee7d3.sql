
CREATE TABLE public.peer_feedback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  leader_user_id uuid NOT NULL,
  subject_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  peer_user_id uuid NOT NULL,
  peer_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  edge_strength_at_request numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','answered','declined','expired')),
  response_text text,
  sent_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX peer_feedback_requests_subject_idx
  ON public.peer_feedback_requests (subject_member_id, created_at DESC);
CREATE INDEX peer_feedback_requests_peer_idx
  ON public.peer_feedback_requests (peer_user_id, status);
CREATE INDEX peer_feedback_requests_leader_idx
  ON public.peer_feedback_requests (leader_user_id, created_at DESC);
CREATE INDEX peer_feedback_requests_pair_idx
  ON public.peer_feedback_requests (subject_member_id, peer_user_id, created_at DESC);

ALTER TABLE public.peer_feedback_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leader reads requests for their team"
  ON public.peer_feedback_requests FOR SELECT TO authenticated
  USING (
    leader_user_id = effective_user_id()
    OR is_team_leader(effective_user_id(), subject_member_id)
    OR is_workspace_owner_of_member(subject_member_id)
  );

CREATE POLICY "Peer reads own request"
  ON public.peer_feedback_requests FOR SELECT TO authenticated
  USING (peer_user_id = auth.uid());

CREATE POLICY "Peer answers own request"
  ON public.peer_feedback_requests FOR UPDATE TO authenticated
  USING (peer_user_id = auth.uid())
  WITH CHECK (peer_user_id = auth.uid());

CREATE POLICY "Service role full access on peer_feedback_requests"
  ON public.peer_feedback_requests FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER peer_feedback_requests_set_updated_at
  BEFORE UPDATE ON public.peer_feedback_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.peer_feedback_to_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_peer_name text;
BEGIN
  IF NEW.status = 'answered'
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.response_text IS NOT NULL
     AND length(trim(NEW.response_text)) > 0 THEN

    SELECT COALESCE(tm.name, 'Um colega')
      INTO v_peer_name
      FROM public.team_members tm
     WHERE tm.id = NEW.peer_member_id
     LIMIT 1;

    INSERT INTO public.context_evidence (
      workspace_id, member_id, source_table, source_id,
      evidence_type, occurred_at, title, summary,
      actor_user_id, visibility, tags, metadata
    ) VALUES (
      NEW.workspace_id,
      NEW.subject_member_id,
      'peer_feedback_requests',
      NEW.id,
      'peer_feedback',
      COALESCE(NEW.responded_at, now()),
      'Feedback de par' || COALESCE(' — ' || v_peer_name, ''),
      NEW.response_text,
      NEW.peer_user_id,
      'private_leader',
      ARRAY['peer_feedback'],
      jsonb_build_object(
        'peer_user_id', NEW.peer_user_id,
        'peer_member_id', NEW.peer_member_id,
        'peer_name', v_peer_name,
        'edge_strength', NEW.edge_strength_at_request
      )
    )
    ON CONFLICT (source_table, source_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER peer_feedback_requests_to_evidence
  AFTER UPDATE ON public.peer_feedback_requests
  FOR EACH ROW EXECUTE FUNCTION public.peer_feedback_to_evidence();
