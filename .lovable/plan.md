

## Plan: Fix HR Admin UX — Redirect, Sidebar Menu, Consistent Layout

### Problem
1. HR Admin lands on `/dashboard` (leader view) after login
2. "Painel RH" link is at the bottom of sidebar
3. HR pages (`/hr`, `/hr/teams`) render their own header/layout, losing the sidebar

### Changes

**1. `src/pages/AuthPage.tsx`** — Smart redirect after login

On line 72, instead of always navigating to `/dashboard`, check user role:
- Query `workspaces` to see if user is in `hr_admin_ids` → redirect to `/hr`
- Otherwise → `/dashboard` (existing behavior)

This keeps the checkout flow intact (lines 28-69) and only changes the default redirect.

**2. `src/components/AppSidebar.tsx`** — Move HR section to top with expanded menu

- Move the `isHRAdmin` sidebar group (lines 138-159) to BEFORE the "Menu" group (line 90)
- Expand it from a single "Painel RH" link to 3 items: Visão Geral (`/hr`), Times e Líderes (`/hr/teams`), Competências (`/hr/competency-framework`)
- Add icons: `LayoutDashboard`, `Users`, `BookOpen`

**3. `src/App.tsx`** — Wrap HR routes in AppLayout

Change `/hr`, `/hr/teams`, `/hr/competency-framework` routes to use `<AppLayout>` wrapper (same as `/dashboard`), keeping `HRAdminGuard` inside.

**4. `src/pages/HRDashboard.tsx`** — Remove standalone layout

- Remove the custom header (logo, logout button, sticky header)
- Remove `min-h-screen bg-[#F5F0E8]` wrapper
- Keep only the `<main>` content (KPIs, alerts, activity, maturity sections)
- The AppLayout sidebar + header handles navigation now

**5. `src/pages/HRTeams.tsx`** — Remove standalone layout

Same treatment: remove custom header/nav, keep only the content. The page already uses `useHRAdmin()` for `workspaceId`.

**6. `src/pages/CompetencyFramework.tsx`** — Verify layout consistency

Check if it also has its own header; if so, strip it.

### What stays the same
- `HRAdminGuard` still wraps HR routes and provides `useHRAdmin()` context
- `DirectReportGuard` still wraps leader routes
- No database changes needed
- No new components needed

