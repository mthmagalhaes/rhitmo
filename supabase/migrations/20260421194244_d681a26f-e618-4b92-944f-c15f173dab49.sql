
-- 1) Coluna low_evidence
ALTER TABLE public.monthly_recaps
  ADD COLUMN IF NOT EXISTS low_evidence boolean NOT NULL DEFAULT false;

-- 2) Trigger validação confirm mensal
CREATE OR REPLACE FUNCTION public.validate_monthly_recap_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    IF NEW.dominant_pattern IS NULL OR length(trim(NEW.dominant_pattern)) = 0 THEN
      RAISE EXCEPTION 'Não é possível confirmar o mensal sem preencher o padrão do mês.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_monthly_recap_confirm ON public.monthly_recaps;
CREATE TRIGGER trg_validate_monthly_recap_confirm
  BEFORE UPDATE ON public.monthly_recaps
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_monthly_recap_confirm();

-- 3) Trigger validação confirm trimestral
CREATE OR REPLACE FUNCTION public.validate_quarterly_recap_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    IF NEW.classification IS NULL THEN
      RAISE EXCEPTION 'Não é possível confirmar o trimestral sem classificação.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.turnover_risk IS NULL THEN
      RAISE EXCEPTION 'Não é possível confirmar o trimestral sem definir o risco de turnover.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.next_action_key IS NULL OR length(trim(NEW.next_action_key)) = 0 THEN
      RAISE EXCEPTION 'Não é possível confirmar o trimestral sem definir a próxima ação.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_quarterly_recap_confirm ON public.quarterly_recaps;
CREATE TRIGGER trg_validate_quarterly_recap_confirm
  BEFORE UPDATE ON public.quarterly_recaps
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_quarterly_recap_confirm();
