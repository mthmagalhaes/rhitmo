

## Problem

The two comparison cards are two separate grid cells. Even with `items-stretch` and `flex flex-col`, there's no mechanism to align each internal row (header, item 1, item 2...) across the two cells. The screenshot confirms "Com Rhitmo" header sits lower than "Sem Rhitmo".

## Solution

Restructure the comparison as a **single container with a 2-column internal grid** where each row spans both sides, guaranteeing pixel-perfect alignment.

### File: `src/pages/Landing.tsx` (lines 779-818)

Replace the current two-card grid with a single wrapper that contains two visual halves:

```text
┌──────────────────────┬──────────────────────┐
│  Sem Rhitmo header   │  Com Rhitmo header   │  ← same grid row
├──────────────────────┼──────────────────────┤
│  ✗ Item 1            │  ✓ Item 1            │  ← same grid row
│  ✗ Item 2            │  ✓ Item 2            │  ← same grid row
│  ...                 │  ...                 │
└──────────────────────┴──────────────────────┘
```

**Approach**: Keep the two-card visual design but wrap them in a single `div` that uses `grid grid-cols-2` with each pair of items (left item + right item) sharing the same implicit row. This is done by interleaving the items:

1. Create a single outer container with `grid md:grid-cols-2` and apply the left/right background styling via CSS pseudo-elements or two background divs
2. Place headers side-by-side in the same row
3. Map both `beforeItems` and `afterItems` arrays together, placing each pair in the same grid row
4. Keep the arrow indicator absolutely positioned on the container
5. Maintain all existing text sizes (`text-2xl` headers, `text-base` items), spacing, and colors
6. On mobile (`grid-cols-1`), stack as before — left card on top, right card below

This guarantees every line aligns perfectly because they share the same CSS grid row.

