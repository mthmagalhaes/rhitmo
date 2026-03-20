

## Plan: Isolate HR Admin Menu + Create HR Analytics Page

### Problem
HR Admin sees leader menu items (Início, Analytics, Assinatura, Guia Rhitmo) alongside HR menu, causing confusion. Needs isolated sidebar and a dedicated Analytics page with charts.

### Changes

**1. `src/components/AppSidebar.tsx`** — Isolate HR Admin menu

- Hide the "Menu" section (`menuItems`) when `isHRAdmin` is true
- Add "Analytics" item to the Painel RH section: `/hr/analytics` with `BarChart3` icon
- Add "Ver como Líder" button in footer (only if `isHRAdmin && isLeader`), navigates to `/dashboard`

Result:
```text
HR Admin Sidebar:
PAINEL RH
├─ Visão Geral      /hr
├─ Times e Líderes   /hr/teams
├─ Analytics         /hr/analytics  ← NEW
├─ Competências      /hr/competency-framework

[footer]
Ver como Líder → /dashboard (only if also leader)
```

**2. `src/pages/HRAnalytics.tsx`** — New analytics page

- Uses `useHRAdmin()` for `workspaceId`
- Calls existing RPCs: `get_hr_dashboard_metrics` + `get_hr_leaders_overview`
- **Filters**: Period dropdown (7/30/60/90 days), Leader dropdown
- **3 charts** using recharts (already installed):
  - Bar chart: Feedback frequency per leader (from leaders overview data)
  - Horizontal bars: Sentiment distribution (from dashboard metrics)
  - Summary KPI cards at top (reuse metrics)
- No new RPC needed — existing data is sufficient for initial version
- "Exportar relatório" button as placeholder (disabled, future feature)

**3. `src/App.tsx`** — Add route `/hr/analytics`

Wrap in `AppLayout` + `HRAdminGuard`, same pattern as other HR routes.

### No database changes needed
Existing RPCs already return all needed data (sentiment distribution, leader feedback counts).

### Technical details
- `recharts` is already in `package.json`
- Sentiment data keys from RPC: `muito_positivo`, `positivo`, `neutro`, `construtivo`, `critico`
- Leader feedback data from `get_hr_leaders_overview`: `feedbacks_last_30d` per leader

