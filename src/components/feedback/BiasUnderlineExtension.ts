import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { BiasMatch } from '@/lib/biasDetection';

const biasPluginKey = new PluginKey('biasUnderline');

/**
 * Maps plain-text character offsets to ProseMirror doc positions
 * by walking the document tree node by node.
 */
function plainOffsetToDocPos(doc: any, offset: number): number {
  let pos = 0;
  let charCount = 0;

  doc.descendants((node: any, nodePos: number) => {
    if (pos > 0) return false; // already found
    if (node.isText && node.text) {
      if (charCount + node.text.length > offset) {
        pos = nodePos + (offset - charCount);
        return false;
      }
      charCount += node.text.length;
    }
    return true;
  });

  return pos || 0;
}

export const BiasUnderlineExtension = Extension.create({
  name: 'biasUnderline',

  addStorage() {
    return {
      matches: [] as BiasMatch[],
    };
  },

  addProseMirrorPlugins() {
    const ext = this;

    return [
      new Plugin({
        key: biasPluginKey,

        state: {
          init: () => DecorationSet.empty,
          apply(tr, oldSet) {
            const meta = tr.getMeta(biasPluginKey);
            if (meta !== undefined) {
              ext.storage.matches = (meta as BiasMatch[]) ?? [];
              if (!meta || (meta as BiasMatch[]).length === 0) return DecorationSet.empty;

              const decorations = (meta as BiasMatch[])
                .map((match, idx) => {
                  const from = plainOffsetToDocPos(tr.doc, match.from);
                  const to = plainOffsetToDocPos(tr.doc, match.to);
                  if (from >= to) return null;

                  return Decoration.inline(from, to, {
                    class: 'bias-underline',
                    'data-bias-type': match.type,
                    'data-bias-index': String(idx),
                    'data-bias-word': match.word,
                    'data-bias-suggestion': match.suggestion,
                  });
                })
                .filter(Boolean) as Decoration[];

              return DecorationSet.create(tr.doc, decorations);
            }

            return oldSet.map(tr.mapping, tr.doc);
          },
        },

        props: {
          decorations(state) {
            return biasPluginKey.getState(state);
          },
        },
      }),
    ];
  },
});

export { biasPluginKey };
