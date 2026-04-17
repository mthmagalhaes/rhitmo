CREATE OR REPLACE FUNCTION public.admin_activation_cohorts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_cohorts jsonb;
  v_insight text;
  v_current_d7 numeric;
  v_previous_d7 numeric;
  v_diff numeric;
  v_current_label text;
  v_previous_label text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH months AS (
    SELECT 
      date_trunc('month', (now() AT TIME ZONE 'UTC') - (n || ' months')::interval) AS month_start,
      date_trunc('month', (now() AT TIME ZONE 'UTC') - (n || ' months')::interval) + interval '1 month' AS month_end
    FROM generate_series(0, 5) AS n
  ),
  workspace_activation AS (
    SELECT
      w.id AS workspace_id,
      w.created_at AS ws_created_at,
      date_trunc('month', w.created_at) AS cohort_month,
      LEAST(
        COALESCE((
          SELECT MIN(f.created_at)
          FROM feedbacks f
          JOIN team_members tm ON tm.id = f.member_id
          JOIN teams t ON t.id = tm.team_id
          WHERE t.workspace_id = w.id
        ), 'infinity'::timestamptz),
        COALESCE((
          SELECT MIN(pr.created_at)
          FROM performance_reviews pr
          JOIN team_members tm ON tm.id = pr.member_id
          JOIN teams t ON t.id = tm.team_id
          WHERE t.workspace_id = w.id
        ), 'infinity'::timestamptz),
        COALESCE((
          SELECT MIN(mt.created_at)
          FROM meeting_transcripts mt
          JOIN team_members tm ON tm.id = mt.member_id
          JOIN teams t ON t.id = tm.team_id
          WHERE t.workspace_id = w.id
        ), 'infinity'::timestamptz)
      ) AS first_activation_at
    FROM workspaces w
    WHERE w.created_at >= date_trunc('month', (now() AT TIME ZONE 'UTC') - interval '5 months')
  ),
  cohort_stats AS (
    SELECT
      m.month_start,
      COUNT(wa.workspace_id) AS total,
      COUNT(*) FILTER (
        WHERE wa.first_activation_at IS NOT NULL
          AND wa.first_activation_at <> 'infinity'::timestamptz
          AND wa.first_activation_at <= wa.ws_created_at + interval '1 day'
      ) AS d1_count,
      COUNT(*) FILTER (
        WHERE wa.first_activation_at IS NOT NULL
          AND wa.first_activation_at <> 'infinity'::timestamptz
          AND wa.first_activation_at <= wa.ws_created_at + interval '7 days'
      ) AS d7_count,
      COUNT(*) FILTER (
        WHERE wa.first_activation_at IS NOT NULL
          AND wa.first_activation_at <> 'infinity'::timestamptz
          AND wa.first_activation_at <= wa.ws_created_at + interval '30 days'
      ) AS d30_count
    FROM months m
    LEFT JOIN workspace_activation wa ON wa.cohort_month = m.month_start
    GROUP BY m.month_start
    ORDER BY m.month_start DESC
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'cohort_month', to_char(month_start, 'YYYY-MM'),
      'cohort_label', to_char(month_start, 'Mon/YY'),
      'total', total,
      'd1_count', d1_count,
      'd7_count', d7_count,
      'd30_count', d30_count,
      'd1_pct', CASE WHEN total > 0 THEN ROUND((d1_count::numeric / total) * 100, 1) ELSE 0 END,
      'd7_pct', CASE WHEN total > 0 THEN ROUND((d7_count::numeric / total) * 100, 1) ELSE 0 END,
      'd30_pct', CASE WHEN total > 0 THEN ROUND((d30_count::numeric / total) * 100, 1) ELSE 0 END
    )
    ORDER BY month_start DESC
  ) INTO v_cohorts
  FROM cohort_stats;

  -- Insight: comparar coorte mais recente com total>0 vs anterior com total>0 (D7)
  WITH ranked AS (
    SELECT 
      (c->>'cohort_label') AS label,
      (c->>'d7_pct')::numeric AS d7_pct,
      (c->>'total')::int AS total,
      ord
    FROM jsonb_array_elements(v_cohorts) WITH ORDINALITY AS t(c, ord)
    WHERE (c->>'total')::int > 0
    ORDER BY ord ASC
  ),
  pair AS (
    SELECT 
      MAX(CASE WHEN rn = 1 THEN label END) AS curr_label,
      MAX(CASE WHEN rn = 1 THEN d7_pct END) AS curr_d7,
      MAX(CASE WHEN rn = 2 THEN label END) AS prev_label,
      MAX(CASE WHEN rn = 2 THEN d7_pct END) AS prev_d7
    FROM (
      SELECT label, d7_pct, ROW_NUMBER() OVER (ORDER BY ord ASC) AS rn
      FROM ranked
    ) x
  )
  SELECT curr_label, prev_label, curr_d7, prev_d7
  INTO v_current_label, v_previous_label, v_current_d7, v_previous_d7
  FROM pair;

  IF v_current_d7 IS NOT NULL AND v_previous_d7 IS NOT NULL AND v_previous_d7 > 0 THEN
    v_diff := ROUND(v_current_d7 - v_previous_d7, 1);
    IF v_diff > 0 THEN
      v_insight := format('Coorte de %s ativando %s pp mais rápido que %s (D7)', v_current_label, v_diff, v_previous_label);
    ELSIF v_diff < 0 THEN
      v_insight := format('Coorte de %s ativando %s pp mais lento que %s (D7)', v_current_label, abs(v_diff), v_previous_label);
    ELSE
      v_insight := format('Coorte de %s no mesmo ritmo de %s (D7)', v_current_label, v_previous_label);
    END IF;
  ELSE
    v_insight := 'Dados insuficientes para comparar coortes';
  END IF;

  RETURN jsonb_build_object(
    'cohorts', COALESCE(v_cohorts, '[]'::jsonb),
    'insight', v_insight
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_activation_cohorts() TO authenticated;