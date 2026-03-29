

## Plan: Real-Time Bias Detection with Visual Highlighting in Note Editor

### Summary
Add real-time bias detection to NewNoteDialog using the existing client-side `biasDetection.ts` word-list engine (no new edge function needed for the fast path). Enhance the RichTextEditor with wavy underline decorations via a custom Tiptap extension, and show inline rewrite suggestions with one-click apply. For richer AI-powered suggestions on complex cases, add an optional `detect-bias-realtime` edge function call.

### Architecture Decision
The existing `biasDetection.ts` already has 30+ Portuguese bias words with neutral alternatives — this runs instantly client-side with zero latency. Use this as the primary detection engine (fired on every keystroke via debounce). Reserve the AI edge function call for an optional "deep analysis" button only, keeping the real-time experience snappy.

### Changes

**1. Enhance `src/lib/biasDetection.ts`** — Add position-aware detection

Add a new function `detectBiasWithPositions(text)` that returns exact character offsets for each detected word, its type (feminine/masculine), and the suggestion from `NEUTRAL_ALTERNATIVES`. This enables precise Tiptap decorations.

```typescript
export interface BiasMatch {
  word: string;
  type: 'feminine' | 'masculine';
  suggestion: string;
  from: number;  // char offset in plain text
  to: number;
}

export function detectBiasWithPositions(plainText: string): BiasMatch[]
```

**2. Create `src/components/feedback/BiasUnderlineExtension.ts`** — Tiptap ProseMirror plugin

Custom Tiptap extension that:
- Accepts bias matches via `editor.storage` or transaction meta
- Creates `Decoration.inline` with `class="bias-underline"` and `data-bias-type`
- Renders wavy underlines under biased phrases (red for gender, amber for personality, blue for vague)

**3. Update `src/components/ui/rich-text-editor.tsx`**

- Add the `BiasUnderlineExtension` to the extensions array
- Accept new prop `biasMatches?: BiasMatch[]`
- When `biasMatches` changes, dispatch a transaction with the new decorations
- No changes to existing highlight functionality (they coexist)

**4. Create `src/components/feedback/BiasSuggestionsPanel.tsx`**

Compact panel shown below the editor when detections exist:
- Lists each detected word with its suggestion
- "Aplicar" button replaces the word in the editor via `editor.commands`
- "Aplicar todas" button applies all suggestions at once
- Color-coded badges by bias type
- Dismissible (tracks dismiss count, hides after 3 dismissals per session)
- Animated entrance (`animate-in fade-in`)

**5. Update `src/components/NewNoteDialog.tsx`**

- Import `detectBiasWithPositions` and `BiasSuggestionsPanel`
- Add `useEffect` with 800ms debounce on `content` changes → run `detectBiasWithPositions(editor.getText())`
- Pass `biasMatches` to `RichTextEditor`
- Render `BiasSuggestionsPanel` between the editor and VoiceInput
- Track dismiss count in local state

**6. Update `src/index.css`** — Wavy underline styles

```css
.bias-underline {
  border-bottom: 2px wavy rgba(239, 68, 68, 0.6);
  cursor: help;
  transition: background-color 0.2s;
}
.bias-underline:hover {
  background-color: rgba(239, 68, 68, 0.1);
}
.bias-underline[data-bias-type="masculine"] {
  border-bottom-color: rgba(245, 158, 11, 0.8);
}
```

### What This Does NOT Include
- No new edge function for real-time detection (client-side word-list is fast enough and free)
- No changes to the existing `BiasAlert` component (still used in review dialog)
- No database changes

### Technical Notes
- The Tiptap decoration plugin uses `DecorationSet` from `@tiptap/pm/view` — already available since Tiptap is installed
- Character offset mapping between plain text and ProseMirror positions requires walking `doc.descendants()` to map plain-text indices to doc positions
- The debounce prevents excessive re-renders; 800ms matches the user's spec
- All detection runs client-side — zero API cost, zero latency
- The `highlightWords` prop on RichTextEditor is kept for backward compatibility with the review dialog's existing behavior

