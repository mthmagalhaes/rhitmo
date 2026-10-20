// Caminho "Guiado pela cultura": um cartão por valor/comportamento da empresa.
// A Rhitmo sugere texto + nível da régua; o líder aceita, edita, regenera ou pula.
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Loader2, RefreshCw, SkipForward, FileText, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { citationMarkdownComponents } from '@/lib/markdownCitations';
import { RhitmoThinking } from '@/components/ai/RhitmoThinking';

interface CultureItem {
  id: string;
  item_title: string;
  item_kind: string;
  position: number;
  suggested_text: string | null;
  final_text: string | null;
  suggested_level: string | null;
  final_level: string | null;
  level_justification: string | null;
  status: string; // pending | insufficient | accepted | edited | skipped
}

const DEFAULT_LEVELS = ['Precisa subir', 'Dentro do esperado', 'Subindo a barra', 'Acima do esperado'];

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('culture-review-assist', { body });
  if (error) {
    let msg = error.message;
    try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  return data;
}

export function CultureGuidedPanel({
  reviewId,
  versionId,
  readOnly,
  needsAssembly,
  onAssembled,
}: {
  reviewId: string;
  versionId: string | null;
  readOnly: boolean;
  needsAssembly?: boolean;
  onAssembled: (content: string, advance: boolean) => void | Promise<void>;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['review-culture-items', reviewId],
    queryFn: async () => {
      // Itens extras da empresa ('custom') foram aposentados: só valores e comportamentos.
      const { data, error } = await supabase.from('review_culture_items').select('*').eq('review_id', reviewId).neq('item_kind', 'custom').order('position');
      if (error) throw error;
      return (data ?? []) as CultureItem[];
    },
    // Enquanto houver cartões sem sugestão, recarrega (sugestões chegam em lote).
    refetchInterval: (q) => ((q.state.data as CultureItem[] | undefined)?.some((i) => !i.suggested_text && i.status === 'pending') ? 4000 : false),
  });

  const { data: levels = DEFAULT_LEVELS } = useQuery({
    queryKey: ['org-context-levels', versionId],
    queryFn: async () => {
      const { data } = await supabase.from('org_context_items').select('title').eq('version_id', versionId!).eq('kind', 'scale_level').order('position');
      return data && data.length ? data.map((d) => d.title) : DEFAULT_LEVELS;
    },
    enabled: !!versionId,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['review-culture-items', reviewId] });

  const update = async (id: string, patch: Partial<CultureItem>) => {
    const { error } = await supabase.from('review_culture_items').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) toast({ title: 'Não foi possível salvar', description: error.message, variant: 'destructive' });
    refresh();
  };

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try { await fn(); refresh(); } catch (e: any) {
      toast({ title: 'Não deu certo', description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const reviewed = items.filter((i) => ['accepted', 'edited', 'skipped'].includes(i.status)).length;
  const pendingSuggestions = items.filter((i) => !i.suggested_text && i.status === 'pending').length;

  // Se as sugestões não avançarem em 90s, mostra erro claro com "Tentar novamente".
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    setStalled(false);
    if (pendingSuggestions === 0) return;
    const t = setTimeout(() => setStalled(true), 90_000);
    return () => clearTimeout(t);
  }, [pendingSuggestions]);

  const assemble = async (advance: boolean) => {
    const data = await invoke({ action: 'assemble', reviewId });
    await onAssembled(data.content, advance);
  };

  // Monta o Rascunho Geral sozinho assim que as sugestões ficam prontas.
  const autoTried = useRef(false);
  const hasSuggestions = items.some((i) => i.suggested_text || i.final_text);
  useEffect(() => {
    if (readOnly || !needsAssembly || autoTried.current || isLoading) return;
    if (items.length === 0 || pendingSuggestions > 0 || !hasSuggestions) return;
    autoTried.current = true;
    setBusy('assemble');
    assemble(false).catch(() => { /* usuário pode montar pelo botão */ }).finally(() => setBusy(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAssembly, items.length, pendingSuggestions, hasSuggestions, isLoading, readOnly]);

  if (isLoading) return <RhitmoThinking hint={null} title="Abrindo os itens da cultura" steps={['Carregando...']} />;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center space-y-3">
        {busy === 'init' ? (
          <RhitmoThinking className="text-left" steps={['Lendo os valores e a régua da empresa...', 'Buscando anotações e 1:1s...', 'Escrevendo as sugestões...']} />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Ainda não há itens da cultura nesta avaliação.</p>
            {!readOnly && (
              <Button size="sm" className="rounded-xl" onClick={() => run('init', async () => {
                await invoke({ action: 'init', reviewId });
                await invoke({ action: 'suggest_all', reviewId });
              })}>
                <Sparkles className="h-4 w-4 mr-2" />
                Preparar itens da cultura
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-muted/40 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{reviewed} de {items.length} itens revisados</span>
        </div>
        <Progress value={items.length ? (reviewed / items.length) * 100 : 0} />
      </div>

      {pendingSuggestions > 0 && (
        <RhitmoThinking
          error={stalled ? 'As sugestões estão demorando mais que o normal. Você pode pedir de novo, os itens já prontos são mantidos.' : null}
          onRetry={() => { setStalled(false); run('retry', () => invoke({ action: 'suggest_all', reviewId })); }}
          steps={[
            'Buscando anotações e 1:1s do período...',
            'Lendo os valores e a régua da empresa...',
            `Escrevendo ${pendingSuggestions} sugestão(ões)...`,
          ]}
        />
      )}

      {busy === 'assemble' && (
        <RhitmoThinking steps={['Juntando os itens revisados...', 'Montando o documento...']} stepMs={2500} />
      )}

      {items.map((it) => (
        <CultureCard
          key={it.id}
          item={it}
          levels={levels}
          readOnly={readOnly}
          busy={busy === it.id}
          onSave={(patch) => update(it.id, patch)}
          onRegenerate={() => run(it.id, () => invoke({ action: 'suggest', reviewId, itemId: it.id }))}
        />
      ))}

      {!readOnly && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur py-3 flex justify-end">
          <Button className="rounded-xl" disabled={busy === 'assemble' || pendingSuggestions > 0 || !hasSuggestions} onClick={() => run('assemble', async () => {
            await assemble(true);
            toast({ title: 'Documento atualizado', description: 'Complete visão geral, desenvolvimento e próximos passos no editor.' });
          })}>
            {busy === 'assemble' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            Avançar para Rascunho Geral →
          </Button>
        </div>
      )}
    </div>
  );
}

function CultureCard({
  item, levels, readOnly, busy, onSave, onRegenerate,
}: {
  item: CultureItem;
  levels: string[];
  readOnly: boolean;
  busy: boolean;
  onSave: (patch: Partial<CultureItem>) => void;
  onRegenerate: () => void;
}) {
  const [text, setText] = useState(item.final_text ?? item.suggested_text ?? '');
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setText(item.final_text ?? item.suggested_text ?? ''); }, [item.final_text, item.suggested_text, editing]);

  const level = item.final_level ?? item.suggested_level ?? '';
  const statusBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    accepted: { label: 'Aceito', variant: 'default' },
    edited: { label: 'Editado', variant: 'default' },
    skipped: { label: 'Fora da avaliação', variant: 'outline' },
    insufficient: { label: 'Pouca evidência', variant: 'secondary' },
  };
  const badge = statusBadge[item.status];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {item.item_kind === 'value' ? 'Valor' : item.item_kind === 'behavior' ? 'Comportamento' : 'Item da empresa'}
          </p>
          <h4 className="font-semibold tracking-tight">{item.item_title}</h4>
        </div>
        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
      </div>

      {busy ? (
        <RhitmoThinking compact hint={null} title="Reescrevendo este item" steps={['Relendo as evidências...', 'Escrevendo nova sugestão...']} stepMs={3000} />
      ) : !item.suggested_text && item.status === 'pending' ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> A Rhitmo está lendo as evidências…</div>
      ) : editing ? (
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="rounded-xl" />
      ) : (
        <div className="text-sm leading-relaxed text-foreground/90"><ReactMarkdown components={citationMarkdownComponents as any}>{text}</ReactMarkdown></div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={level || undefined} onValueChange={(v) => onSave({ final_level: v })} disabled={readOnly}>
          <SelectTrigger className="w-52 h-8 rounded-xl text-xs"><SelectValue placeholder="Nível na régua" /></SelectTrigger>
          <SelectContent>{levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
        </Select>
        {item.level_justification && <span className="text-xs text-muted-foreground">{item.level_justification}</span>}
      </div>

      {!readOnly && (
        <div className="flex flex-wrap gap-2 pt-1">
          {editing ? (
            <>
              <Button size="sm" className="rounded-xl" onClick={() => { onSave({ final_text: text, status: 'edited' }); setEditing(false); }}>
                <Check className="h-3.5 w-3.5 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setEditing(false)}>Cancelar</Button>
            </>
          ) : (
            <>
              <Button size="sm" className="rounded-xl" disabled={!text} onClick={() => onSave({ final_text: text, status: 'accepted' })}>
                <Check className="h-3.5 w-3.5 mr-1" /> Aceitar
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setEditing(true)}>Editar</Button>
              <Button size="sm" variant="outline" className="rounded-xl" disabled={busy} onClick={onRegenerate}>
                {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />} Regenerar
              </Button>
              <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => onSave({ status: 'skipped' })}>
                <SkipForward className="h-3.5 w-3.5 mr-1" /> Deixar de fora
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
