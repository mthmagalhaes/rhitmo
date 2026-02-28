import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageSquare, Pencil, Trash2, Sparkles, ArrowUp, Square, ChevronLeft, Menu, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

interface MeuRhitmoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberRole: string;
  workStyleData: any;
  aiAnalysis: any;
  pdiItems: any[];
  latestReview: string | null;
  userId: string;
}

interface ChatThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MentorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  thread_id: string | null;
}

const quickSuggestions = [
  { emoji: '🚀', text: 'Como me preparo para pedir promoção?' },
  { emoji: '💬', text: 'Me ajuda a processar um feedback difícil' },
  { emoji: '🔍', text: 'Quais são meus pontos cegos?' },
  { emoji: '⚡', text: 'Como posso acelerar meu desenvolvimento?' },
  { emoji: '📋', text: 'Me prepara para minha próxima 1:1' },
];

export default function MeuRhitmo({
  open,
  onOpenChange,
  memberName,
  memberRole,
  workStyleData,
  aiAnalysis,
  pdiItems,
  latestReview,
  userId,
}: MeuRhitmoProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isCreatingNewThread, setIsCreatingNewThread] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingThread, setDeletingThread] = useState<ChatThread | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Threads query ────────────────────────────────────
  const { data: threads = [], isLoading: isLoadingThreads } = useQuery({
    queryKey: ['meu-rhitmo-threads', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'career')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ChatThread[];
    },
    enabled: open && !!userId,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!isLoadingThreads && threads.length > 0 && !selectedThreadId && !isCreatingNewThread) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, isLoadingThreads, selectedThreadId, isCreatingNewThread]);

  // ── Messages query ───────────────────────────────────
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['meu-rhitmo-messages', selectedThreadId],
    queryFn: async () => {
      if (!selectedThreadId) return [];
      const { data, error } = await supabase
        .from('mentor_messages')
        .select('*')
        .eq('thread_id', selectedThreadId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as MentorMessage[];
    },
    enabled: !!selectedThreadId,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (scrollRef.current && (messages.length > 0 || isLoading)) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [messages, isLoading]);

  // ── Thread helpers ───────────────────────────────────
  const groupThreadsByDate = (threads: ChatThread[]) => {
    const groups: { label: string; threads: ChatThread[] }[] = [];
    const today: ChatThread[] = [];
    const yesterday: ChatThread[] = [];
    const lastWeek: ChatThread[] = [];
    const older: ChatThread[] = [];
    threads.forEach(thread => {
      const date = new Date(thread.updated_at);
      if (isToday(date)) today.push(thread);
      else if (isYesterday(date)) yesterday.push(thread);
      else if (differenceInDays(new Date(), date) <= 7) lastWeek.push(thread);
      else older.push(thread);
    });
    if (today.length) groups.push({ label: 'Hoje', threads: today });
    if (yesterday.length) groups.push({ label: 'Ontem', threads: yesterday });
    if (lastWeek.length) groups.push({ label: 'Última semana', threads: lastWeek });
    if (older.length) groups.push({ label: 'Anteriores', threads: older });
    return groups;
  };

  const handleNewThread = () => {
    setSelectedThreadId(null);
    setIsCreatingNewThread(true);
  };

  const handleRenameThread = async (threadId: string, newTitle: string) => {
    if (!newTitle.trim()) { setEditingThreadId(null); setEditingTitle(''); return; }
    try {
      const { error } = await supabase.from('chat_threads').update({ title: newTitle.trim() }).eq('id', threadId);
      if (error) throw error;
      queryClient.setQueryData(['meu-rhitmo-threads', userId], (old: ChatThread[] | undefined) =>
        old?.map(t => t.id === threadId ? { ...t, title: newTitle.trim() } : t) || []
      );
      toast({ title: 'Conversa renomeada' });
    } catch (error) {
      console.error('Erro ao renomear:', error);
      toast({ title: 'Erro ao renomear', description: 'Tente novamente.', variant: 'destructive' });
    } finally { setEditingThreadId(null); setEditingTitle(''); }
  };

  const handleDeleteThread = async (thread: ChatThread) => {
    try {
      await supabase.from('mentor_messages').delete().eq('thread_id', thread.id);
      const { error } = await supabase.from('chat_threads').delete().eq('id', thread.id);
      if (error) throw error;
      if (selectedThreadId === thread.id) setSelectedThreadId(null);
      queryClient.invalidateQueries({ queryKey: ['meu-rhitmo-threads', userId] });
      toast({ title: 'Conversa excluída' });
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({ title: 'Erro ao excluir', description: 'Tente novamente.', variant: 'destructive' });
    } finally { setDeletingThread(null); }
  };

  // ── Textarea auto-height ─────────────────────────────
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  };

  // ── Send ─────────────────────────────────────────────
  const handleSend = async (messageToSend?: string) => {
    const finalMessage = messageToSend || input;
    if (!finalMessage.trim() || isLoading) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    try {
      let currentThreadId = selectedThreadId;

      // If new thread, the edge function will create it
      if (!currentThreadId || isCreatingNewThread) {
        currentThreadId = null;
      }

      const { data: session } = await supabase.auth.getSession();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meu-rhitmo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token}`,
        },
        body: JSON.stringify({
          question: finalMessage,
          threadId: currentThreadId,
          memberName,
          memberRole,
          workStyleData,
          aiAnalysis,
          pdiItems,
          latestReview,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Erro ao conectar com o Meu Rhitmo. Tente novamente.';
        try { const errorData = await response.json(); errorMessage = errorData.error || errorMessage; } catch {}
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!data.response) throw new Error('Resposta inválida do servidor.');

      // If a new thread was created, select it
      if (data.threadId && data.threadId !== selectedThreadId) {
        setSelectedThreadId(data.threadId);
        setIsCreatingNewThread(false);
        queryClient.invalidateQueries({ queryKey: ['meu-rhitmo-threads', userId] });
      }

      queryClient.invalidateQueries({ queryKey: ['meu-rhitmo-messages', data.threadId || currentThreadId] });
      queryClient.invalidateQueries({ queryKey: ['meu-rhitmo-threads', userId] });
    } catch (error: any) {
      console.error('Meu Rhitmo error:', error);
      let errorMessage = 'Erro ao conectar. Tente novamente.';
      if (error.name === 'AbortError') errorMessage = 'Tempo de resposta excedido. Tente novamente.';
      else if (error.message) errorMessage = error.message;
      toast({ title: "Erro no Meu Rhitmo", description: errorMessage, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copiado!' });
  };

  // ── Derived state ────────────────────────────────────
  const threadGroups = groupThreadsByDate(threads);
  const showEmptyState = !isCreatingNewThread && !selectedThreadId && threads.length === 0;
  const showNewThreadState = isCreatingNewThread || (threads.length === 0 && !isLoadingThreads);
  const userInitials = memberName
    ? memberName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'EU';

  // ── Markdown components ──────────────────────────────
  const markdownComponents = {
    h1: ({ children }: any) => <h1 className="text-lg font-semibold text-foreground mt-5 mb-2">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-base font-semibold text-foreground mt-5 mb-2">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-[15px] font-semibold text-foreground mt-4 mb-1.5">{children}</h3>,
    p: ({ children }: any) => <p className="leading-relaxed mb-3.5 last:mb-0">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc ml-5 space-y-1.5 mb-3.5">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal ml-5 space-y-1.5 mb-3.5">{children}</ol>,
    li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }: any) => <strong className="font-semibold text-foreground">{children}</strong>,
    hr: () => <hr className="border-t border-border/50 my-4" />,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-primary/40 bg-primary/5 p-3 rounded-r-lg italic my-3">
        {children}
      </blockquote>
    ),
    code: ({ inline, children, ...props }: any) => {
      if (inline) {
        return <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
      }
      const codeString = String(children).replace(/\n$/, '');
      return (
        <div className="relative group/code my-3">
          <button
            onClick={() => handleCopyMessage(codeString)}
            className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <pre className="bg-muted rounded-lg p-3 overflow-x-auto">
            <code className="text-sm font-mono" {...props}>{children}</code>
          </pre>
        </div>
      );
    },
    pre: ({ children }: any) => <>{children}</>,
  };

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 shadow-[0_2px_40px_rgba(0,0,0,0.08)] [&>button]:hidden">
        {/* ── Header ─────────────────────────────────── */}
        <DialogHeader className="px-5 py-3.5 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <DialogTitle className="text-foreground text-base font-semibold tracking-tight">
                Meu Rhitmo
              </DialogTitle>
            </div>
            <Badge className="bg-primary/10 text-primary text-xs border-0">Confidencial</Badge>
          </div>
        </DialogHeader>

        {/* ── Body: Sidebar + Chat ───────────────────── */}
        <div className="flex flex-1 min-h-0">
          {/* ── Sidebar ────────────────────────────── */}
          <div className={`flex-shrink-0 border-r border-border flex flex-col bg-muted/20 transition-all duration-200 overflow-hidden ${sidebarOpen ? 'w-[240px]' : 'w-0 border-r-0'}`}>
            <div className="p-3 flex items-center gap-2">
              <Button onClick={handleNewThread} variant="outline" size="sm" className="flex-1 gap-2 rounded-xl text-sm">
                <Plus className="h-4 w-4" />
                Nova conversa
              </Button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-2 pb-2">
                {isLoadingThreads ? (
                  <div className="space-y-2 p-2">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ) : threads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    <p>Nenhuma conversa ainda</p>
                  </div>
                ) : (
                  threadGroups.map(group => (
                    <div key={group.label} className="mb-3">
                      <p className="text-[11px] font-medium text-muted-foreground mb-1 px-2 uppercase tracking-wider">
                        {group.label}
                      </p>
                      {group.threads.map(thread => (
                        <div key={thread.id} className="group relative">
                          {editingThreadId === thread.id ? (
                            <div className="px-2 py-1">
                              <Input
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameThread(thread.id, editingTitle);
                                  if (e.key === 'Escape') { setEditingThreadId(null); setEditingTitle(''); }
                                }}
                                onBlur={() => handleRenameThread(thread.id, editingTitle)}
                                autoFocus
                                className="h-8 text-xs rounded-lg"
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => { setSelectedThreadId(thread.id); setIsCreatingNewThread(false); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                                selectedThreadId === thread.id
                                  ? 'bg-primary/10 text-primary'
                                  : 'hover:bg-muted/60 text-foreground'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-[13px]">{thread.title}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {format(new Date(thread.updated_at), 'dd MMM', { locale: ptBR })}
                                </p>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingThreadId(thread.id); setEditingTitle(thread.title); }}
                                  className="p-1 rounded hover:bg-accent transition-colors"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeletingThread(thread); }}
                                  className="p-1 rounded hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                                </button>
                              </div>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ── Chat area ──────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0">
            <ScrollArea className="flex-1" ref={scrollRef}>
              <div className="p-6 md:px-8 space-y-6">
                {isLoadingMessages && selectedThreadId && (
                  <div className="space-y-6">
                    <div className="flex gap-3"><Skeleton className="h-7 w-7 rounded-full flex-shrink-0" /><Skeleton className="h-16 w-3/4 rounded-2xl" /></div>
                    <div className="flex justify-end"><Skeleton className="h-12 w-1/2 rounded-2xl" /></div>
                  </div>
                )}

                {/* Empty / New thread state */}
                {(showEmptyState || showNewThreadState) && !isLoadingMessages && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="font-semibold text-xl text-foreground tracking-tight">
                      Olá, {memberName.split(' ')[0]}! 👋
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-xs mt-2">
                      Sou seu parceiro de desenvolvimento. Converse comigo sobre carreira, preparação para reuniões ou qualquer situação do trabalho.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-6 justify-center">
                      {quickSuggestions.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(s.text)}
                          disabled={isLoading}
                          className="px-4 py-2 text-sm rounded-full border border-border bg-background hover:bg-muted transition-colors text-foreground disabled:opacity-50"
                        >
                          {s.emoji} {s.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                {!isLoadingMessages && messages.map((msg) => (
                  msg.role === 'user' ? (
                    <div key={msg.id} className="flex flex-row-reverse items-start gap-2.5 max-w-[75%] ml-auto">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/20 text-primary text-[10px] font-semibold flex-shrink-0 mt-0.5">
                        {userInitials}
                      </div>
                      <div className="rounded-2xl px-4 py-2.5 bg-muted/60 border border-border/60 text-foreground text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex items-start gap-3 group">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 flex-shrink-0 mt-0.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 text-sm text-foreground">
                        <ReactMarkdown components={markdownComponents}>
                          {msg.content}
                        </ReactMarkdown>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1.5">
                          <button
                            onClick={() => handleCopyMessage(msg.content)}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                          >
                            <Copy className="h-3 w-3" /> Copiar
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 flex-shrink-0">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex items-center gap-1.5 py-3">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:200ms]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:400ms]" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* ── Input area ─────────────────────────── */}
            <div className="px-4 md:px-6 pb-4 pt-3 flex-shrink-0">
              {/* Quick suggestions when messages exist */}
              {messages.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                  {quickSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s.text)}
                      disabled={isLoading}
                      className="flex-shrink-0 px-3 py-1.5 text-xs rounded-full border border-border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      {s.emoji} {s.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Input pill */}
              <div className="rounded-2xl border border-border bg-background shadow-sm focus-within:border-primary/50 focus-within:shadow-[0_0_0_2px_hsl(var(--primary)/0.1)] transition-all">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte sobre sua carreira ou descreva uma situação..."
                  disabled={isLoading}
                  rows={1}
                  className="w-full bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground resize-none min-h-[44px] max-h-[160px] px-4 pt-3 pb-1 focus:ring-0 disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-between px-3 py-2 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">
                    Suas conversas são confidenciais e não são compartilhadas com seu líder.
                  </p>
                  <button
                    onClick={() => handleSend()}
                    disabled={isLoading || !input.trim()}
                    className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 ${
                      isLoading
                        ? 'bg-destructive/80 hover:bg-destructive text-destructive-foreground'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    }`}
                  >
                    {isLoading ? <Square className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Delete thread dialog ───────────────────── */}
        <AlertDialog open={!!deletingThread} onOpenChange={() => setDeletingThread(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertTitle>Excluir conversa?</AlertTitle>
              <AlertDialogDescription>
                Esta ação é irreversível. A conversa "{deletingThread?.title}" e todas as mensagens serão excluídas permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingThread && handleDeleteThread(deletingThread)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
