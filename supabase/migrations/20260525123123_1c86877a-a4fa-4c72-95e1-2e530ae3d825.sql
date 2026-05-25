
-- Tabela de tickets de suporte interno
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  opened_by uuid NOT NULL,
  affected_user_email text,
  affected_user_id uuid,
  workspace_id uuid,
  category text NOT NULL CHECK (category IN ('bug','duvida_uso','regressao','dado_inconsistente','feature_request','outro')),
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating','needs_more_info','diagnosed','resolved','wont_fix','duplicate')),
  title text NOT NULL,
  symptom text,
  hypothesis text,
  root_cause text,
  resolution_proposal text,
  resolution_summary text,
  route text,
  edge_functions text[] NOT NULL DEFAULT '{}',
  files_touched text[] NOT NULL DEFAULT '{}',
  memory_refs text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX support_tickets_status_idx ON public.support_tickets(status);
CREATE INDEX support_tickets_severity_idx ON public.support_tickets(severity);
CREATE INDEX support_tickets_created_at_idx ON public.support_tickets(created_at DESC);
CREATE INDEX support_tickets_affected_user_idx ON public.support_tickets(affected_user_email);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage support tickets"
ON public.support_tickets
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE TRIGGER support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sequência por ano/mês para o ticket_number
CREATE TABLE public.support_ticket_counters (
  yymm text PRIMARY KEY,
  seq integer NOT NULL DEFAULT 0
);

ALTER TABLE public.support_ticket_counters ENABLE ROW LEVEL SECURITY;

-- Abre ticket (super admin only)
CREATE OR REPLACE FUNCTION public.support_ticket_open(payload jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_yymm text := to_char(now(), 'YYMM');
  v_seq integer;
  v_number text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden: super admin only';
  END IF;

  INSERT INTO support_ticket_counters(yymm, seq) VALUES (v_yymm, 1)
  ON CONFLICT (yymm) DO UPDATE SET seq = support_ticket_counters.seq + 1
  RETURNING seq INTO v_seq;

  v_number := 'TKT-' || v_yymm || '-' || lpad(v_seq::text, 4, '0');

  INSERT INTO support_tickets (
    ticket_number, opened_by,
    affected_user_email, affected_user_id, workspace_id,
    category, severity, status,
    title, symptom, hypothesis,
    route, edge_functions, files_touched, memory_refs, tags, metadata
  ) VALUES (
    v_number, auth.uid(),
    NULLIF(payload->>'affected_user_email',''),
    NULLIF(payload->>'affected_user_id','')::uuid,
    NULLIF(payload->>'workspace_id','')::uuid,
    COALESCE(payload->>'category','outro'),
    COALESCE(payload->>'severity','medium'),
    COALESCE(payload->>'status','investigating'),
    COALESCE(payload->>'title','(sem título)'),
    payload->>'symptom',
    payload->>'hypothesis',
    payload->>'route',
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(payload->'edge_functions')), '{}'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(payload->'files_touched')), '{}'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(payload->'memory_refs')), '{}'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(payload->'tags')), '{}'),
    COALESCE(payload->'metadata', '{}'::jsonb)
  );

  RETURN v_number;
END;
$$;

-- Atualiza ticket via patch JSON
CREATE OR REPLACE FUNCTION public.support_ticket_update(p_ticket_number text, patch jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden: super admin only';
  END IF;

  v_new_status := patch->>'status';

  UPDATE support_tickets SET
    category = COALESCE(patch->>'category', category),
    severity = COALESCE(patch->>'severity', severity),
    status = COALESCE(v_new_status, status),
    title = COALESCE(patch->>'title', title),
    symptom = COALESCE(patch->>'symptom', symptom),
    hypothesis = COALESCE(patch->>'hypothesis', hypothesis),
    root_cause = COALESCE(patch->>'root_cause', root_cause),
    resolution_proposal = COALESCE(patch->>'resolution_proposal', resolution_proposal),
    resolution_summary = COALESCE(patch->>'resolution_summary', resolution_summary),
    route = COALESCE(patch->>'route', route),
    affected_user_email = COALESCE(NULLIF(patch->>'affected_user_email',''), affected_user_email),
    affected_user_id = COALESCE(NULLIF(patch->>'affected_user_id','')::uuid, affected_user_id),
    workspace_id = COALESCE(NULLIF(patch->>'workspace_id','')::uuid, workspace_id),
    edge_functions = CASE WHEN patch ? 'edge_functions'
      THEN COALESCE(ARRAY(SELECT jsonb_array_elements_text(patch->'edge_functions')), '{}')
      ELSE edge_functions END,
    files_touched = CASE WHEN patch ? 'files_touched'
      THEN COALESCE(ARRAY(SELECT jsonb_array_elements_text(patch->'files_touched')), '{}')
      ELSE files_touched END,
    memory_refs = CASE WHEN patch ? 'memory_refs'
      THEN COALESCE(ARRAY(SELECT jsonb_array_elements_text(patch->'memory_refs')), '{}')
      ELSE memory_refs END,
    tags = CASE WHEN patch ? 'tags'
      THEN COALESCE(ARRAY(SELECT jsonb_array_elements_text(patch->'tags')), '{}')
      ELSE tags END,
    metadata = CASE WHEN patch ? 'metadata'
      THEN metadata || (patch->'metadata')
      ELSE metadata END,
    resolved_at = CASE WHEN v_new_status = 'resolved' AND resolved_at IS NULL THEN now()
      WHEN v_new_status IS NOT NULL AND v_new_status <> 'resolved' THEN NULL
      ELSE resolved_at END
  WHERE ticket_number = p_ticket_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ticket % not found', p_ticket_number;
  END IF;
END;
$$;
