// AI Magic: barrinha que aparece ao selecionar um trecho do Rascunho Geral.
// Reescreve só o trecho; nada muda sem o clique do líder (Ctrl+Z desfaz).
import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Loader2, Sparkles, Check, ArrowDownToLine, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { markdownToEditorHtml } from '@/lib/reviewMarkdown';
import { capture } from '@/lib/productAnalytics';
import { useToast } from '@/hooks/use-toast';

type Action = 'less_formal' | 'more_formal' | 'shorter' | 'constructive' | 'add_evidence' | 'custom';
const ACTIONS: { id: Exclude<Action, 'custom'>; emoji: string; label: string }[] = [
  { id: 'less_formal', emoji: '😊', label: 'Menos formal' },
  { id: 'more_formal', emoji: '👔', label: 'Mais formal' },
  { id: 'shorter', emoji: '🎯', label: 'Mais direto' },
  { id: 'constructive', emoji: '🤝', label: 'Mais construtivo' },
  { id: 'add_evidence', emoji: '🔎', label: 'Adicionar evidência' },
];

function selectedMarkdown(editor: Editor) {
  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to, '\n\n', (node) =>
    node.type.name === 'citation' ? `[doc:${node.attrs.docId}]` : '');
  return { from, to, text };
}

function toInlineHtml(md: string) {
  const html = markdownToEditorHtml(md).trim();
  const single = html.match(/^<p>([\s\S]*)<\/p>$/);
  return single && !single[1].includes('<p>') ? single[1] : html;
}

export function AIMagicMenu({ editor, reviewId }: { editor: Editor; reviewId: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState('');
  const [preview, setPreview] = useState<{ text: string; from: number; to: number; noEvidence: boolean } | null>(null);

  const reset = () => { setPreview(null); setCustom(''); };

  const run = async (action: Action) => {
    const sel = selectedMarkdown(editor);
    if (!sel.text.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('review-rewrite', {
        body: { reviewId, action, text: sel.text, instruction: action === 'custom' ? custom : undefined },
      });
      if (error) {
        let msg = error.message;
        try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* noop */ }
        throw new Error(msg);
      }
      capture('ai_magic_used', { action });
      setPreview({ text: data.text, from: sel.from, to: sel.to, noEvidence: !!data.no_evidence });
    } catch (e: any) {
      toast({ title: 'A Rhitmo não conseguiu ajustar agora', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const apply = (mode: 'replace' | 'below') => {
    if (!preview) return;
    const html = toInlineHtml(preview.text);
    if (mode === 'replace') {
      editor.chain().focus().insertContentAt({ from: preview.from, to: preview.to }, html).run();
    } else {
      const $to = editor.state.doc.resolve(preview.to);
      const end = $to.depth > 0 ? $to.after(1) : preview.to;
      editor.chain().focus().insertContentAt(end, markdownToEditorHtml(preview.text)).run();
    }
    reset();
  };

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e, from, to }) => e.isEditable && (to - from > 3 || !!preview || busy)}
      options={{ placement: 'bottom-start', flip: { padding: { bottom: 96, top: 16 } }, shift: { padding: 16 } }}
      className="z-[60]"
    >
      <div
        onMouseDown={(e) => { if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault(); }}
        className="w-[min(560px,90vw)] rounded-2xl border border-primary/20 bg-card p-2 shadow-[0_8px_30px_rgba(0,0,0,0.10)] space-y-2"
      >
        {preview ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Sugestão da Rhitmo
            </div>
            {preview.noEvidence && (
              <p className="px-1 text-xs text-muted-foreground">Não encontrei uma anotação do período que sustente este trecho, e está tudo bem.</p>
            )}
            <div className="max-h-[min(50vh,420px)] overflow-y-auto overscroll-contain rounded-xl bg-muted/40 p-3 text-sm leading-relaxed whitespace-pre-wrap">
              {preview.text.replace(/\[doc:[0-9a-f-]+\]/gi, '⟨evidência⟩')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" className="rounded-xl h-8" onClick={() => apply('replace')}><Check className="h-3.5 w-3.5 mr-1" /> Substituir</Button>
              <Button size="sm" variant="outline" className="rounded-xl h-8" onClick={() => apply('below')}><ArrowDownToLine className="h-3.5 w-3.5 mr-1" /> Inserir abaixo</Button>
              <Button size="sm" variant="ghost" className="rounded-xl h-8" onClick={reset}><X className="h-3.5 w-3.5 mr-1" /> Descartar</Button>
            </div>
          </div>
        ) : busy ? (
          <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> A Rhitmo está reescrevendo o trecho...
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1">
              {ACTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => run(a.id)}
                  className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-foreground/85 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <span aria-hidden>{a.emoji}</span> {a.label}
                </button>
              ))}
            </div>
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => { e.preventDefault(); if (custom.trim()) run('custom'); }}
            >
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Peça à Rhitmo… (ex.: cite a entrega de setembro)"
                className="h-8 rounded-xl text-xs"
                maxLength={500}
              />
              <Button type="submit" size="sm" variant="ghost" className="h-8 rounded-xl" disabled={!custom.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </>
        )}
      </div>
    </BubbleMenu>
  );
}
