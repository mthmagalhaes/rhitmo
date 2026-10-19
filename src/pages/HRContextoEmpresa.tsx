// Cultura e régua da empresa (RH Admin / Owner).
// Materiais da empresa -> IA extrai Valores, Comportamentos e Régua -> RH edita -> publica versão.
// Avaliações guardam a versão usada; mudar a régua não altera avaliações antigas.
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHRAdmin } from '@/components/HRAdminGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, Upload, ClipboardPaste, Trash2, Sparkles, Plus, ArrowUp, ArrowDown, Pencil, Check, X, FileText, Rocket, Compass,
} from 'lucide-react';
import { toast } from 'sonner';
import { extractTextFromFile, isFileSupported } from '@/lib/fileParser';

interface Doc { id: string; title: string; mime: string | null; status: string; error: string | null; created_at: string; file_path: string | null }
interface Item {
  id: string; version_id: string; kind: string; category_label: string | null; parent_id: string | null;
  title: string; description: string | null; examples: Record<string, string> | null; position: number;
  source_excerpt: string | null; edited_manually: boolean;
}
interface Version { id: string; version: number; status: string; published_at: string | null }

async function invokeCtx(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('extract-org-context', { body });
  if (error) {
    let msg = error.message;
    try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  return data;
}

const card = 'rounded-3xl border border-border/50 bg-card p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)]';

export default function HRContextoEmpresa() {
  const { workspaceId, workspaceName } = useHRAdmin();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');

  const { data: docs = [] } = useQuery({
    queryKey: ['org-context-docs', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.from('org_context_documents')
        .select('id, title, mime, status, error, created_at, file_path').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
      if (error) throw error;
      return data as Doc[];
    },
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['org-context-versions', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.from('org_context_versions')
        .select('id, version, status, published_at').eq('workspace_id', workspaceId).order('version', { ascending: false });
      if (error) throw error;
      return data as Version[];
    },
  });
  const draft = versions.find((v) => v.status === 'draft') ?? null;
  const published = versions.find((v) => v.status === 'published') ?? null;
  const shown = draft ?? published;

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['org-context-items', shown?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('org_context_items').select('*').eq('version_id', shown!.id).order('position');
      if (error) throw error;
      return data as Item[];
    },
    enabled: !!shown,
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['org-context-docs', workspaceId] });
    qc.invalidateQueries({ queryKey: ['org-context-versions', workspaceId] });
    qc.invalidateQueries({ queryKey: ['org-context-items'] });
    qc.invalidateQueries({ queryKey: ['org-context-published', workspaceId] });
  };

  const ensureDraft = async (): Promise<string> => {
    if (draft) return draft.id;
    const res = await invokeCtx({ action: 'ensure_draft', workspaceId });
    refreshAll();
    return res.versionId;
  };

  // ---------- Materiais ----------
  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (!isFileSupported(file)) { toast.error(`${file.name}: formato não suportado`); continue; }
      let text = ''; let err: string | null = null;
      try { text = await extractTextFromFile(file); } catch (e: any) { err = e.message; }
      const path = `${workspaceId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
      const up = await supabase.storage.from('org-context').upload(path, file, { contentType: file.type || undefined });
      const { error } = await supabase.from('org_context_documents').insert({
        workspace_id: workspaceId, title: file.name, mime: file.type || null, file_path: up.error ? null : path,
        extracted_text: text || null, status: text ? 'ready' : 'error', error: text ? null : (err ?? 'Sem texto legível'),
      });
      if (error) toast.error(`${file.name}: ${error.message}`);
      else if (!text) toast.error(`${file.name}: não conseguimos ler o texto. Tente exportar como PDF ou colar o conteúdo.`);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    refreshAll();
  };

  const savePaste = async () => {
    if (!pasteText.trim()) return;
    const { error } = await supabase.from('org_context_documents').insert({
      workspace_id: workspaceId, title: pasteTitle.trim() || 'Texto colado', mime: 'text/plain', extracted_text: pasteText.trim(), status: 'ready',
    });
    if (error) return toast.error(error.message);
    setPasteOpen(false); setPasteTitle(''); setPasteText('');
    refreshAll();
  };

  const removeDoc = async (d: Doc) => {
    if (d.file_path) await supabase.storage.from('org-context').remove([d.file_path]);
    const { error } = await supabase.from('org_context_documents').delete().eq('id', d.id);
    if (error) toast.error(error.message); else refreshAll();
  };

  const runExtraction = async () => {
    setExtracting(true);
    try {
      const res = await invokeCtx({ action: 'extract', workspaceId });
      toast.success(`Análise pronta: ${res.added} novo(s), ${res.updated} atualizado(s)${res.kept ? `, ${res.kept} editado(s) por você mantido(s)` : ''}.`);
      refreshAll();
    } catch (e: any) { toast.error(e.message); } finally { setExtracting(false); }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const res = await invokeCtx({ action: 'publish', workspaceId });
      toast.success(`Versão ${res.version} publicada. Líderes já podem usar na avaliação.`);
      refreshAll();
    } catch (e: any) { toast.error(e.message); } finally { setPublishing(false); }
  };

  // ---------- Itens ----------
  const addItem = async (kind: string, extra: Partial<Item> = {}) => {
    const versionId = await ensureDraft();
    const pos = items.reduce((m, i) => Math.max(m, i.position), 0) + 1;
    const { error } = await supabase.from('org_context_items').insert({
      version_id: versionId, workspace_id: workspaceId, kind, title: 'Novo item', position: pos, edited_manually: true, ...extra,
    });
    if (error) toast.error(error.message); else refreshAll();
  };
  const updateItem = async (id: string, patch: Partial<Item>) => {
    if (!draft) { toast.message('Clique em "Editar" para criar um rascunho antes de mudar.'); return; }
    const { error } = await supabase.from('org_context_items').update({ ...patch, edited_manually: true, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error(error.message); else refreshAll();
  };
  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('org_context_items').delete().eq('id', id);
    if (error) toast.error(error.message); else refreshAll();
  };
  const move = async (list: Item[], idx: number, dir: -1 | 1) => {
    const a = list[idx]; const b = list[idx + dir];
    if (!a || !b) return;
    await Promise.all([
      supabase.from('org_context_items').update({ position: b.position }).eq('id', a.id),
      supabase.from('org_context_items').update({ position: a.position }).eq('id', b.id),
    ]);
    refreshAll();
  };

  const values = items.filter((i) => i.kind === 'value');
  const behaviors = items.filter((i) => i.kind === 'behavior');
  const looseBehaviors = behaviors.filter((b) => !b.parent_id || !values.some((v) => v.id === b.parent_id));
  const scale = items.filter((i) => i.kind === 'scale_level');
  const editable = !!draft;

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10 space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
          <Compass className="h-3.5 w-3.5" /> Cultura e régua
        </div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Contexto da {workspaceName}</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Envie os materiais da empresa (framework de performance, manual de cultura, apresentações). A Rhitmo organiza em valores, comportamentos e régua. Você revisa, ajusta e publica. Líderes usam a versão publicada nas avaliações, sem tirar deles a decisão.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {published && <Badge variant="default">Publicada: v{published.version}</Badge>}
          {draft && <Badge variant="secondary">Rascunho em edição: v{draft.version}</Badge>}
          {!published && !draft && <Badge variant="outline">Nada publicado ainda</Badge>}
        </div>
      </header>

      {/* 1. Materiais */}
      <section className={card}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold tracking-tight">1. Materiais da empresa</h2>
            <p className="text-xs text-muted-foreground mt-1">PDF, Word, PowerPoint, texto ou imagem. Google Docs e Slides: use Arquivo → Fazer download → PDF ou PowerPoint, ou cole o texto.</p>
          </div>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <Button variant="outline" className="rounded-xl" onClick={() => setPasteOpen(true)}><ClipboardPaste className="h-4 w-4 mr-2" /> Colar texto</Button>
            <Button className="rounded-xl" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />} Enviar arquivos
            </Button>
          </div>
        </div>

        <div className="mt-5 divide-y divide-border/60">
          {docs.length === 0 && <p className="text-sm text-muted-foreground py-4">Nenhum material enviado ainda.</p>}
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-3 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString('pt-BR')}{d.error ? ` · ${d.error}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={d.status === 'error' ? 'destructive' : 'secondary'}>{d.status === 'error' ? 'Sem texto' : 'Pronto'}</Badge>
                <Button size="icon" variant="ghost" aria-label="Remover material" onClick={() => removeDoc(d)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <Button className="rounded-xl" disabled={extracting || !docs.some((d) => d.status === 'ready')} onClick={runExtraction}>
            {extracting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {extracting ? 'Analisando (pode levar até 1 min)…' : 'Analisar materiais com IA'}
          </Button>
        </div>
      </section>

      {/* 2. Valores, comportamentos e régua */}
      <section className={card}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold tracking-tight">2. Valores, comportamentos e régua</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {editable ? 'Você está editando um rascunho. Nada muda para os líderes até publicar.' : published ? 'Mostrando a versão publicada. Clique em Editar para criar um rascunho.' : 'Analise os materiais ou adicione itens à mão.'}
            </p>
          </div>
          <div className="flex gap-2">
            {!editable && (
              <Button variant="outline" className="rounded-xl" onClick={() => ensureDraft().catch((e) => toast.error(e.message))}>
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </Button>
            )}
            {editable && (
              <Button className="rounded-xl" disabled={publishing || items.length === 0} onClick={publish}>
                {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />} Publicar versão
              </Button>
            )}
          </div>
        </div>

        {loadingItems ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="mt-6 space-y-8">
            <Group title="Valores" onAdd={() => addItem('value')} editable={editable || !published}>
              {values.length === 0 && <Empty />}
              {values.map((v, idx) => (
                <div key={v.id} className="space-y-2">
                  <ItemRow item={v} editable={editable} onSave={updateItem} onDelete={deleteItem}
                    onUp={idx > 0 ? () => move(values, idx, -1) : undefined} onDown={idx < values.length - 1 ? () => move(values, idx, 1) : undefined} />
                  <div className="pl-6 space-y-2 border-l border-border/60 ml-3">
                    {behaviors.filter((b) => b.parent_id === v.id).map((b) => (
                      <ItemRow key={b.id} item={b} editable={editable} onSave={updateItem} onDelete={deleteItem} small values={values} />
                    ))}
                    {(editable || !published) && (
                      <Button size="sm" variant="ghost" className="rounded-xl text-xs" onClick={() => addItem('behavior', { parent_id: v.id, title: 'Novo comportamento' })}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Comportamento
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </Group>

            <Group title="Comportamentos sem valor ligado" onAdd={() => addItem('behavior', { title: 'Novo comportamento' })} editable={editable || !published}>
              {looseBehaviors.length === 0 && <Empty />}
              {looseBehaviors.map((b) => <ItemRow key={b.id} item={b} editable={editable} onSave={updateItem} onDelete={deleteItem} values={values} />)}
            </Group>

            <Group title="Régua (do nível mais baixo ao mais alto)" onAdd={() => addItem('scale_level', { title: 'Novo nível' })} editable={editable || !published}>
              {scale.length === 0 && <Empty text="Sem régua, as avaliações usam: Precisa subir / Dentro do esperado / Subindo a barra / Acima do esperado." />}
              {scale.map((s, idx) => (
                <ItemRow key={s.id} item={s} editable={editable} onSave={updateItem} onDelete={deleteItem}
                  onUp={idx > 0 ? () => move(scale, idx, -1) : undefined} onDown={idx < scale.length - 1 ? () => move(scale, idx, 1) : undefined} />
              ))}
            </Group>

          </div>
        )}
      </section>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Colar texto</DialogTitle>
            <DialogDescription>Cole o conteúdo de um Google Doc, Slides ou qualquer material da empresa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Título</Label><Input value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)} placeholder="Framework de Performance v1.1" /></div>
            <div className="space-y-1"><Label>Conteúdo</Label><Textarea rows={10} value={pasteText} onChange={(e) => setPasteText(e.target.value)} /></div>
          </div>
          <DialogFooter><Button className="rounded-xl" onClick={savePaste} disabled={!pasteText.trim()}>Salvar material</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Group({ title, onAdd, editable, children }: { title: string; onAdd: () => void; editable: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {editable && <Button size="sm" variant="ghost" className="rounded-xl text-xs" onClick={onAdd}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
const Empty = ({ text = 'Nenhum item ainda.' }: { text?: string }) => <p className="text-xs text-muted-foreground">{text}</p>;

function ItemRow({
  item, editable, onSave, onDelete, onUp, onDown, small, values,
}: {
  item: Item; editable: boolean; small?: boolean; values?: Item[];
  onSave: (id: string, patch: Partial<Item>) => void; onDelete: (id: string) => void; onUp?: () => void; onDown?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [desc, setDesc] = useState(item.description ?? '');

  if (editing) {
    return (
      <div className="rounded-2xl border border-primary/40 p-3 space-y-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="rounded-xl" placeholder="Descrição" />
        {item.kind === 'behavior' && values && values.length > 0 && (
          <Select value={item.parent_id ?? 'none'} onValueChange={(v) => onSave(item.id, { parent_id: v === 'none' ? null : v })}>
            <SelectTrigger className="h-8 rounded-xl text-xs w-64"><SelectValue placeholder="Ligar a um valor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem valor ligado</SelectItem>
              {values.map((v) => <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex gap-2">
          <Button size="sm" className="rounded-xl" onClick={() => { onSave(item.id, { title: title.trim() || item.title, description: desc.trim() || null }); setEditing(false); }}><Check className="h-3.5 w-3.5 mr-1" /> Salvar</Button>
          <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5 mr-1" /> Cancelar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group rounded-2xl ${small ? 'bg-muted/30 p-2.5' : 'bg-muted/40 p-3'} flex items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className={`${small ? 'text-sm' : 'text-sm font-semibold'} tracking-tight`}>{item.title}</p>
        {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
        {item.examples && Object.keys(item.examples).length > 0 && (
          <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
            {item.examples.above && <p><span className="font-medium">Acima:</span> {item.examples.above}</p>}
            {item.examples.expected && <p><span className="font-medium">Esperado:</span> {item.examples.expected}</p>}
            {item.examples.below && <p><span className="font-medium">Abaixo:</span> {item.examples.below}</p>}
          </div>
        )}
        {item.source_excerpt && <p className="text-[11px] italic text-muted-foreground/80 mt-1 line-clamp-2">“{item.source_excerpt}”</p>}
      </div>
      {editable && (
        <div className="flex items-center gap-0.5 shrink-0 opacity-60 group-hover:opacity-100">
          {onUp && <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Subir" onClick={onUp}><ArrowUp className="h-3.5 w-3.5" /></Button>}
          {onDown && <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Descer" onClick={onDown}><ArrowDown className="h-3.5 w-3.5" /></Button>}
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Editar" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Excluir" onClick={() => onDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      )}
    </div>
  );
}
