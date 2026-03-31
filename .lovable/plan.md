

## Plan: UX Layout & Spacing Overhaul — All User Roles

### Problem Identified

The root cause is that `container mx-auto` in Tailwind defaults to full-width breakpoints (e.g., `max-width: 1280px` at `xl`, `1536px` at `2xl`), and with the sidebar taking ~256px, the remaining content area pushes components beyond the visible viewport. The NudgesBanner text truncates too aggressively, the CalendarWidget cards scroll horizontally without visual cues, and the header buttons ("Nova Nota") hide behind the right edge.

### Changes Overview

**1. Global: Constrain content width inside sidebar layout**

- **`src/pages/Index.tsx`** — Replace `container mx-auto px-6` with `max-w-5xl mx-auto px-4 sm:px-6` in both the header and `<main>` sections (lines 305, 375). This caps content at ~1024px, fitting comfortably inside the sidebar layout at 1136px viewport.

**2. Index.tsx Header — Responsive button layout**

- Lines 339-371: Stack buttons vertically on smaller viewports or use `flex-wrap` to prevent overflow. Change `<div className="flex gap-3">` to `<div className="flex flex-wrap gap-2 sm:gap-3">`.

**3. NudgesBanner — Fix text truncation**

- Line 85: The message `<p>` uses `truncate` which clips long messages. Change to `line-clamp-2` so messages wrap to 2 lines instead of being cut off. This ensures "Yasmin Nóbrega teve 3 sinais de atenção nas últimas 2 semanas" is fully readable.

**4. CalendarWidget — Add scroll indicators**

- Line 116: The horizontal scroll container `flex gap-3 overflow-x-auto pb-1` has no visual hint that more cards exist. Add gradient fade masks on the right edge (`mask-image` or a pseudo-element) and reduce `min-w-[220px]` to `min-w-[200px]` to show more cards.

**5. TeamTabs — Prevent overflow**

- Line 30: `TabsList` uses `flex-nowrap overflow-x-auto` but has no max-width constraint. Add `max-w-full` and ensure scroll indicators are visible. Consider wrapping tabs on mobile with `flex-wrap` for small team counts.

**6. MemberDetails.tsx — Constrain width**

- Line 399: Replace `container mx-auto px-4 sm:px-6` with `max-w-5xl mx-auto px-4 sm:px-6`.

**7. Analytics.tsx — Audit container**

- Check and apply same `max-w-5xl` constraint to the Analytics page main wrapper.

**8. DirectReportDashboard.tsx — Audit container**

- Apply same `max-w-5xl` pattern to the direct report dashboard.

**9. HRDashboard.tsx — Already correct**

- Uses `max-w-6xl mx-auto` (line 66) — already well-constrained. No changes needed.

**10. HRTeams.tsx, HRMembers.tsx, HRAnalytics.tsx — Audit containers**

- Apply consistent `max-w-5xl` or `max-w-6xl` pattern if using `container mx-auto`.

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Replace `container mx-auto` → `max-w-5xl mx-auto`, fix button wrapping |
| `src/components/NudgesBanner.tsx` | `truncate` → `line-clamp-2` on message text |
| `src/components/CalendarWidget.tsx` | Reduce card `min-w`, add right-fade hint |
| `src/components/TeamTabs.tsx` | Ensure no overflow on narrow viewports |
| `src/pages/MemberDetails.tsx` | `container mx-auto` → `max-w-5xl mx-auto` |
| `src/pages/Analytics.tsx` | Same container constraint |
| `src/components/dashboard/DirectReportDashboard.tsx` | Same container constraint |
| `src/pages/HRTeams.tsx` | Audit & fix if needed |
| `src/pages/HRMembers.tsx` | Audit & fix if needed |
| `src/pages/HRAnalytics.tsx` | Audit & fix if needed |

### Technical Notes

- `max-w-5xl` = 1024px — fits well inside 1136px viewport minus ~256px sidebar = ~880px available. Actually with sidebar collapsed it goes up to ~1100px, so `max-w-5xl` (1024px) works well across states.
- No database changes needed.
- No new dependencies.
- All changes are CSS-only — zero logic changes.

