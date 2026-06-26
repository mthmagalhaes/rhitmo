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

interface Props {
  feedbackId: string;
  content: string;
  structuredSummary: StructuredSummary | null;
}

const sentimentLabel: Record<string, { label: string; tone: string }> = {
  positive:  { label: 'Tom positivo',    tone: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  neutral:   { label: 'Tom neutro',      tone: 'bg-slate-500/10 text-slate-700 border-slate-200' },
  concerned: { label: 'Sinais de preocupação', tone: 'bg-amber-500/10 text-amber-800 border-amber-200' },
  tense:     { label: 'Conversa tensa',  tone: 'bg-rose-500/10 text-rose-700 border-rose-200' },
};

export function TranscriptExpandedView({ feedbackId, content, structuredSummary }: Props) {
  const [summary, setSummary] = useState<StructuredSummary | null>(structuredSummary);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [tab, setTab] = useState<'summary' | 'transcript' | 'chat'>('summary');

  const turns = useMemo(() => parseTranscript(content), [content]);

  // Auto-generate summary the first time this is opened, if missing.
  const triggeredRef = useRef(false);
  useEffect(() => {
    if (summary || triggeredRef.current) return;
    if (!content || content.length < 200) return;
    triggeredRef.current = true;
    setSummaryLoading(true);
    supabase.functions
      .invoke('summarize-transcript', { body: { feedbackId } })
      .then(({ data, error }) => {
        if (error) {
          console.error('summarize-transcript error', error);
          return;
        }
        if (data?.summary) setSummary(data.summary as StructuredSummary);
      })
      .finally(() => setSummaryLoading(false));
  }, [feedbackId, content, summary]);

  const sentimentMeta = summary?.sentiment ? sentimentLabel[summary.sentiment] : null;

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
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
        <Button onClick={send} disabled={!input.trim() || loading} size="icon">
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
