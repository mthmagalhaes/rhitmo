import { Suspense, lazy } from 'react';
import { cn } from '@/lib/utils';
import type { RichTextEditorProps } from '@/components/ui/rich-text-editor-impl';

/**
 * Lazy wrapper around the Tiptap-based editor.
 * Keeps @tiptap/ProseMirror out of the initial bundle: it is only fetched
 * when an editor is actually rendered (dialogs, review sheets, notes).
 */
const RichTextEditorImpl = lazy(() =>
  import('@/components/ui/rich-text-editor-impl').then((m) => ({ default: m.RichTextEditor }))
);

const EditorSkeleton = ({ minHeight = '200px' }: { minHeight?: string }) => (
  <div className={cn('rounded-xl border border-input bg-background overflow-hidden')}>
    <div className="h-11 border-b bg-muted/30" />
    <div className="p-3 animate-pulse space-y-2" style={{ minHeight }}>
      <div className="h-3 w-2/3 rounded bg-muted" />
      <div className="h-3 w-1/2 rounded bg-muted" />
    </div>
  </div>
);

export const RichTextEditor = (props: RichTextEditorProps) => (
  <Suspense fallback={<EditorSkeleton minHeight={props.minHeight} />}>
    <RichTextEditorImpl {...props} />
  </Suspense>
);

export type { RichTextEditorProps };
