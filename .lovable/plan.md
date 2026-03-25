

## Plan: Strip Markdown Code Fences from AI-Generated Review Content

### Problem
The AI model wraps its HTML output in ` ```html ` code fences, which appear as literal text in the Tiptap editor.

### Changes

**1. `supabase/functions/generate-formal-review/index.ts`**

**A. Add explicit instruction to prompt** (line 172, before current format section):
```
CRÍTICO - FORMATO DE OUTPUT:
- Retorne APENAS HTML puro, sem explicações
- NÃO use code fences (\`\`\`html ou \`\`\`)
- Comece DIRETAMENTE com <div class="review-section">
```

**B. Strip code fences after icon replacement** (after line 313, before line 315):
```typescript
// Strip Markdown code fences
generatedContent = generatedContent
  .replace(/^```html\n?/gm, '')
  .replace(/^```[\w]*\n?/gm, '')
  .replace(/\n?```$/gm, '')
  .trim();
```

No other file changes needed. Edge function will be redeployed.

