

## Plan: Unified Activity Center — Replace Dashboard Notifications

### Summary
Transform the "Atualizações de Rhitmo Sync" sheet into a unified **Activity Center** (like Slack's Activity panel). Move leader nudges (NudgesBanner) into this panel, clean up the dashboard. Make it role-aware: leaders see nudges + sync updates, direct reports see shared feedback notifications, HR sees workspace-level alerts.

### Changes

**1. Rename & Expand `SyncNotificationSheet.tsx` → `ActivitySheet.tsx`**

- Rename component to `ActivitySheet`
- Change title: "Atualizações de Rhitmo Sync" → "Atividade"
- Change description: "Mudanças no perfil comportamental..." → "Notificações e atualizações recentes"
- Add **tab filters** at the top: "Todas" | "Alertas" | "Perfil" (for leaders); "Todas" | "Feedbacks" (for direct reports)
- Fetch from TWO sources for leaders:
  - `rhitmo_sync_notifications` (existing — profile changes)
  - `leader_nudges` where `dismissed_at IS NULL` (nudges currently shown as banners)
- Merge both into a unified timeline sorted by `created_at DESC`
- Each item gets a type icon:
  - Nudge urgent: red circle icon
  - Nudge warning: amber icon
  - Nudge info: blue lightbulb icon
  - Sync update: purple user icon (existing)
- Nudge items show: message + severity color bar on left + "Ver →" action button + dismiss (X) button
- Sync items keep existing expandable diff UI
- Mark nudge as "read" = dismiss it (`dismissed_at = now()`)
- For direct reports: show shared feedbacks and review notifications (future — for now show empty state with "Nenhuma atividade ainda")

**2. Update `SyncNotificationBadge.tsx` → `ActivityBadge.tsx`**

- Rename component
- Count BOTH unread sync notifications AND undismissed nudges
- Query: `rhitmo_sync_notifications` count (read_at IS NULL) + `leader_nudges` count (dismissed_at IS NULL)
- Sum both for the badge number
- For direct reports: count from a different source (or 0 for now)
- Update title: "Notificações de Rhitmo Sync" → "Atividade"

**3. Update `AppLayout.tsx`**

- Update imports: `SyncNotificationBadge` → `ActivityBadge`, `SyncNotificationSheet` → `ActivitySheet`
- Show ActivityBadge for ALL roles (not just leaders) — direct reports and HR too
- Pass user role context to ActivitySheet

**4. Update `src/pages/Index.tsx` — Remove NudgesBanner**

- Remove `<NudgesBanner />` from the dashboard (line ~442)
- Remove import of NudgesBanner
- This cleans up the dashboard significantly — nudges are now in the Activity panel

**5. Keep `NudgesBanner.tsx` file** (don't delete — may be useful for email digests later)

### Files Modified

| File | Change |
|------|--------|
| `src/components/SyncNotificationSheet.tsx` | Rename to ActivitySheet, add nudges feed, tabs, role-aware |
| `src/components/SyncNotificationBadge.tsx` | Rename to ActivityBadge, count nudges + sync |
| `src/components/AppLayout.tsx` | Update imports, show for all roles |
| `src/pages/Index.tsx` | Remove NudgesBanner from dashboard |

### Technical Notes
- No database changes needed — both `leader_nudges` and `rhitmo_sync_notifications` tables already exist with correct RLS
- Dismissing a nudge from the Activity panel uses the same mutation as the current NudgesBanner (update `dismissed_at`)
- The badge count query combines two tables in parallel (`Promise.all`)
- Direct report activity feed is a placeholder for now — can be populated later with shared feedback events

