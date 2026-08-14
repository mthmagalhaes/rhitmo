// Granola-style expanded view for meeting transcripts in the Diário de Bordo.
//
// Three tabs:
//   • Resumo      → structured_summary (TL;DR, topics, decisions, action items)
//   • Transcrição → speaker-grouped turns (chat-style) parsed from raw text
//   • Conversar   → contextual chat scoped to THIS meeting (chat-transcript fn)
//
// If structured_summary is missing, we auto-trigger summarize-transcript on
// first open so older meetings backfill themselves without manual reprocessing.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Send, FileText, MessageCircle, Loader2, CheckCircle2, AlertTriangle, Download, Copy, FileDown, FileType2, Printer } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { parseTranscript, colorForSpeaker, speakerInitials } from '@/lib/transcriptParser';
import { toast } from 'sonner';

interface ActionItem { task: string; owner?: string; due?: string }
interface Topic { title: string; summary: string }
interface StructuredSummary {
  tldr?: string;
  topics?: Topic[];
  decisions?: string[];
  action_items?: ActionItem[];
  sentiment?: 'positive' | 'neutral' | 'concerned' | 'tense';
  highlights?: string[];
}

interface PersonalLens {
  member_id?: string;
  member_name?: string;
  spoke?: boolean;
  participation?: 'active' | 'passive' | 'mentioned_only' | 'absent';
  key_points?: string[];
  commitments?: { task: string; due?: string }[];
  mentions?: string[];
  questions_for_1on1?: string[];
}

interface OriginMeta {
  label: string;
  badgeClass: string;
}

interface Props {
  feedbackId: string;
  content: string;
  structuredSummary: StructuredSummary | null;
  personalLens?: PersonalLens | null;
  memberName?: string;
  origin?: OriginMeta | null;
}

const sentimentLabel: Record<string, { label: string; tone: string }> = {
  positive:  { label: 'Tom positivo',    tone: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  neutral:   { label: 'Tom neutro',      tone: 'bg-slate-500/10 text-slate-700 border-slate-200' },
  concerned: { label: 'Sinais de preocupação', tone: 'bg-amber-500/10 text-amber-800 border-amber-200' },
  tense:     { label: 'Conversa tensa',  tone: 'bg-rose-500/10 text-rose-700 border-rose-200' },
};

export function TranscriptExpandedView({ feedbackId, content, structuredSummary, personalLens, memberName, origin }: Props) {
  const [summary, setSummary] = useState<StructuredSummary | null>(structuredSummary);
  const [lens, setLens] = useState<PersonalLens | null>(personalLens ?? null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [lensGenerating, setLensGenerating] = useState(false);
  const [tab, setTab] = useState<'summary' | 'transcript' | 'chat'>('summary');

  const turns = useMemo(() => parseTranscript(content), [content]);

  // Auto-generate summary the first time this is opened, if missing.
  const triggeredRef = useRef(false);
  useEffect(() => {
    if ((summary && lens) || triggeredRef.current) return;
    if (!content || content.length < 200) return;
    triggeredRef.current = true;
    if (!summary) setSummaryLoading(true);
    supabase.functions
      .invoke('summarize-transcript', { body: { feedbackId } })
      .then(({ data, error }) => {
        if (error) {
          console.error('summarize-transcript error', error);
          return;
        }
        if (data?.summary) setSummary(data.summary as StructuredSummary);
        if (data?.personal_lens) setLens(data.personal_lens as PersonalLens);
      })
      .finally(() => setSummaryLoading(false));
  }, [feedbackId, content, summary, lens]);

  const regenerateLens = () => {
    setLensGenerating(true);
    supabase.functions
      .invoke('summarize-transcript', { body: { feedbackId, forceLens: true } })
      .then(({ data, error }) => {
        if (error) {
          toast.error('Não foi possível gerar a lente pessoal.');
          return;
        }
        if (data?.personal_lens) {
          setLens(data.personal_lens as PersonalLens);
          toast.success('Lente pessoal gerada.');
        }
      })
      .finally(() => setLensGenerating(false));
  };

  const sentimentMeta = summary?.sentiment ? sentimentLabel[summary.sentiment] : null;

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
      {origin && (
        <div className="flex items-center gap-1.5 mb-2">
          <Badge variant="outline" className={cn('text-[10px] font-medium', origin.badgeClass)}>
            {origin.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {origin.label === 'Bot'
              ? 'Transcrição automática da reunião'
              : origin.label === 'Transcrição'
                ? 'Importada de ferramenta externa'
                : 'Anotação enviada pelo líder'}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <TabsList className="grid grid-cols-3 flex-1 bg-muted/40">
          <TabsTrigger value="summary" className="gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" /> Resumo
          </TabsTrigger>
          <TabsTrigger value="transcript" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Transcrição
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5 text-xs">
            <MessageCircle className="h-3.5 w-3.5" /> Pergunte à Rhitmo
          </TabsTrigger>
        </TabsList>
        <ExportMenu content={content} summary={summary} turns={turns} />
      </div>


      {/* ─── RESUMO ─── */}
      <TabsContent value="summary" className="pt-3 space-y-4">
        {summaryLoading && !summary ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Organizando os principais pontos da reunião…
            </div>
          </div>
        ) : !summary ? (
          <div className="text-sm text-muted-foreground italic">
            Ainda não há um resumo estruturado para esta transcrição.
          </div>
        ) : (
          <>
            {summary.tldr && (
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    TL;DR
                  </div>
                  {sentimentMeta && (
                    <Badge variant="outline" className={cn('text-[10px]', sentimentMeta.tone)}>
                      {sentimentMeta.label}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-foreground leading-relaxed">{summary.tldr}</p>
              </div>
            )}

            <PersonalLensBlock
              lens={lens}
              memberName={memberName}
              loading={lensGenerating}
              onGenerate={memberName ? regenerateLens : undefined}
            />


            {summary.topics && summary.topics.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                  Tópicos discutidos
                </div>
                <div className="space-y-2">
                  {summary.topics.map((t, i) => (
                    <div key={i} className="rounded-md border bg-card/60 p-2.5">
                      <div className="text-sm font-medium text-foreground">{t.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {t.summary}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.decisions && summary.decisions.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Decisões
                </div>
                <ul className="space-y-1">
                  {summary.decisions.map((d, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-600 shrink-0" />
                      <span className="text-foreground/90">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.action_items && summary.action_items.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Próximos passos
                </div>
                <ul className="space-y-1.5">
                  {summary.action_items.map((a, i) => (
                    <li key={i} className="text-sm rounded-md bg-muted/40 px-2.5 py-1.5">
                      <div className="text-foreground">{a.task}</div>
                      {(a.owner || a.due) && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex gap-2">
                          {a.owner && <span>👤 {a.owner}</span>}
                          {a.due && <span>📅 {a.due}</span>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.highlights && summary.highlights.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Trechos relevantes
                </div>
                <div className="space-y-1.5">
                  {summary.highlights.map((h, i) => (
                    <blockquote
                      key={i}
                      className="text-xs italic text-muted-foreground border-l-2 border-primary/40 pl-2.5"
                    >
                      {h}
                    </blockquote>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </TabsContent>

      {/* ─── TRANSCRIÇÃO ─── */}
      <TabsContent value="transcript" className="pt-3">
        {turns.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">Sem conteúdo de transcrição.</div>
        ) : (
          <div className="space-y-3">
            {turns.map((t, i) => (
              <div key={i} className="flex gap-2.5">
                <div
                  className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
                  style={{ background: colorForSpeaker(t.speaker) }}
                  title={t.speaker}
                >
                  {speakerInitials(t.speaker)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium text-foreground/80">{t.speaker}</div>
                  <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
                    {t.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* ─── CONVERSAR ─── */}
      <TabsContent value="chat" className="pt-3">
        <TranscriptChat feedbackId={feedbackId} />
      </TabsContent>
    </Tabs>
  );
}

// ----- Export menu ----------------------------------------------------------

interface ExportMenuProps {
  content: string;
  summary: StructuredSummary | null;
  turns: ReturnType<typeof parseTranscript>;
}

function buildMarkdown(summary: StructuredSummary | null, turns: ExportMenuProps['turns'], rawContent: string): string {
  const lines: string[] = [];
  lines.push('# Resumo da reunião');
  lines.push('');
  if (summary) {
    if (summary.tldr) {
      lines.push('## TL;DR');
      lines.push(summary.tldr);
      lines.push('');
    }
    if (summary.topics?.length) {
      lines.push('## Tópicos discutidos');
      summary.topics.forEach((t) => {
        lines.push(`### ${t.title}`);
        lines.push(t.summary);
        lines.push('');
      });
    }
    if (summary.decisions?.length) {
      lines.push('## Decisões');
      summary.decisions.forEach((d) => lines.push(`- ${d}`));
      lines.push('');
    }
    if (summary.action_items?.length) {
      lines.push('## Próximos passos');
      summary.action_items.forEach((a) => {
        const meta = [a.owner && `👤 ${a.owner}`, a.due && `📅 ${a.due}`].filter(Boolean).join(' · ');
        lines.push(`- ${a.task}${meta ? ` _(${meta})_` : ''}`);
      });
      lines.push('');
    }
    if (summary.highlights?.length) {
      lines.push('## Trechos relevantes');
      summary.highlights.forEach((h) => lines.push(`> ${h}`));
      lines.push('');
    }
  } else {
    lines.push('_Resumo estruturado não disponível._');
    lines.push('');
  }
  lines.push('---');
  lines.push('## Transcrição');
  lines.push('');
  if (turns.length) {
    turns.forEach((t) => {
      lines.push(`**${t.speaker}:** ${t.text}`);
      lines.push('');
    });
  } else {
    lines.push(rawContent);
  }
  return lines.join('\n');
}

function buildPlainText(turns: ExportMenuProps['turns'], rawContent: string): string {
  if (!turns.length) return rawContent;
  return turns.map((t) => `${t.speaker}: ${t.text}`).join('\n\n');
}

function download(filename: string, mime: string, body: string) {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function openPrintWindow(htmlBody: string) {
  const w = window.open('', '_blank', 'width=860,height=900');
  if (!w) {
    toast.error('Habilite pop-ups para exportar em PDF.');
    return;
  }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Resumo da reunião</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; max-width: 720px; margin: 40px auto; padding: 0 24px; line-height: 1.55; }
      h1 { font-size: 22px; margin: 0 0 6px; }
      h2 { font-size: 15px; margin: 22px 0 6px; text-transform: uppercase; letter-spacing: .08em; color: #666; }
      h3 { font-size: 14px; margin: 12px 0 4px; }
      p, li { font-size: 13px; }
      blockquote { border-left: 3px solid #ccc; margin: 6px 0; padding: 2px 10px; color: #555; font-style: italic; }
      .turn { margin: 8px 0; }
      .turn .who { font-size: 11px; color: #555; font-weight: 600; }
      .turn .what { font-size: 13px; white-space: pre-wrap; }
      hr { border: 0; border-top: 1px solid #eee; margin: 24px 0; }
      @media print { body { margin: 0; } }
    </style></head><body>${htmlBody}
    <script>window.onload = () => { setTimeout(() => window.print(), 250); };</script>
    </body></html>`);
  w.document.close();
}

function buildPrintHtml(summary: StructuredSummary | null, turns: ExportMenuProps['turns'], rawContent: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const parts: string[] = ['<h1>Resumo da reunião</h1>'];
  if (summary?.tldr) parts.push(`<h2>TL;DR</h2><p>${esc(summary.tldr)}</p>`);
  if (summary?.topics?.length) {
    parts.push('<h2>Tópicos discutidos</h2>');
    summary.topics.forEach((t) => parts.push(`<h3>${esc(t.title)}</h3><p>${esc(t.summary)}</p>`));
  }
  if (summary?.decisions?.length) {
    parts.push('<h2>Decisões</h2><ul>' + summary.decisions.map((d) => `<li>${esc(d)}</li>`).join('') + '</ul>');
  }
  if (summary?.action_items?.length) {
    parts.push('<h2>Próximos passos</h2><ul>' + summary.action_items.map((a) => {
      const meta = [a.owner && `👤 ${esc(a.owner)}`, a.due && `📅 ${esc(a.due)}`].filter(Boolean).join(' · ');
      return `<li>${esc(a.task)}${meta ? ` <em>(${meta})</em>` : ''}</li>`;
    }).join('') + '</ul>');
  }
  if (summary?.highlights?.length) {
    parts.push('<h2>Trechos relevantes</h2>' + summary.highlights.map((h) => `<blockquote>${esc(h)}</blockquote>`).join(''));
  }
  parts.push('<hr><h2>Transcrição</h2>');
  if (turns.length) {
    turns.forEach((t) => parts.push(`<div class="turn"><div class="who">${esc(t.speaker)}</div><div class="what">${esc(t.text)}</div></div>`));
  } else {
    parts.push(`<pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;">${esc(rawContent)}</pre>`);
  }
  return parts.join('\n');
}

function ExportMenu({ content, summary, turns }: ExportMenuProps) {
  const md = useMemo(() => buildMarkdown(summary, turns, content), [summary, turns, content]);
  const txt = useMemo(() => buildPlainText(turns, content), [turns, content]);
  const stamp = new Date().toISOString().slice(0, 10);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      toast.success('Resumo copiado em Markdown.');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Download className="h-3.5 w-3.5" /> Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Compartilhar
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={copy} className="gap-2">
          <Copy className="h-3.5 w-3.5" /> Copiar resumo (Markdown)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Baixar
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => download(`reuniao-${stamp}.md`, 'text/markdown;charset=utf-8', md)}
          className="gap-2"
        >
          <FileDown className="h-3.5 w-3.5" /> Resumo completo (.md)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => download(`transcricao-${stamp}.txt`, 'text/plain;charset=utf-8', txt)}
          className="gap-2"
        >
          <FileType2 className="h-3.5 w-3.5" /> Transcrição crua (.txt)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => openPrintWindow(buildPrintHtml(summary, turns, content))}
          className="gap-2"
        >
          <Printer className="h-3.5 w-3.5" /> Exportar em PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ----- Chat panel ------------------------------------------------------------

interface ChatMsg { role: 'user' | 'assistant'; content: string }

function TranscriptChat({ feedbackId }: { feedbackId: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    const next: ChatMsg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-transcript', {
        body: { feedbackId, question: q, history: next.slice(-6) },
      });
      if (error) throw error;
      const reply = (data as { reply?: string })?.reply || 'Não consegui responder agora.';
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      console.error('chat-transcript error', e);
      toast.error('Não consegui responder. Tente novamente.');
      setMessages(next);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'Quais foram os principais pontos discutidos?',
    'Quais ações ficaram pendentes?',
    'Há algum sinal de bloqueio ou frustração?',
  ];

  return (
    <div className="flex flex-col gap-2">
      <ScrollArea className="h-64 rounded-md border bg-muted/20 p-3" ref={scrollRef as any}>
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Pergunte qualquer coisa sobre esta reunião. A Rhitmo responde usando apenas a
              transcrição desta conversa.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-[11px] px-2 py-1 rounded-full bg-background border hover:bg-muted transition-colors"
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border text-foreground',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-background border rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> pensando…
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Pergunte sobre esta reunião…"
          className="min-h-[40px] max-h-32 text-sm resize-none"
          rows={1}
        />
        <Button onClick={send} disabled={!input.trim() || loading} size="icon" aria-label="Enviar pergunta">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Respostas baseadas apenas nesta transcrição.
      </div>
    </div>
  );
}

// ----- Personal Lens block --------------------------------------------------

const participationLabel: Record<NonNullable<PersonalLens['participation']>, { label: string; tone: string }> = {
  active:         { label: 'Participou ativamente',     tone: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  passive:        { label: 'Participação pontual',      tone: 'bg-sky-500/10 text-sky-700 border-sky-200' },
  mentioned_only: { label: 'Foi mencionada(o), sem falar', tone: 'bg-amber-500/10 text-amber-800 border-amber-200' },
  absent:         { label: 'Sem participação registrada',  tone: 'bg-slate-500/10 text-slate-700 border-slate-200' },
};

function PersonalLensBlock({
  lens,
  memberName,
  loading,
  onGenerate,
}: {
  lens: PersonalLens | null;
  memberName?: string;
  loading: boolean;
  onGenerate?: () => void;
}) {
  if (!memberName) return null;

  // Sem lente ainda — mostra CTA discreto pra gerar (usa quando feedback é antigo).
  if (!lens) {
    if (!onGenerate) return null;
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-3 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground leading-relaxed">
          Esta transcrição ainda não tem uma <strong>lente pessoal</strong> para {memberName}.
          Ela destaca o que essa pessoa falou, assumiu e perguntas pra próxima 1:1.
        </div>
        <Button size="sm" variant="outline" onClick={onGenerate} disabled={loading} className="shrink-0 gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Gerar
        </Button>
      </div>
    );
  }

  const partMeta = lens.participation ? participationLabel[lens.participation] : null;
  const hasAny =
    (lens.key_points?.length ?? 0) +
      (lens.commitments?.length ?? 0) +
      (lens.mentions?.length ?? 0) +
      (lens.questions_for_1on1?.length ?? 0) >
    0;

  if (!hasAny && !partMeta) return null;

  return (
    <div className="rounded-lg border bg-primary/[0.03] p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-primary/80 font-semibold">
          Para {memberName.split(/\s+/)[0]} · Lente pessoal
        </div>
        {partMeta && (
          <Badge variant="outline" className={cn('text-[10px]', partMeta.tone)}>
            {partMeta.label}
          </Badge>
        )}
      </div>

      {lens.key_points && lens.key_points.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            O que {memberName.split(/\s+/)[0]} trouxe
          </div>
          <ul className="space-y-1">
            {lens.key_points.map((p, i) => (
              <li key={i} className="text-sm text-foreground/90 flex gap-2">
                <span className="text-primary/60 shrink-0">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lens.commitments && lens.commitments.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            Compromissos assumidos
          </div>
          <ul className="space-y-1">
            {lens.commitments.map((c, i) => (
              <li key={i} className="text-sm rounded-md bg-card border px-2.5 py-1.5">
                <div className="text-foreground">{c.task}</div>
                {c.due && <div className="text-[11px] text-muted-foreground mt-0.5">📅 {c.due}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {lens.mentions && lens.mentions.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            Mencionado(a) na conversa
          </div>
          <ul className="space-y-1">
            {lens.mentions.map((m, i) => (
              <li key={i} className="text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2">
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {lens.questions_for_1on1 && lens.questions_for_1on1.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            Perguntas para sua próxima 1:1
          </div>
          <ul className="space-y-1">
            {lens.questions_for_1on1.map((q, i) => (
              <li key={i} className="text-sm text-foreground/90 flex gap-2">
                <MessageCircle className="h-3.5 w-3.5 mt-0.5 text-primary/70 shrink-0" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

