-- 1) Add structured calibration fields to performance_reviews
ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS classification text,
  ADD COLUMN IF NOT EXISTS promotion_recommendation text,
  ADD COLUMN IF NOT EXISTS loss_risk text,
  ADD COLUMN IF NOT EXISTS merit_recommendation text;

-- Soft validation constraints (NULL allowed = "not yet calibrated")
ALTER TABLE public.performance_reviews
  DROP CONSTRAINT IF EXISTS performance_reviews_classification_check;
ALTER TABLE public.performance_reviews
  ADD CONSTRAINT performance_reviews_classification_check
  CHECK (classification IS NULL OR classification IN ('precisa_subir','dentro_esperado','subindo_barra','acima_esperado'));

ALTER TABLE public.performance_reviews
  DROP CONSTRAINT IF EXISTS performance_reviews_promotion_check;
ALTER TABLE public.performance_reviews
  ADD CONSTRAINT performance_reviews_promotion_check
  CHECK (promotion_recommendation IS NULL OR promotion_recommendation IN ('not_now','in_1_2_cycles','ready_now'));

ALTER TABLE public.performance_reviews
  DROP CONSTRAINT IF EXISTS performance_reviews_loss_risk_check;
ALTER TABLE public.performance_reviews
  ADD CONSTRAINT performance_reviews_loss_risk_check
  CHECK (loss_risk IS NULL OR loss_risk IN ('low','medium','high'));

ALTER TABLE public.performance_reviews
  DROP CONSTRAINT IF EXISTS performance_reviews_merit_check;
ALTER TABLE public.performance_reviews
  ADD CONSTRAINT performance_reviews_merit_check
  CHECK (merit_recommendation IS NULL OR merit_recommendation IN ('none','inflation_only','inflation_plus_merit'));

-- 2) Auto-nudge: when 3rd monthly recap of a quarter is confirmed,
-- create a leader_nudge inviting the leader to generate the quarterly.
CREATE OR REPLACE FUNCTION public.notify_leader_quarterly_ready()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q_start date;
  q_end date;
  confirmed_count int;
  existing_quarterly uuid;
  existing_nudge uuid;
  member_name text;
BEGIN
  -- Only react when status transitions to confirmed
  IF NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- Compute the quarter window for the confirmed period_month
  q_start := date_trunc('quarter', NEW.period_month)::date;
  q_end   := (q_start + interval '3 months')::date;

  SELECT count(*) INTO confirmed_count
    FROM public.monthly_recaps
   WHERE member_id = NEW.member_id
     AND status = 'confirmed'
     AND period_month >= q_start
     AND period_month < q_end;

  IF confirmed_count < 3 THEN
    RETURN NEW;
  END IF;

  -- Check if quarterly already exists/confirmed (skip nudge if so)
  SELECT id INTO existing_quarterly
    FROM public.quarterly_recaps
   WHERE member_id = NEW.member_id
     AND period_quarter = q_start
   LIMIT 1;

  IF existing_quarterly IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- De-dupe nudge by checking same leader+member+type in last 7 days
  SELECT id INTO existing_nudge
    FROM public.leader_nudges
   WHERE leader_id = NEW.manager_id
     AND member_id = NEW.member_id
     AND nudge_type = 'quarterly_ready'
     AND created_at > now() - interval '7 days'
   LIMIT 1;

  IF existing_nudge IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO member_name FROM public.team_members WHERE id = NEW.member_id;

  INSERT INTO public.leader_nudges (
    leader_id, member_id, nudge_type, severity, message, action_url
  ) VALUES (
    NEW.manager_id,
    NEW.member_id,
    'quarterly_ready',
    'info',
    'Você confirmou 3 mensais de ' || COALESCE(member_name, 'um liderado') || ' — o Rhitmo Trimestral está pronto para gerar.',
    '/member/' || NEW.member_id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_quarterly_ready ON public.monthly_recaps;
CREATE TRIGGER trg_notify_quarterly_ready
AFTER INSERT OR UPDATE OF status ON public.monthly_recaps
FOR EACH ROW
EXECUTE FUNCTION public.notify_leader_quarterly_ready();