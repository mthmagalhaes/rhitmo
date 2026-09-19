-- 1. Workspaces: trial + modelo de cobrança
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_model text NOT NULL DEFAULT 'v3';

UPDATE public.workspaces SET billing_model = 'legacy' WHERE billing_model = 'v3';

ALTER TABLE public.workspaces
  DROP CONSTRAINT IF EXISTS workspaces_billing_model_check;
ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_billing_model_check CHECK (billing_model IN ('v3', 'legacy'));

-- 2. Add-on de bot pode pertencer ao líder (em vez de a um liderado)
ALTER TABLE public.seat_addons
  ADD COLUMN IF NOT EXISTS leader_user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS seat_addons_leader_active_uniq
  ON public.seat_addons (workspace_id, leader_user_id, addon_type)
  WHERE status = 'active' AND leader_user_id IS NOT NULL;

-- 3. Trigger de trial vitalício só vale para o modelo legado
CREATE OR REPLACE FUNCTION public.consume_v2_bot_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ui_version text;
  v_billing_model text;
  v_has_addon boolean;
BEGIN
  IF NEW.workspace_id IS NULL OR COALESCE(NEW.machine_minutes, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT w.ui_version, w.billing_model INTO v_ui_version, v_billing_model
  FROM public.workspaces w WHERE w.id = NEW.workspace_id;

  IF v_billing_model = 'v3' OR v_ui_version IS DISTINCT FROM 'v2' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.seat_addons s
    WHERE s.workspace_id = NEW.workspace_id
      AND s.member_id = NEW.member_id
      AND s.addon_type = 'bot'
      AND s.status = 'active'
  ) INTO v_has_addon;

  IF v_has_addon THEN
    RETURN NEW;
  END IF;

  UPDATE public.workspaces
  SET bot_trial_hours_used = LEAST(5, COALESCE(bot_trial_hours_used, 0) + (NEW.machine_minutes / 60.0))
  WHERE id = NEW.workspace_id;

  RETURN NEW;
END;
$function$;

-- 4. Situação de cobrança do workspace (trial, assinatura, bloqueio)
CREATE OR REPLACE FUNCTION public.get_billing_status(p_workspace_id uuid)
RETURNS TABLE(
  workspace_id uuid,
  billing_model text,
  trial_ends_at timestamptz,
  days_left integer,
  trial_active boolean,
  has_subscription boolean,
  is_grandfathered boolean,
  locked boolean,
  seat_count integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ws public.workspaces%ROWTYPE;
  v_sub boolean;
  v_trial_active boolean;
  v_gf boolean;
  v_seats integer;
BEGIN
  IF NOT public.is_workspace_participant(p_workspace_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Sem permissão neste workspace';
  END IF;

  SELECT * INTO v_ws FROM public.workspaces w WHERE w.id = p_workspace_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.workspace_id = p_workspace_id
      AND s.status IN ('active', 'trialing', 'past_due')
  ) INTO v_sub;

  v_gf := v_ws.grandfather_until IS NOT NULL AND v_ws.grandfather_until >= CURRENT_DATE;
  v_trial_active := v_ws.trial_ends_at IS NOT NULL AND v_ws.trial_ends_at > now();

  SELECT COUNT(*) INTO v_seats
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE t.workspace_id = p_workspace_id AND tm.archived_at IS NULL;

  RETURN QUERY SELECT
    p_workspace_id,
    v_ws.billing_model,
    v_ws.trial_ends_at,
    GREATEST(0, CEIL(EXTRACT(EPOCH FROM (COALESCE(v_ws.trial_ends_at, now()) - now())) / 86400.0))::integer,
    v_trial_active,
    v_sub,
    v_gf,
    (v_ws.billing_model = 'v3' AND NOT v_sub AND NOT v_gf AND NOT v_trial_active),
    v_seats + 1;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_billing_status(uuid) TO authenticated;

-- 5. Add-on de bot por líder (modelo v3)
CREATE OR REPLACE FUNCTION public.get_leader_bot_addon(p_workspace_id uuid)
RETURNS TABLE(
  leader_user_id uuid,
  leader_name text,
  has_addon boolean,
  basis text,
  hours_cap numeric,
  hours_used numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ws public.workspaces%ROWTYPE;
  v_trial_active boolean;
  v_gf boolean;
BEGIN
  IF NOT public.is_workspace_participant(p_workspace_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Sem permissão neste workspace';
  END IF;

  SELECT * INTO v_ws FROM public.workspaces w WHERE w.id = p_workspace_id;
  v_gf := v_ws.grandfather_until IS NOT NULL AND v_ws.grandfather_until >= CURRENT_DATE;
  v_trial_active := v_ws.trial_ends_at IS NOT NULL AND v_ws.trial_ends_at > now();

  RETURN QUERY
  WITH leaders AS (
    SELECT DISTINCT t.leader_user_id AS uid
    FROM public.teams t
    WHERE t.workspace_id = p_workspace_id AND t.leader_user_id IS NOT NULL
  )
  SELECT
    l.uid,
    COALESCE(
      (SELECT tm.name FROM public.team_members tm
        WHERE tm.linked_user_id = l.uid AND tm.workspace_id = p_workspace_id LIMIT 1),
      'Líder'
    ),
    (sa.id IS NOT NULL),
    CASE
      WHEN v_gf THEN 'grandfathered'
      WHEN sa.id IS NOT NULL THEN 'addon'
      WHEN v_trial_active THEN 'trial'
      ELSE 'none'
    END,
    CASE
      WHEN v_gf THEN 0::numeric
      WHEN sa.id IS NOT NULL THEN COALESCE(sa.included_hours, 6)
      WHEN v_trial_active THEN 6::numeric
      ELSE 0::numeric
    END,
    COALESCE((
      SELECT SUM(e.machine_minutes) / 60.0
      FROM public.bot_usage_events e
      JOIN public.team_members tm2 ON tm2.id = e.member_id
      JOIN public.teams t2 ON t2.id = tm2.team_id
      WHERE e.workspace_id = p_workspace_id
        AND t2.leader_user_id = l.uid
        AND e.created_at >= date_trunc('month', now())
    ), 0)
  FROM leaders l
  LEFT JOIN LATERAL (
    SELECT s.id, s.included_hours
    FROM public.seat_addons s
    WHERE s.workspace_id = p_workspace_id
      AND s.leader_user_id = l.uid
      AND s.addon_type = 'bot'
      AND s.status = 'active'
    LIMIT 1
  ) sa ON true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_leader_bot_addon(uuid) TO authenticated;