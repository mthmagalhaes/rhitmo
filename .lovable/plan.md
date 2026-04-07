

## Plan: Dashboard UX Refresh + Centralized Activity Feed

### Current State
- **ActivityBadge** (bell icon) lives in `AppLayout` header, but it's visually disconnected — small, top-right, easy to miss
- **ActivitySheet** (side panel) already merges nudges + sync notifications with tabs
- Dashboard (`Index.tsx`) still renders `CalendarWidget`, `UpgradeBanner`, `LeaderSyncReminder`, `PendingInvitesSection`, and `SetupChecklist` as stacked blocks before the member grid — creating visual clutter
- Old `SyncNotificationBadge.tsx` and `SyncNotificationSheet.tsx` files still exist (unused)

### UX Improvements

**1. Inline Activity Feed on Dashboard (your suggestion: "subir com as notificações no meio da página")**

Instead of only the side-panel bell, add a compact **inline Activity preview card** on the dashboard between the Calendar and the Members grid. This shows the 3 most recent unread items (nudges + sync) with a "Ver todas →" link that opens the full ActivitySheet.

**2. Remove redundant dashboard clutter**
- Remove `LeaderSyncReminder` from dashboard (move to ActivitySheet as a system nudge)
- Remove `PendingInvitesSection` from dashboard (already visible on member cards)
- Keep `CalendarWidget` (high-value, actionable)
- Keep `SetupChecklist` (only shows during onboarding)
- Keep `UpgradeBanner` (billing — conditional)

**3. Keep bell in AppLayout header** (accessible from ALL pages, not just dashboard)

**4. Delete old unused files**
- `SyncNotificationBadge.tsx`
- `SyncNotificationSheet.tsx`

### Changes

**File: `src/components/ActivityPreview.tsx` (NEW)**
- Compact card component: "Atividade recente" header with bell icon
- Fetches up to 3 most recent unread items (nudges + sync notifications)
- Renders each as a single-line item: icon + message + time ago
- Severity color bar on left (same as ActivitySheet)
- "Ver todas" button opens ActivitySheet
- If no unread items, renders nothing (clean dashboard)
- Accepts `onOpenSheet` callback prop

**File: `src/pages/Index.tsx`**
- Import `ActivityPreview` and `ActivitySheet`
- Add state `activitySheetOpen`
- Render `<ActivityPreview onOpenSheet={() => setActivitySheetOpen(true)} />` after `CalendarWidget`
- Render `<ActivitySheet open={activitySheetOpen} onOpenChange={setActivitySheetOpen} />`
- Remove `LeaderSyncReminder` component and import
- Remove `PendingInvitesSection` component and import
- Reorder: TeamTabs → CalendarWidget → UpgradeBanner → **ActivityPreview** → SetupChecklist → Members

**File: `src/components/SyncNotificationBadge.tsx` — DELETE**

**File: `src/components/SyncNotificationSheet.tsx` — DELETE**

### Visual Layout (Leader Dashboard)

```text
┌─────────────────────────────────────────────┐
│  Faster Ops  [Business]  ✏️    [+ Membro] [+ Nota] │
├─────────────────────────────────────────────┤
│  Todos | Business Ops | CreativeOps | ...   │
├─────────────────────────────────────────────┤
│  📅 Próximas reuniões  [cards scroll]       │
├─────────────────────────────────────────────┤
│  🔔 Atividade recente              Ver todas│
│  ┌─ 🚨 Yasmin teve 3 sinais...    2h atrás │
│  ├─ 💡 Gabriela não tem PDI...    5h atrás │
│  └─ 💡 Guilherme não tem PDI...   5h atrás │
├─────────────────────────────────────────────┤
│  👥 Todos os Membros                        │
│  [card] [card] [card] [card]                │
└─────────────────────────────────────────────┘
```

### Files Modified

| File | Change |
|------|--------|
| `src/components/ActivityPreview.tsx` | New — inline activity preview card |
| `src/pages/Index.tsx` | Add ActivityPreview, remove LeaderSyncReminder & PendingInvitesSection |
| `src/components/SyncNotificationBadge.tsx` | Delete (unused) |
| `src/components/SyncNotificationSheet.tsx` | Delete (unused) |

### Technical Notes
- No database changes
- ActivityPreview reuses the same queries as ActivitySheet (`leader_nudges`, `rhitmo_sync_notifications`)
- Bell in AppLayout header remains for access from any page
- LeaderSyncReminder logic (180-day check) could be converted to a DB-generated nudge later

