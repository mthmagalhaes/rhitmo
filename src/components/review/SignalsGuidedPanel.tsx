// Bloco "Sinais & Rede": cartões do Slack e da rede de colaboração que o líder
// aceita, edita, regenera ou deixa de fora antes do Rascunho Geral.
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Check, Loader2, RefreshCw, SkipForward, FileText, Radio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { citationMarkdownComponents } from '@/lib/markdownCitations';
import { RhitmoThinking } from '@/components/ai/RhitmoThinking';

interface SignalItem {
  id: string;
  kind: string;
  title: string;
  suggested_text: string | null;
  final_text: string | null;
  status: string;
}

const KIND_LABEL: Record<string, string> = { delivery: 'Entrega', unblock: 'Bloqueio', recognition: 'Reconhecimento', network: 'Rede' };

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('culture-review-assist', { body });
  if (error) {
    let msg = error.message;
    try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  return data;
}

// Busca de sinais em segundo plano (disparada enquanto o líder revisa a Cultura).
const inflight = new Map<string, Promise<any>>();
export function prefetchSignals(reviewId: string): Promise<any> {
  const existing = inflight.get(reviewId);
  if (existing) return existing;
  const p = invoke({ action: 'signals_init', reviewId }).finally(() => inflight.delete(reviewId));
  inflight.set(reviewId, p);
  return p;
}

// Montagem do Rascunho Geral com texto chegando aos poucos (streaming).
async function streamAssemble(reviewId: string, onPartial: (text: string) => void): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/culture-review-assist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ action: 'assemble', reviewId, stream: true }),
  });
  if (!res.ok || !res.body || !res.headers.get('content-type')?.includes('text/event-stream')) {
    let msg = `Falha ao montar (${res.status})`;
    try { msg = (await res.json())?.error ?? msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
      if (!chunk.startsWith('data: ')) continue;
      const evt = JSON.parse(chunk.slice(6));
      if (evt.type === 'delta') { text += evt.text; onPartial(text); }
      else if (evt.type === 'done') return evt.content as string;
      else if (evt.type === 'error') throw new Error(evt.error);
    }
  }
  if (!text.trim()) throw new Error('A Rhitmo não conseguiu montar o documento. Tente novamente.');
  return text;
}

export function SignalsGuidedPanel({
  reviewId, readOnly, onAssembled, onAssembleStart, onAssembleFailed, onAssembleDelta,
}: {
  reviewId: string;
  readOnly: boolean;
  onAssembled: (content: string, advance: boolean) => void | Promise<void>;
  onAssembleStart?: () => void;
  onAssembleFailed?: () => void;
  onAssembleDelta?: (partial: string) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['review-signal-items', reviewId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('review_signal_items').select('*').eq('review_id', reviewId).order('position');
      if (error) throw error;
      return (data ?? []) as SignalItem[];
    },
  });

  // Se a busca em segundo plano ainda está rodando, mostra "pensando" e espera por ela.
  useEffect(() => {
    const p = inflight.get(reviewId);
    if (!p) return;
    setBusy('init');
    p.then((r) => setEmpty(!!r?.empty || r?.count === 0)).catch(() => {}).finally(() => {
      setBusy(null);
      qc.invalidateQueries({ queryKey: ['review-signal-items', reviewId] });
    });
  }, [reviewId, qc]);
  const refresh = () => qc.invalidateQueries({ queryKey: ['review-signal-items', reviewId] });

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try { await fn(); refresh(); } catch (e: any) {
      toast({ title: 'Não deu certo', description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const fetchSignals = () => run('init', async () => {
    const r = await invoke({ action: 'signals_init', reviewId });
    setEmpty(!!r?.empty || r?.count === 0);
  });

  const update = async (id: string, patch: Partial<SignalItem>) => {
    const { error } = await (supabase as any).from('review_signal_items').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) toast({ title: 'Não foi possível salvar', description: error.message, variant: 'destructive' });
    refresh();
  };

  const advance = () => run('assemble', async () => {
    onAssembleStart?.();
    try {
      const content = await streamAssemble(reviewId, (partial) => onAssembleDelta?.(partial));
      await onAssembled(content, true);
      toast({ title: 'Rascunho Geral montado', description: 'Cultura e sinais aceitos entraram no documento.' });
    } catch (e) {
      onAssembleFailed?.();
      throw e;
    }
  });

  const reviewed = items.filter((i) => ['accepted', 'edited', 'skipped'].includes(i.status)).length;

  if (isLoading) return <RhitmoThinking hint={null} title="Abrindo os sinais" steps={['Carregando...']} />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-muted/40 p-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold tracking-tight">Sinais do Slack e rede de colaboração</p>
          <p className="text-xs text-muted-foreground">
            Entregas, bloqueios, reconhecimentos e com quem a pessoa mais colaborou no período. Só entra no rascunho o que você aceitar. O liderado não vê estes cartões.
          </p>
          {items.length > 0 && <p className="text-[11px] text-muted-foreground">{reviewed} de {items.length} revisados</p>}
        </div>
        {!readOnly && (
          <Button size="sm" variant={items.length ? 'outline' : 'default'} className="rounded-xl shrink-0" disabled={!!busy} onClick={fetchSignals}>
            {busy === 'init' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Radio className="h-4 w-4 mr-2" />}
            {items.length ? 'Buscar de novo' : 'Buscar sinais'}
          </Button>
        )}
      </div>

      {busy === 'init' && (
        <RhitmoThinking steps={['Lendo os sinais do Slack do período...', 'Olhando a rede de colaboração...', 'Agrupando em cartões...']} />
      )}
      {busy === 'assemble' && (
        <RhitmoThinking steps={['Juntando cultura e sinais aceitos...', 'Montando o documento...']} stepMs={2500} />
      )}

      {items.length === 0 && busy !== 'init' && (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {empty ? 'Sem sinais do Slack neste período. Você pode seguir para o Rascunho Geral.' : 'Clique em "Buscar sinais" para a Rhitmo trazer o que aconteceu no Slack, ou siga direto para o rascunho.'}
        </div>
      )}

      {items.map((it) => (
        <SignalCard key={it.id} item={it} readOnly={readOnly} busy={busy === it.id}
          onSave={(p) => update(it.id, p)}
          onRegenerate={() => run(it.id, () => invoke({ action: 'signals_suggest', reviewId, itemId: it.id }))} />
      ))}

      {!readOnly && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur py-3 flex justify-end">
          <Button className="rounded-xl" disabled={!!busy} onClick={advance}>
            {busy === 'assemble' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            Avançar para Rascunho Geral →
          </Button>
        </div>
      )}
    </div>
  );
}

function SignalCard({ item, readOnly, busy, onSave, onRegenerate }: {
  item: SignalItem; readOnly: boolean; busy: boolean;
  onSave: (p: Partial<SignalItem>) => void; onRegenerate: () => void;
}) {
  const [text, setText] = useState(item.final_text ?? item.suggested_text ?? '');
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setText(item.final_text ?? item.suggested_text ?? ''); }, [item.final_text, item.suggested_text, editing]);
  const badge: Record<string, { label: string; variant: 'default' | 'outline' }> = {
    accepted: { label: 'Aceito', variant: 'default' }, edited: { label: 'Editado', variant: 'default' }, skipped: { label: 'Fora da avaliação', variant: 'outline' },
  };
  const b = badge[item.status];
  return (
    <div className={`rounded-2xl border border-border/60 bg-card p-4 space-y-3 shadow-[0_2px_20px_rgba(0,0,0,0.04)] ${item.status === 'skipped' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{KIND_LABEL[item.kind] ?? item.kind}</p>
          <h4 className="font-semibold tracking-tight">{item.title}</h4>
        </div>
        {b && <Badge variant={b.variant}>{b.label}</Badge>}
      </div>
      {busy ? (
        <RhitmoThinking compact hint={null} title="Reescrevendo este cartão" steps={['Relendo os sinais...', 'Escrevendo nova versão...']} stepMs={3000} />
      ) : editing ? (
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="rounded-xl" />
      ) : (
        <div className="text-sm leading-relaxed text-foreground/90"><ReactMarkdown components={citationMarkdownComponents as any}>{text}</ReactMarkdown></div>
      )}
      {!readOnly && (
        <div className="flex flex-wrap gap-2 pt-1">
          {editing ? (
            <>
              <Button size="sm" className="rounded-xl" onClick={() => { onSave({ final_text: text, status: 'edited' }); setEditing(false); }}><Check className="h-3.5 w-3.5 mr-1" /> Salvar</Button>
              <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setEditing(false)}>Cancelar</Button>
            </>
          ) : (
            <>
              <Button size="sm" className="rounded-xl" disabled={!text} onClick={() => onSave({ status: 'accepted' })}><Check className="h-3.5 w-3.5 mr-1" /> Aceitar</Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setEditing(true)}>Editar</Button>
              <Button size="sm" variant="outline" className="rounded-xl" disabled={busy} onClick={onRegenerate}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerar</Button>
              <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => onSave({ status: 'skipped' })}><SkipForward className="h-3.5 w-3.5 mr-1" /> Deixar de fora</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
