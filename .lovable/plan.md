

## Plan: Replace Emoji Icons with Lucide SVGs in Formal Reviews

### Summary
Replace emoji section icons (📊⭐🎯🚀) with inline Lucide SVG icons in the edge function output, and update CSS to style SVGs with the Rhitmo primary color.

### Changes

**1. `supabase/functions/generate-formal-review/index.ts`**

Add SVG constants at top (after imports, before `Deno.serve`):
- `ICON_SUMMARY` — FileText icon (document)
- `ICON_STRENGTHS` — TrendingUp icon (upward chart)
- `ICON_DEVELOPMENT` — Target icon (bullseye)
- `ICON_NEXT_STEPS` — ArrowRight icon (forward arrow)

All SVGs: `width="20" height="20"`, class `section-icon-svg`, `stroke="currentColor"`.

Update prompt (lines 172-214): Replace emoji spans with placeholders:
- `📊` → `{{ICON_SUMMARY}}`
- `⭐` → `{{ICON_STRENGTHS}}`
- `🎯` → `{{ICON_DEVELOPMENT}}`
- `🚀` → `{{ICON_NEXT_STEPS}}`

After AI response (line 296), replace placeholders before saving:
```typescript
let content = aiData.choices?.[0]?.message?.content || "";
content = content
  .replace(/\{\{ICON_SUMMARY\}\}/g, ICON_SUMMARY)
  .replace(/\{\{ICON_STRENGTHS\}\}/g, ICON_STRENGTHS)
  .replace(/\{\{ICON_DEVELOPMENT\}\}/g, ICON_DEVELOPMENT)
  .replace(/\{\{ICON_NEXT_STEPS\}\}/g, ICON_NEXT_STEPS);
```

**2. `src/index.css`**

Update `.section-icon` style (currently `font-size: 1.25rem; flex-shrink: 0; line-height: 1;`) to:
```css
.section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
}
.section-icon-svg {
  width: 20px;
  height: 20px;
  color: hsl(var(--primary));
  flex-shrink: 0;
}
```

Remove the old emoji-oriented styles from `.section-icon`.

### Technical Notes
- SVGs use `stroke="currentColor"` and CSS sets `color: hsl(var(--primary))` — works in light/dark mode
- Tiptap renders inline SVGs in HTML content without issues (read-only display)
- Existing reviews with emojis will still render fine (backward compatible — emojis just show as text)
- No database changes needed
- Edge function needs redeployment

