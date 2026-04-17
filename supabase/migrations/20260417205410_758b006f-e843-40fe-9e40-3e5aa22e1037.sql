-- RPC: admin_revenue_metrics
-- Calcula MRR, tendência 4 semanas, trials vencendo, conversão T→P (90d) e distribuição por plano.
-- Apenas super-admin. Preços em BRL hardcoded.

CREATE OR REPLACE FUNCTION public.admin_revenue_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pulse_price numeric := 0;
  v_pro_price numeric := 49;
  v_business_price numeric := 69;

  v_mrr_total numeric := 0;
  v_mrr_pro numeric := 0;
  v_mrr_business numeric := 0;

  v_count_pulse integer := 0;
  v_count_pro integer := 0;
  v_count_business integer := 0;

  v_trial_expiring jsonb;
  v_trial_to_paid_rate numeric := 0;
  v_trials_started integer := 0;
  v_trials_converted integer := 0;

  v_mrr_trend jsonb;
  v_week_offset integer;
  v_week_end timestamptz;
  v_trend_array jsonb := '[]'::jsonb;
  v_week_mrr numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: super-admin only';
  END IF;

  -- MRR atual + counts (active + trialing contam como receita potencial; aqui contamos só active para MRR real)
  SELECT
    COALESCE(SUM(CASE WHEN s.plan_tier = 'pro'      AND s.status = 'active' THEN COALESCE(s.quantity,1) * v_pro_price      ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN s.plan_tier = 'business' AND s.status = 'active' THEN COALESCE(s.quantity,1) * v_business_price ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE s.plan_tier = 'pulse'    AND s.status IN ('active','trialing')),
    COUNT(*) FILTER (WHERE s.plan_tier = 'pro'      AND s.status IN ('active','trialing')),
    COUNT(*) FILTER (WHERE s.plan_tier = 'business' AND s.status IN ('active','trialing'))
  INTO v_mrr_pro, v_mrr_business, v_count_pulse, v_count_pro, v_count_business
  FROM public.subscriptions s;

  v_mrr_total := v_mrr_pro + v_mrr_business;

  -- Tendência 4 semanas (snapshots ao final de cada semana)
  FOR v_week_offset IN REVERSE 3..0 LOOP
    v_week_end := date_trunc('day', now()) - (v_week_offset * interval '7 days');

    SELECT COALESCE(SUM(
      CASE
        WHEN s.plan_tier = 'pro'      THEN COALESCE(s.quantity,1) * v_pro_price
        WHEN s.plan_tier = 'business' THEN COALESCE(s.quantity,1) * v_business_price
        ELSE 0
      END
    ), 0)
    INTO v_week_mrr
    FROM public.subscriptions s
    WHERE s.created_at <= v_week_end
      AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end >= v_week_end);

    v_trend_array := v_trend_array || jsonb_build_object(
      'week_label', 'S' || (4 - v_week_offset)::text,
      'week_end', v_week_end,
      'mrr', v_week_mrr
    );
  END LOOP;
  v_mrr_trend := v_trend_array;

  -- Trials vencendo nos próximos 7 dias
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'workspace_id', w.id,
      'workspace_name', w.name,
      'plan_tier', s.plan_tier,
      'trial_ends_at', s.trial_ends_at,
      'days_left', GREATEST(0, EXTRACT(DAY FROM (s.trial_ends_at - now()))::int)
    )
    ORDER BY s.trial_ends_at ASC
  ), '[]'::jsonb)
  INTO v_trial_expiring
  FROM public.subscriptions s
  JOIN public.workspaces w ON w.id = s.workspace_id
  WHERE s.status = 'trialing'
    AND s.trial_ends_at IS NOT NULL
    AND s.trial_ends_at <= now() + interval '7 days'
    AND s.trial_ends_at > now() - interval '1 day';

  -- Conversão Trial → Paid (90d): de trials criados nos últimos 90d, quantos estão active hoje
  SELECT
    COUNT(*) FILTER (WHERE s.created_at >= now() - interval '90 days'),
    COUNT(*) FILTER (WHERE s.created_at >= now() - interval '90 days' AND s.status = 'active')
  INTO v_trials_started, v_trials_converted
  FROM public.subscriptions s
  WHERE s.trial_ends_at IS NOT NULL OR s.status IN ('trialing','active');

  IF v_trials_started > 0 THEN
    v_trial_to_paid_rate := ROUND((v_trials_converted::numeric / v_trials_started::numeric) * 100, 1);
  END IF;

  RETURN jsonb_build_object(
    'mrr_total', v_mrr_total,
    'mrr_by_tier', jsonb_build_object(
      'pulse', 0,
      'pro', v_mrr_pro,
      'business', v_mrr_business
    ),
    'mrr_trend_4w', v_mrr_trend,
    'trial_expiring_7d', v_trial_expiring,
    'trial_to_paid_rate_90d', v_trial_to_paid_rate,
    'trials_started_90d', v_trials_started,
    'trials_converted_90d', v_trials_converted,
    'subscriptions_by_tier', jsonb_build_object(
      'pulse', v_count_pulse,
      'pro', v_count_pro,
      'business', v_count_business
    ),
    'pricing', jsonb_build_object(
      'pulse', v_pulse_price,
      'pro', v_pro_price,
      'business', v_business_price,
      'currency', 'BRL'
    ),
    'generated_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_revenue_metrics() TO authenticated;