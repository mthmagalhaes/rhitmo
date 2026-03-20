

## Plan: URL-based Dynamic Sidebar for HR Admin

### Problem
"Ver como Líder" navigates to `/dashboard` but sidebar stays in HR mode (role-based). Need URL-based context switching.

### Changes

**1. `src/components/AppSidebar.tsx`** — Switch from role-based to URL-based menu display

- Add `useLocation()` import and derive `isInHRContext = location.pathname.startsWith('/hr')`
- Replace `{isHRAdmin && (` on line 95 with `{isInHRContext && isHRAdmin && (`
- Replace `{!isHRAdmin && (` on line 121 with `{!isInHRContext && (`
- Change "Ver como Líder" button (line 174): show only when `isInHRContext && isHRAdmin && isLeader`
- Add "Voltar ao Painel RH" button: show when `!isInHRContext && isHRAdmin`, navigates to `/hr`

Summary of sidebar behavior:
```text
URL starts with /hr → Painel RH menu + "Ver como Líder" button
URL is /dashboard etc → Standard Menu + "Voltar ao Painel RH" button
```

### No other files need changes
Routes, layouts, and guards remain as-is. This is a single-file change.

