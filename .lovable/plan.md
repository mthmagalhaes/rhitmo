

## Plan: Highlight Biased Words in Rich Text Editor

### Approach

Since the review editor uses **TipTap** (ProseMirror-based), we can use TipTap's native `Highlight` extension to apply yellow background marks directly on detected words. This is far cleaner than textarea overlays — the highlights live inside the editable content naturally.

### Files to modify

**1. `src/components/ui/rich-text-editor.tsx`** — Add highlight support
- Import and register `@tiptap/extension-highlight` with a custom `biasHighlight` type
- Add new prop `highlightWords?: string[]`
- Add a `useEffect` that, when `highlightWords` changes, uses ProseMirror search-and-mark to apply highlight marks on matching words
- Add CSS for the highlight: `bg-amber-200/60 dark:bg-amber-700/40 rounded px-0.5`
- Auto-clear highlights after 8 seconds
- Export a method via `editorRef` or a new prop callback to trigger highlight externally

**2. `src/components/BiasAlert.tsx`** — Add "Destacar no texto" button
- Add optional `onHighlightWords` prop
- Add a `Highlighter` icon button between the suggestions toggle and the dismiss button
- When clicked, calls `onHighlightWords()` which triggers highlighting in the parent

**3. `src/components/NewReviewDialog.tsx`** — Wire everything together
- Add `highlightWords` state
- Pass `highlightWords` to `RichTextEditor`
- Pass `onHighlightWords` callback to `BiasAlert` that sets `highlightWords` from `biasResult.detectedWords`
- Clear `highlightWords` on dismiss, on dialog close, and auto-clear after timeout

**4. `src/index.css`** — Add highlight styling
- Add `.bias-highlight` class: `background-color: rgb(253 230 138 / 0.6); border-radius: 2px; padding: 0 2px;`
- Dark mode variant with amber-700/40

### Technical details

TipTap Highlight extension supports custom types. We configure it with `multicolor: true` and apply marks programmatically:

```typescript
import Highlight from '@tiptap/extension-highlight';

// In extensions array:
Highlight.configure({ multicolor: true })

// To apply highlights:
const applyBiasHighlights = (editor, words) => {
  const { doc } = editor.state;
  const tr = editor.state.tr;
  
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const text = node.text.toLowerCase();
    words.forEach(word => {
      let index = text.indexOf(word.toLowerCase());
      while (index !== -1) {
        tr.addMark(pos + index, pos + index + word.length, 
          editor.schema.marks.highlight.create({ color: '#fde68a' }));
        index = text.indexOf(word.toLowerCase(), index + 1);
      }
    });
  });
  
  editor.view.dispatch(tr);
};

// To clear: editor.commands.unsetHighlight()
```

The highlights are native editor marks — fully compatible with editing, cursor, selection. Auto-clear after 8s via setTimeout.

### Install dependency
- `@tiptap/extension-highlight` (TipTap highlight extension)

