

## Problem

The two comparison cards ("Sem Rhitmo" / "Com Rhitmo") are in a `grid-cols-2` layout but can misalign vertically because they are independent grid cells. The "Com Rhitmo" card also has an extra arrow indicator element that can affect its internal spacing. Font size is `text-sm` which is small.

## Plan

**File: `src/pages/Landing.tsx` (lines 779-818)**

1. **Force equal height alignment** — Add `items-stretch` to the grid container and use `flex flex-col` on each card so their internal content stretches equally. Both cards already have the same number of items (5 each), but the flex structure ensures pixel-perfect alignment.

2. **Increase font size** — Change list item text from `text-sm` to `text-base` on both sides (lines 792 and 814). Change header `text-xl` to `text-2xl` (lines 786 and 808).

3. **Align internal structure** — Ensure both cards use identical padding, spacing, and structure:
   - Both cards: same `p-8 lg:p-10` padding (already matching)
   - Both cards: same `space-y-6` (already matching)
   - Move the arrow indicator's positioning so it doesn't affect the "Com Rhitmo" card's internal flow (it's `absolute` so it shouldn't, but verify)
   - Add `min-h-0` or explicit `items-start` on the grid to prevent any stretch misalignment

4. **Apply Design Skill polish** — Add subtle refinements:
   - Slightly larger icon containers (`w-12 h-12` instead of `w-10 h-10`)
   - Increase list spacing from `space-y-4` to `space-y-5` for better readability at the larger font size
   - Ensure icon `mt-1` alignment matches the new `text-base` line height

