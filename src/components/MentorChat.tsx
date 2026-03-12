import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Paperclip, Plus, MessageSquare, Pencil, Trash2, FileText, X, Sparkles, ArrowUp, Square, ChevronLeft, Menu, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { VoiceInput } from './VoiceInput';
import { ContextPicker } from './ContextPicker';
import { extractTextFromFile, isFileSupported } from '@/lib/fileParser';
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

interface MentorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  thread_id: string | null;
}

interface ChatThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MentorChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberId: string;
  memberRole?: string;
  feedbacks: any[];
  workStyleData?: any;
  keyObjectives?: string | null;
  leaderSyncData?: any;
}

const quickSuggestions = [
  { emoji: '📋', text: 'Resumir histórico recente' },
  { emoji: '⚡', text: 'Quais ações estão pendentes?' },
  { emoji: '💬', text: 'Como dar feedback agora?' },
];

export const MentorChat = ({ 
  open, 
  onOpenChange, 
  memberName, 
  memberId,
  memberRole, 
  feedbacks, 
  workStyleData, 
  keyObjectives,
  leaderSyncData 
}: MentorChatProps) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isCreatingNewThread, setIsCreatingNewThread] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingThread, setDeletingThread] = useState<ChatThread | null>(null);
  const [attachment, setAttachment] = useState<{ name: string; content: string; imageBase64?: string; mimeType?: string; isImage?: boolean } | null>(null);
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Queries (unchanged) ──────────────────────────────
  const { data: threads = [], isLoading: isLoadingThreads } = useQuery({
    queryKey: ['chat-threads', memberId],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('member_id', memberId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ChatThread[];
    },
    enabled: open && !!memberId && !!user,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!isLoadingThreads && threads.length > 0 && !selectedThreadId && !isCreatingNewThread) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, isLoadingThreads, selectedThreadId, isCreatingNewThread]);

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['mentor-messages', selectedThreadId],
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

  // ── Thread helpers (unchanged) ───────────────────────
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

  const createThread = async (firstMessage: string) => {
    if (!user) throw new Error('Usuário não autenticado');
    const title = firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '...' : '');
    const { data, error } = await supabase
      .from('chat_threads')
      .insert({ user_id: user.id, member_id: memberId, title })
      .select()
      .single();
    if (error) throw error;
    return data as ChatThread;
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
      queryClient.setQueryData(['chat-threads', memberId], (old: ChatThread[] | undefined) =>
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
      queryClient.invalidateQueries({ queryKey: ['chat-threads', memberId] });
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

  // ── Send (unchanged logic) ───────────────────────────
  const handleSend = async (messageToSend?: string) => {
    let finalMessage = messageToSend || input;
    if (!finalMessage.trim() && !attachment) return;
    if (isLoading || !user) return;

    let imageContent: { isImage: true; imageBase64: string; mimeType: string; textMessage: string } | undefined;
    if (attachment?.isImage && attachment.imageBase64 && attachment.mimeType) {
      imageContent = { isImage: true, imageBase64: attachment.imageBase64, mimeType: attachment.mimeType, textMessage: finalMessage || 'Analise esta imagem no contexto do liderado.' };
    } else if (attachment) {
      finalMessage = finalMessage + `\n\n--- ARQUIVO ANEXADO (${attachment.name}) ---\n${attachment.content}`;
    }

    setInput('');
    setAttachment(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    try {
      let currentThreadId = selectedThreadId;
      if (!currentThreadId || isCreatingNewThread) {
        const newThread = await createThread(finalMessage);
        currentThreadId = newThread.id;
        setSelectedThreadId(newThread.id);
        setIsCreatingNewThread(false);
        queryClient.invalidateQueries({ queryKey: ['chat-threads', memberId] });
      }

      const savedContent = imageContent ? (imageContent.textMessage || '[Imagem enviada para análise]') : finalMessage;
      await supabase.from('mentor_messages').insert({ user_id: user.id, member_id: memberId, thread_id: currentThreadId, role: 'user', content: savedContent });
      queryClient.invalidateQueries({ queryKey: ['mentor-messages', currentThreadId] });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const { data: session } = await supabase.auth.getSession();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const managerName = currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || 'Gestor';

      let contextFeedbacks: any[];
      let contextMode: 'auto' | 'manual';
      if (selectedContexts.length > 0) {
        contextMode = 'manual';
        contextFeedbacks = feedbacks.filter(fb => selectedContexts.includes(fb.id));
      } else {
        contextMode = 'auto';
        const sorted = [...feedbacks].sort((a, b) => new Date(b.occurred_at || b.created_at).getTime() - new Date(a.occurred_at || a.created_at).getTime());
        contextFeedbacks = sorted.slice(0, 10);
      }

      const MAX_RETRIES = 3;
      let data: any = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          setLoadingMessage(`Reconectando... (tentativa ${attempt}/${MAX_RETRIES})`);
          await new Promise(r => setTimeout(r, delay));
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-mentor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.session?.access_token}` },
          body: JSON.stringify({
            question: finalMessage,
            feedbacks: contextFeedbacks,
            memberName, memberRole, managerName, workStyleData, keyObjectives, contextMode, leaderSyncData,
            conversationHistory: messages.map(msg => ({ role: msg.role, content: msg.content })),
            imageContent
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          setLoadingMessage('');
          data = await response.json();
          if (!data.response) throw new Error('Resposta inválida do servidor.');
          break;
        }

        if ((response.status === 429 || response.status === 503) && attempt < MAX_RETRIES) {
          continue;
        }

        setLoadingMessage('');
        let errorMessage = 'Erro ao conectar com o Mentor. Tente novamente.';
        try { const errorData = await response.json(); errorMessage = errorData.error || errorMessage; } catch {}
        throw new Error(errorMessage);
      }

      if (!data?.response) throw new Error('Resposta inválida do servidor.');

      await supabase.from('mentor_messages').insert({ user_id: user.id, member_id: memberId, thread_id: currentThreadId, role: 'assistant', content: data.response });
      await supabase.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', currentThreadId);
      queryClient.invalidateQueries({ queryKey: ['mentor-messages', currentThreadId] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads', memberId] });
    } catch (error: any) {
      console.error('Erro no chat:', error);
      let errorMessage = 'Erro ao conectar com o Mentor. Tente novamente.';
      if (error.name === 'AbortError') errorMessage = 'Tempo de resposta excedido. Tente novamente.';
      else if (error.message) errorMessage = error.message;
      toast({ title: "Erro ao consultar mentor", description: errorMessage, variant: "destructive" });
    } finally { setIsLoading(false); setLoadingMessage(''); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  const handleSuggestionClick = (text: string) => { handleSend(text); };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      setIsExtractingFile(true);
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = () => reject(new Error('Erro ao ler imagem'));
          reader.readAsDataURL(file);
        });
        setAttachment({ name: file.name, content: '', imageBase64: base64, mimeType: file.type, isImage: true });
        toast({ title: "Imagem anexada!", description: "O Mentor vai analisar o conteúdo." });
      } catch (error: any) {
        toast({ title: "Erro ao processar", description: error.message, variant: "destructive" });
      } finally { setIsExtractingFile(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
      return;
    }
    if (!isFileSupported(file)) {
      toast({ title: "Formato inválido", description: "Envie PDF, Word, TXT, Markdown ou imagem.", variant: "destructive" });
      return;
    }
    setIsExtractingFile(true);
    try {
      const text = await extractTextFromFile(file);
      setAttachment({ name: file.name, content: text });
      toast({ title: "Arquivo anexado!", description: file.name });
    } catch (error: any) {
      toast({ title: "Erro ao processar", description: error.message, variant: "destructive" });
    } finally { setIsExtractingFile(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copiado!' });
  };

  // ── Derived state ────────────────────────────────────
  const threadGroups = groupThreadsByDate(threads);
  const showEmptyState = !isCreatingNewThread && !selectedThreadId && threads.length === 0;
  const showNewThreadState = isCreatingNewThread || (threads.length === 0 && !isLoadingThreads);
  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
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
    code: ({ inline, children, className: codeClassName, ...props }: any) => {
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
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-sm">
                🎯
              </div>
              <DialogTitle className="text-foreground text-base font-semibold tracking-tight">
                Mentor Chat
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  — {memberName} {memberRole && `(${memberRole})`}
                </span>
              </DialogTitle>
            </div>
            <ContextPicker 
              feedbacks={feedbacks}
              selectedIds={selectedContexts}
              onSelectionChange={setSelectedContexts}
            />
          </div>
        </DialogHeader>

        {/* ── Body: Sidebar + Chat ───────────────────── */}
        <div className="flex flex-1 min-h-0">
          {/* ── Sidebar ────────────────────────────── */}
          <div className={`flex-shrink-0 border-r border-border flex flex-col bg-muted/20 transition-all duration-200 overflow-hidden ${sidebarOpen ? 'w-[240px]' : 'w-0 border-r-0'}`}>
            {/* New thread + collapse */}
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

            {/* Thread list */}
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
                    <p>Nenhuma conversa</p>
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
                              {/* Hover actions */}
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
            {/* Messages */}
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
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-2xl mb-4">
                      🎯
                    </div>
                    <h2 className="font-semibold text-xl text-foreground tracking-tight">
                      Mentor de {memberName}
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-xs mt-2">
                      Pergunte qualquer coisa sobre o histórico, comportamento e desenvolvimento de {memberName}.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-6 justify-center">
                      {quickSuggestions.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(s.text)}
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
                    /* ── User bubble ──────────────── */
                    <div key={msg.id} className="flex flex-row-reverse items-start gap-2.5 max-w-[75%] ml-auto">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/20 text-primary text-[10px] font-semibold flex-shrink-0 mt-0.5">
                        {userInitials}
                      </div>
                      <div className="rounded-2xl px-4 py-2.5 bg-muted/60 border border-border/60 text-foreground text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    /* ── Assistant bubble ─────────── */
                    <div key={msg.id} className="flex items-start gap-3 group">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-sm flex-shrink-0 mt-0.5">
                        🎯
                      </div>
                      <div className="flex-1 min-w-0 text-sm text-foreground">
                        <ReactMarkdown components={markdownComponents}>
                          {msg.content}
                        </ReactMarkdown>
                        {/* Copy action */}
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
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-sm flex-shrink-0">
                      🎯
                    </div>
                    {loadingMessage ? (
                      <div className="flex items-center gap-2 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{loadingMessage}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 py-3">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:200ms]" />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:400ms]" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* ── Input area ─────────────────────────── */}
            <div className="px-4 md:px-6 pb-4 pt-3 flex-shrink-0">
              {/* Quick suggestions (only when messages exist) */}
              {messages.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                  {quickSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(s.text)}
                      disabled={isLoading}
                      className="flex-shrink-0 px-3 py-1.5 text-xs rounded-full border border-border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      {s.emoji} {s.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Attachment preview */}
              {attachment && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border/50 text-sm max-w-[300px]">
                    {attachment.isImage && attachment.imageBase64 ? (
                      <img 
                        src={`data:${attachment.mimeType};base64,${attachment.imageBase64}`}
                        className="h-8 w-8 rounded object-cover flex-shrink-0"
                        alt={attachment.name}
                      />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="truncate text-muted-foreground">{attachment.name}</span>
                    <button onClick={() => setAttachment(null)} className="p-0.5 hover:bg-accent rounded transition-colors flex-shrink-0">
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}

              {/* Input pill */}
              <div className="rounded-2xl border border-border bg-background shadow-sm focus-within:border-primary/50 focus-within:shadow-[0_0_0_2px_hsl(var(--primary)/0.1)] transition-all">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={`Pergunte sobre ${memberName}…`}
                  disabled={isLoading || isExtractingFile}
                  rows={1}
                  className="w-full bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground resize-none min-h-[44px] max-h-[160px] px-4 pt-3 pb-1 focus:ring-0 disabled:cursor-not-allowed"
                />
                {/* Action bar */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-border/40">
                  <div className="flex items-center gap-1">
                    <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFileSelect} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || isExtractingFile}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {isExtractingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                      <span className="hidden sm:inline">Anexar</span>
                    </button>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <VoiceInput 
                        onTranscription={(text) => { setInput(text); setTimeout(adjustTextareaHeight, 0); }}
                        disabled={isLoading || isExtractingFile}
                      />
                    </div>
                    {selectedContexts.length > 0 && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary text-[11px] rounded-full px-2.5 py-0.5 border-0">
                        {selectedContexts.length} nota{selectedContexts.length > 1 ? 's' : ''} selecionada{selectedContexts.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <button
                    onClick={() => handleSend()}
                    disabled={isLoading || isExtractingFile || (!input.trim() && !attachment)}
                    className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 ${
                      isLoading
                        ? 'bg-destructive/80 hover:bg-destructive text-destructive-foreground'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    }`}
                  >
                    {isLoading ? <Square className="h-4 w-4" /> : <ArrowUp className="h-4 w-4 text-white" />}
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
};
