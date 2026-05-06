/**
 * Centralized helper to apply a single bias suggestion to a Tiptap editor
 * preserving doc structure (vs. the old setContent-rebuild approach which
 * destroyed formatting).
 */
import type { Editor } from '@tiptap/react';
import type { BiasMatch } from '@/lib/biasDetection';

function plainOffsetToDocPos(doc: any, offset: number): number {
  let pos = 0;
  let charCount = 0;
  doc.descendants((node: any, nodePos: number) => {
    if (pos > 0) return false;
    if (node.isText && node.text) {
      if (charCount + node.text.length >= offset) {
        pos = nodePos + (offset - charCount);
        return false;
      }
      charCount += node.text.length;
    }
    return true;
  });
  return pos || 0;
}

export function applyBiasSuggestion(editor: Editor, match: BiasMatch) {
  const from = plainOffsetToDocPos(editor.state.doc, match.from);
  const to = plainOffsetToDocPos(editor.state.doc, match.to);
  if (from >= to) return;
  editor.chain().focus().insertContentAt({ from, to }, match.suggestion).run();
}
