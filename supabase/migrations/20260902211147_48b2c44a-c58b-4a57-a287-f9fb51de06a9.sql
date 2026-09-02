ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS ui_version text NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS bot_trial_hours_used numeric NOT NULL DEFAULT 0;

ALTER TABLE public.workspaces
  DROP CONSTRAINT IF EXISTS workspaces_ui_version_check;
ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_ui_version_check CHECK (ui_version IN ('v1','v2'));

CREATE TABLE IF NOT EXISTS public.seat_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.team_members(id) ON DELETE CASCADE,
  addon_type text NOT NULL DEFAULT 'bot',
  included_hours numeric NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'active',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  stripe_subscription_item_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seat_addons_type_check CHECK (addon_type IN ('bot')),
  CONSTRAINT seat_addons_status_check CHECK (status IN ('active','canceled','past_due')),
  CONSTRAINT seat_addons_cycle_check CHECK (billing_cycle IN ('monthly','annual'))
);

CREATE INDEX IF NOT EXISTS seat_addons_workspace_idx ON public.seat_addons(workspace_id) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS seat_addons_active_member_uidx
  ON public.seat_addons(workspace_id, member_id, addon_type)
  WHERE status = 'active' AND member_id IS NOT NULL;

GRANT SELECT ON public.seat_addons TO authenticated;
GRANT ALL ON public.seat_addons TO service_role;

ALTER TABLE public.seat_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seat_addons_select_workspace"
  ON public.seat_addons FOR SELECT TO authenticated
  USING (public.is_workspace_participant(workspace_id));

CREATE OR REPLACE FUNCTION public.set_seat_addons_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seat_addons_set_updated_at ON public.seat_addons;
CREATE TRIGGER seat_addons_set_updated_at
  BEFORE UPDATE ON public.seat_addons
  FOR EACH ROW EXECUTE FUNCTION public.set_seat_addons_updated_at();

DROP FUNCTION IF EXISTS public.get_bot_hours_usage();
CREATE FUNCTION public.get_bot_hours_usage()
RETURNS TABLE (
  hours_used numeric,
  hours_cap numeric,
  paid_seats integer,
  unlimited boolean,
  trial_hours_remaining numeric,
  addon_hours numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_ws uuid[];
  v_beta boolean := false;
  v_seats integer := 0;
  v_used numeric := 0;
  v_trial_used numeric := 0;
  v_trial_left numeric := 0;
  v_addon numeric := 0;
  v_trial_total constant numeric := 5;
BEGIN
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  SELECT array_agg(DISTINCT w.id),
         bool_or(coalesce(w.is_beta_user, false)
                 OR (w.grandfather_until IS NOT NULL AND w.grandfather_until >= current_date)),
         coalesce(max(coalesce(w.paid_seats, 0)), 0),
         coalesce(max(coalesce(w.bot_trial_hours_used, 0)), 0)
    INTO v_ws, v_beta, v_seats, v_trial_used
  FROM public.workspaces w
  WHERE w.owner_id = v_user
     OR w.id IN (SELECT t.workspace_id FROM public.teams t WHERE t.leader_user_id = v_user);

  IF v_ws IS NULL THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric, 0, false, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  SELECT coalesce(sum(b.machine_minutes), 0) / 60.0
    INTO v_used
  FROM public.bot_usage_events b
  WHERE b.workspace_id = ANY(v_ws)
    AND b.created_at >= date_trunc('month', now());

  SELECT coalesce(sum(sa.included_hours), 0)
    INTO v_addon
  FROM public.seat_addons sa
  WHERE sa.workspace_id = ANY(v_ws)
    AND sa.status = 'active'
    AND sa.addon_type = 'bot';

  v_trial_left := greatest(0, v_trial_total - v_trial_used);

  RETURN QUERY SELECT
    round(v_used, 2),
    round(v_addon + v_trial_left, 2),
    v_seats,
    coalesce(v_beta, false),
    round(v_trial_left, 2),
    round(v_addon, 2);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_bot_hours_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bot_hours_usage() TO service_role;