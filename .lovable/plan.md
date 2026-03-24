

## Plan: Improve AI Review Formatting with Visual Hierarchy

### Summary
Update the AI prompt to generate structured HTML with emojis and CSS classes, then add scoped styles to the FormalReviewSheet so the generated content renders with clear visual hierarchy.

### Changes

**1. `supabase/functions/generate-formal-review/index.ts`** — Update prompt (lines 154-211)

Replace the `## FORMATO DE SAÍDA` and `## ESTRUTURA OBRIGATÓRIA` sections to instruct the AI to generate HTML with semantic CSS classes and emojis:

- 4 sections: 📊 Resumo Executivo, ⭐ Pontos Fortes, 🎯 Áreas de Desenvolvimento, 🚀 Próximos Passos
- Each section wrapped in `<div class="review-section">` with a `<div class="section-header">` containing emoji span + h2
- Strengths/development items as individual `<div class="strength-item">` / `<div class="development-item">` with h3 subtitles
- Evidence citations as `<span class="evidence-tag">(Anotação de 12/mar)</span>`
- Próximos Passos as `<ul class="next-steps-list">`
- Remove the "NÃO use div, span, class" restriction — replace with explicit allowed structure

**2. `src/index.css`** — Add review styling

Add scoped CSS for the review classes at the end of the file:

```css
/* Formal Review AI-generated content styles */
.review-section { margin-bottom: 1.5rem; }
.section-header {
  display: flex; align-items: center; gap: 0.5rem;
  background: hsl(var(--muted) / 0.3);
  border-left: 3px solid hsl(var(--primary));
  padding: 0.75rem 1rem; border-radius: 0.5rem;
  margin-bottom: 1rem;
}
.section-icon { font-size: 1.25rem; flex-shrink: 0; }
.section-title { font-size: 1.15rem; font-weight: 600; margin: 0; }
.strength-item, .development-item { margin-bottom: 1rem; padding-left: 1rem; }
.strength-subtitle, .development-subtitle { font-size: 0.95rem; font-weight: 600; margin-bottom: 0.25rem; }
.evidence-tag {
  display: inline-block; background: hsl(var(--muted));
  color: hsl(var(--muted-foreground)); font-size: 0.75rem;
  padding: 1px 8px; border-radius: 12px; margin-left: 4px;
  white-space: nowrap; font-weight: 500;
}
.next-steps-list { list-style: none; padding-left: 0; }
.next-steps-list li {
  padding-left: 1.5rem; position: relative; margin-bottom: 0.5rem; line-height: 1.6;
}
.next-steps-list li::before {
  content: "→"; position: absolute; left: 0;
  color: hsl(var(--primary)); font-weight: bold;
}
```

**3. No changes to `FormalReviewSheet.tsx`** — The RichTextEditor already renders HTML content with `prose` classes. The global CSS will style the AI-generated class-based markup automatically inside the Tiptap editor.

### Technical Notes
- Tiptap renders raw HTML including div/span with classes — no extensions needed for display
- The CSS uses CSS custom properties (`--muted`, `--primary`) so it works with both light and dark themes
- Existing reviews without classes will still render fine (backward compatible)
- No database changes needed

