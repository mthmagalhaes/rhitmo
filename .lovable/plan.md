

## Plan: Enhance HR Dashboard with PDI Coverage KPI and New Alerts

### Context
The HR Dashboard at `/hr` (HRDashboard.tsx) already exists with 4 KPI cards and alerts, powered by the `get_hr_dashboard_metrics` RPC. Rather than creating a separate edge function and page, we enhance the existing RPC and page with the requested new metrics.

### Changes

**1. Database migration** — Extend `get_hr_dashboard_metrics` RPC

Add two new fields to the returned JSONB:
- `pdi_coverage_percentage`: Count of members with at least one `development_plans` row / total members
- `bias_detected_last_7d`: Count of `bias_detections` rows in the last 7 days

Update the existing function to include these calculations alongside current metrics.

**2. `src/pages/HRDashboard.tsx`** — Add PDI KPI card and new alerts

- Update `Metrics` interface to include `pdi_coverage_percentage` and `bias_detected_last_7d`
- Replace one existing KPI card or add a 5th card for "Cobertura de PDI" showing percentage with a `Target` icon
- Add new alert rows in "Pontos de Atenção" section:
  - PDI coverage < 50% → amber alert: "X% dos liderados ainda não têm PDI definido"
  - Bias detected > 0 → blue/info alert: "X detecção(ões) de viés nos últimos 7 dias"
- Update the "all clear" condition to include new alerts

### No new edge function needed
The existing RPC `get_hr_dashboard_metrics` already runs as `SECURITY DEFINER` with HR admin authorization checks. Adding fields there is simpler and more performant than a separate edge function.

### No new routes needed
The existing `/hr` page already serves as the HR overview/landing page.

### Technical details

New SQL additions to the RPC:
```sql
'pdi_coverage_percentage', (
  SELECT CASE WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(COUNT(DISTINCT dp.member_id)::numeric / COUNT(DISTINCT tm.id) * 100)
  END
  FROM teams t
  JOIN team_members tm ON tm.team_id = t.id
  LEFT JOIN development_plans dp ON dp.member_id = tm.id
  WHERE t.workspace_id = _workspace_id
),
'bias_detected_last_7d', (
  SELECT COUNT(*)
  FROM bias_detections bd
  JOIN team_members tm ON tm.id = bd.member_id
  JOIN teams t ON t.id = tm.team_id
  WHERE t.workspace_id = _workspace_id
  AND bd.created_at > NOW() - INTERVAL '7 days'
)
```

