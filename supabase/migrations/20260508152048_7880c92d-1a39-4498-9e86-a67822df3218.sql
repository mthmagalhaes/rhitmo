
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS grandfather_until DATE,
  ADD COLUMN IF NOT EXISTS paid_seats INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seat_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (seat_cycle IN ('monthly','annual'));

-- Grandfather all currently existing workspaces for 6 months
UPDATE public.workspaces
SET grandfather_until = DATE '2026-11-08'
WHERE grandfather_until IS NULL;

-- Helper function used by usePlanLimits and gating logic
CREATE OR REPLACE FUNCTION public.get_seat_allowance(_workspace_id UUID)
RETURNS TABLE (
  free_seats INTEGER,
  paid_seats INTEGER,
  total_seats INTEGER,
  is_grandfathered BOOLEAN,
  recall_unlimited BOOLEAN,
  recall_cap_hours INTEGER,
  grandfather_until DATE,
  seat_cycle TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w RECORD;
  _is_grandfathered BOOLEAN;
BEGIN
  SELECT w2.paid_seats, w2.grandfather_until, w2.seat_cycle
    INTO w
    FROM public.workspaces w2
   WHERE w2.id = _workspace_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  _is_grandfathered := (w.grandfather_until IS NOT NULL AND w.grandfather_until >= CURRENT_DATE);

  free_seats := 3;
  paid_seats := COALESCE(w.paid_seats, 0);
  total_seats := CASE WHEN _is_grandfathered THEN 9999 ELSE free_seats + paid_seats END;
  is_grandfathered := _is_grandfathered;
  recall_unlimited := _is_grandfathered OR paid_seats > 0;
  recall_cap_hours := CASE WHEN recall_unlimited THEN 9999 ELSE 6 END;
  grandfather_until := w.grandfather_until;
  seat_cycle := w.seat_cycle;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_seat_allowance(UUID) TO authenticated;
