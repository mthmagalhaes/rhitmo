

## Plan: Dashboard Bento Grid Redesign

### Summary
Restructure the leader dashboard into a professional 3-column Bento Grid layout with vertical meetings card, quick actions, activity feed, and properly proportioned member cards. Remove horizontal scroll meeting cards and visual clutter.

### Layout Structure

```text
┌──────────────────────────────────────────────────────────┐
│  Workspace Header + Actions                              │
├──────────────────────────────────────────────────────────┤
│  Team Tabs                                               │
├───────────────────────┬──────────────────────────────────┤
│                       │  🔔 Atividade recente            │
│  📅 Próximas 1:1s     ├──────────────────────────────────┤
│  (tall, vertical)     │  ⚡ Ações Rápidas (2x2 grid)    │
│  min-h-[500px]        ├──────────────────────────────────┤
│                       │  📨 Convites Pendentes           │
├───────────────────────┴──────────────────────────────────┤
│  👥 Seu Time (full-width grid)                           │
│  [card] [card] [card] [card]                             │
└──────────────────────────────────────────────────────────┘
```

### Changes

**1. CREATE `src/components/dashboard/UpcomingMeetingsCard.tsx`**
- Tall vertical card (`min-h-[500px]`, `rounded-3xl`, soft shadow)
- Reuses `useCalendarIntegration` hook for data
- Each meeting rendered as a row: time badge (Today/Tomorrow/date), member name, role, "Ver Brief" link
- Dividers between items, max 5 meetings
- Empty state with calendar icon + connect CTA
- Not connected state: full-height card with connect prompt

**2. CREATE `src/components/dashboard/QuickActionsCard.tsx`**
- 2x2 grid of icon+label buttons
- Actions: Nova Nota, Enviar Kudos, Ver Analytics, Gravar Reunião
- Each: `p-4 rounded-xl hover:-translate-y-1 transition-all`
- Card: `rounded-3xl`, soft shadow, `p-5`

**3. UPDATE `src/pages/Index.tsx`**
- Replace inline `CalendarWidget` + stacked sections with 2-column Bento grid:
  - Left (col-span-7 on 12-col grid): `UpcomingMeetingsCard`
  - Right (col-span-5): Stack of `ActivityPreview` + `QuickActionsCard` + `PendingInvitesSection`
- Keep `UpgradeBanner` above the grid
- Keep `SetupChecklist` conditionally (first-time only, above grid)
- Member grid section stays full-width below, with heading + legend
- Mobile: single column, meetings card loses min-height
- Import new components, remove `CalendarWidget` import

**4. UPDATE `src/components/TeamMemberCard.tsx`**
- Add `aspect-[3/4]` to card container for portrait proportions
- Increase padding to `p-6`, use `flex flex-col` for proper spacing
- Name: `text-lg font-semibold tracking-tight`
- Health indicator section: days-since with colored text (emerald/amber/destructive)
- Bottom: note count + "Ver" outline button full-width
- Cleaner hover: `hover:-translate-y-2 hover:shadow-xl duration-300`
- Remove redundant "Última nota" date line (replaced by health indicator)

**5. UPDATE `src/components/team/PendingInvitesSection.tsx`**
- Accept optional `compact` prop (default false)
- In compact mode: no outer Card wrapper, max 3 invites, simplified rows
- Zero invites: show "✅ Todos conectados!" one-liner

**6. DELETE `src/components/CalendarWidget.tsx`** (replaced by UpcomingMeetingsCard)

### Files Modified

| File | Action |
|------|--------|
| `src/components/dashboard/UpcomingMeetingsCard.tsx` | Create |
| `src/components/dashboard/QuickActionsCard.tsx` | Create |
| `src/pages/Index.tsx` | Major restructure — Bento grid layout |
| `src/components/TeamMemberCard.tsx` | Redesign — aspect ratio, health indicator |
| `src/components/team/PendingInvitesSection.tsx` | Add compact mode |
| `src/components/CalendarWidget.tsx` | Delete |

### Technical Notes
- No database changes needed
- `useCalendarIntegration` hook stays unchanged, just consumed by UpcomingMeetingsCard instead of CalendarWidget
- Health indicator uses `lastFeedback` data already passed to TeamMemberCard (days calculation already exists)
- Responsive: `grid-cols-1 lg:grid-cols-12` for Bento, member grid stays `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`

