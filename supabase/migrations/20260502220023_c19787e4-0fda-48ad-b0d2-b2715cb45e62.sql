
-- Pulse: dedicated page schema additions
-- Adiciona campos para suportar wizard de 5 passos + estrutura parent/child
-- (1 pulse-pai com N rows-filhas, uma por participante)

ALTER TABLE public.pulse_surveys
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS motivation text,
  ADD COLUMN IF NOT EXISTS anonymity text NOT NULL DEFAULT 'named',
  ADD COLUMN IF NOT EXISTS parent_pulse_id uuid REFERENCES public.pulse_surveys(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS launched_at timestamptz;

-- Garante que anonymity só aceita os valores válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pulse_surveys_anonymity_check'
  ) THEN
    ALTER TABLE public.pulse_surveys
      ADD CONSTRAINT pulse_surveys_anonymity_check
      CHECK (anonymity IN ('named','anonymous'));
  END IF;
END$$;

-- Atualiza o check de status para incluir 'draft' e 'active' (parent rows)
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.pulse_surveys'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.pulse_surveys DROP CONSTRAINT %I', cname);
  END IF;
END$$;

ALTER TABLE public.pulse_surveys
  ADD CONSTRAINT pulse_surveys_status_check
  CHECK (status IN ('draft','pending','active','completed','expired','closed'));

-- A trigger pulse_surveys_validate_workspace é executada antes do INSERT,
-- mas para parent rows (status='draft') o member_id é o próprio líder (placeholder).
-- Precisamos relaxar isso: parent rows usam member_id = qualquer liderado do workspace
-- só pra passar a constraint NOT NULL. Vamos permitir parent rows skipping a validação
-- de workspace (já validada pelo INSERT do líder).

CREATE OR REPLACE FUNCTION public.pulse_surveys_validate_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_workspace uuid;
BEGIN
  -- Skip validation para draft rows (parent template, sem participantes ainda).
  IF NEW.status = 'draft' AND NEW.parent_pulse_id IS NULL THEN
    RETURN NEW;
  END IF;

  resolved_workspace := public._ctx_resolve_workspace(NEW.member_id);
  IF resolved_workspace IS NULL THEN
    RAISE EXCEPTION 'Could not resolve workspace for member_id %', NEW.member_id;
  END IF;
  IF NEW.workspace_id <> resolved_workspace THEN
    RAISE EXCEPTION 'workspace_id mismatch for member_id %', NEW.member_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_pulse_surveys_parent_id
  ON public.pulse_surveys(parent_pulse_id) WHERE parent_pulse_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pulse_surveys_requested_by_status
  ON public.pulse_surveys(requested_by, status);
