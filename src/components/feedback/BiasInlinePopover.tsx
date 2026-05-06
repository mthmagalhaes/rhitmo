/**
 * BiasInlinePopover — Grammarly-style inline popover that anchors to any
 * `.bias-underline` decoration inside a Tiptap editor. Uses delegated event
 * listeners so it works for dynamically added/removed underlines.
 */
import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Check, X, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { applyBiasSuggestion } from '@/lib/biasReplace';
import type { BiasMatch } from '@/lib/biasDetection';
import { biasPluginKey } from './BiasUnderlineExtension';

interface BiasInlinePopoverProps {
  editor: Editor | null;
  onChange?: (next: BiasMatch[]) => void;
}

const TYPE_LABEL: Record<string, string> = {
  feminine: 'Linguagem com viés',
  masculine: 'Linguagem com viés',
  generic: 'Termo ambíguo',
  ambiguity: 'Termo ambíguo',
};

const TYPE_BADGE: Record<string, string> = {
  feminine: 'border-rose-300 text-rose-700 dark:text-rose-400',
  masculine: 'border-amber-300 text-amber-700 dark:text-amber-400',
  generic: 'border-blue-300 text-blue-700 dark:text-blue-400',
  ambiguity: 'border-blue-300 text-blue-700 dark:text-blue-400',
};

export function BiasInlinePopover({ editor, onChange }: BiasInlinePopoverProps) {
  const [open, setOpen] = useState(false);
  const [match, setMatch] = useState<BiasMatch | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.('.bias-underline') as HTMLElement | null;
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      const matches: BiasMatch[] = editor.storage.biasUnderline?.matches ?? [];
      const idx = parseInt(target.getAttribute('data-bias-index') ?? '-1', 10);
      const m = matches[idx] ?? null;
      if (!m) return;
      const rect = target.getBoundingClientRect();
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
      setMatch(m);
      setOpen(true);
    };

    dom.addEventListener('click', handleClick);
    return () => dom.removeEventListener('click', handleClick);
  }, [editor]);

  const close = () => {
    setOpen(false);
    setMatch(null);
  };

  const applySuggestion = () => {
    if (!editor || !match) return;
    applyBiasSuggestion(editor, match);
    const remaining = (editor.storage.biasUnderline?.matches ?? []).filter(
      (m: BiasMatch) => !(m.from === match.from && m.to === match.to)
    );
    editor.view.dispatch(editor.state.tr.setMeta(biasPluginKey, remaining));
    onChange?.(remaining);
    close();
  };

  const ignore = () => {
    if (!editor || !match) return;
    const remaining = (editor.storage.biasUnderline?.matches ?? []).filter(
      (m: BiasMatch) => !(m.from === match.from && m.to === match.to)
    );
    editor.view.dispatch(editor.state.tr.setMeta(biasPluginKey, remaining));
    onChange?.(remaining);
    close();
  };

  if (!open || !match || !pos) return null;

  return (
    <Popover open={open} onOpenChange={(v) => (!v ? close() : null)}>
      <PopoverTrigger asChild>
        <span
          ref={anchorRef}
          style={{ position: 'absolute', top: pos.top, left: pos.left, width: 1, height: 1 }}
          aria-hidden="true"
        />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-80 p-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
      >
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0', TYPE_BADGE[match.type] ?? '')}
            >
              {TYPE_LABEL[match.type] ?? 'Sugestão'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            "<span className="font-semibold text-foreground">{match.word}</span>"{' '}
            pode soar enviesado. Considere:
          </p>
          <p className="text-sm font-medium text-foreground bg-muted/50 rounded-lg px-2.5 py-1.5">
            {match.suggestion}
          </p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={ignore}
            >
              <X className="h-3 w-3" />
              Ignorar
            </Button>
            <Button
              size="sm"
              className="h-7 px-3 text-xs gap-1 rounded-lg"
              onClick={applySuggestion}
            >
              <Check className="h-3 w-3" />
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
