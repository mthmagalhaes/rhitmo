import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Send, Loader2, MessageCircle, Paperclip, Plus, MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { VoiceInput } from './VoiceInput';
import { extractTextFromFile, isFileSupported } from '@/lib/fileParser';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
}

const quickSuggestions = [
  { emoji: '📊', text: 'Analisar padrões de comportamento' },
  { emoji: '🗣️', text: 'Roteiro para 1:1' },
  { emoji: '💡', text: 'Sugerir PDI' },
  { emoji: '⚠️', text: 'Identificar riscos' },
];

export const MentorChat = ({ 
  open, 
  onOpenChange, 
  memberName, 
  memberId,
  memberRole, 
  feedbacks, 
  workStyleData, 
  keyObjectives 
}: MentorChatProps) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isCreatingNewThread, setIsCreatingNewThread] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingThread, setDeletingThread] = useState<ChatThread | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query threads para este membro
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

  // Auto-selecionar primeira thread ou criar nova
  useEffect(() => {
    if (!isLoadingThreads && threads.length > 0 && !selectedThreadId && !isCreatingNewThread) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, isLoadingThreads, selectedThreadId, isCreatingNewThread]);

  // Query mensagens da thread selecionada
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

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current && (messages.length > 0 || isLoading)) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [messages, isLoading]);

  // Agrupar threads por data
  const groupThreadsByDate = (threads: ChatThread[]) => {
    const groups: { label: string; threads: ChatThread[] }[] = [];
    const today: ChatThread[] = [];
    const yesterday: ChatThread[] = [];
    const lastWeek: ChatThread[] = [];
    const older: ChatThread[] = [];

    threads.forEach(thread => {
      const date = new Date(thread.updated_at);
      if (isToday(date)) {
        today.push(thread);
      } else if (isYesterday(date)) {
        yesterday.push(thread);
      } else if (differenceInDays(new Date(), date) <= 7) {
        lastWeek.push(thread);
      } else {
        older.push(thread);
      }
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
      .insert({
        user_id: user.id,
        member_id: memberId,
        title
      })
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
    if (!newTitle.trim()) {
      setEditingThreadId(null);
      setEditingTitle('');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('chat_threads')
        .update({ title: newTitle.trim() })
        .eq('id', threadId);
      
      if (error) throw error;
      
      queryClient.setQueryData(['chat-threads', memberId], (old: ChatThread[] | undefined) => 
        old?.map(t => t.id === threadId ? { ...t, title: newTitle.trim() } : t) || []
      );
      
      toast({ title: 'Conversa renomeada' });
    } catch (error) {
      console.error('Erro ao renomear:', error);
      toast({ 
        title: 'Erro ao renomear', 
        description: 'Tente novamente.', 
        variant: 'destructive' 
      });
    } finally {
      setEditingThreadId(null);
      setEditingTitle('');
    }
  };

  const handleDeleteThread = async (thread: ChatThread) => {
    try {
      await supabase
        .from('mentor_messages')
        .delete()
        .eq('thread_id', thread.id);
      
      const { error } = await supabase
        .from('chat_threads')
        .delete()
        .eq('id', thread.id);
      
      if (error) throw error;
      
      if (selectedThreadId === thread.id) {
        setSelectedThreadId(null);
      }
      
      queryClient.invalidateQueries({ queryKey: ['chat-threads', memberId] });
      
      toast({ title: 'Conversa excluída' });
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({ 
        title: 'Erro ao excluir', 
        description: 'Tente novamente.', 
        variant: 'destructive' 
      });
    } finally {
      setDeletingThread(null);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  };

  const handleSend = async (messageToSend?: string) => {
    const finalMessage = messageToSend || input;
    if (!finalMessage.trim() || isLoading || !user) return;

    setInput('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    try {
      let currentThreadId = selectedThreadId;

      // Criar nova thread se necessário
      if (!currentThreadId || isCreatingNewThread) {
        const newThread = await createThread(finalMessage);
        currentThreadId = newThread.id;
        setSelectedThreadId(newThread.id);
        setIsCreatingNewThread(false);
        queryClient.invalidateQueries({ queryKey: ['chat-threads', memberId] });
      }

      // Salvar mensagem do usuário
      await supabase
        .from('mentor_messages')
        .insert({
          user_id: user.id,
          member_id: memberId,
          thread_id: currentThreadId,
          role: 'user',
          content: finalMessage
        });

      queryClient.invalidateQueries({ queryKey: ['mentor-messages', currentThreadId] });

      // Chamar API do mentor
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const { data: session } = await supabase.auth.getSession();

      // Obter nome do gestor logado para o Protocolo de Identidade Blindada
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const managerName = currentUser?.user_metadata?.full_name || 
                          currentUser?.user_metadata?.name || 
                          'Gestor';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-mentor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`
          },
          body: JSON.stringify({
            question: finalMessage,
            feedbacks: feedbacks,
            memberName: memberName,
            memberRole: memberRole,
            managerName: managerName,
            workStyleData: workStyleData,
            keyObjectives: keyObjectives
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Erro ao conectar com o Mentor. Tente novamente.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.response) {
        throw new Error('Resposta inválida do servidor.');
      }

      // Salvar resposta do assistente
      await supabase
        .from('mentor_messages')
        .insert({
          user_id: user.id,
          member_id: memberId,
          thread_id: currentThreadId,
          role: 'assistant',
          content: data.response
        });

      // Atualizar updated_at da thread
      await supabase
        .from('chat_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentThreadId);

      queryClient.invalidateQueries({ queryKey: ['mentor-messages', currentThreadId] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads', memberId] });
    } catch (error: any) {
      console.error('Erro no chat:', error);
      
      let errorMessage = 'Erro ao conectar com o Mentor. Tente novamente.';
      if (error.name === 'AbortError') {
        errorMessage = 'Tempo de resposta excedido. Tente novamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Erro ao consultar mentor",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Shift+Enter: comportamento padrão (nova linha)
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  const handleSuggestionClick = (text: string) => {
    handleSend(text);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isFileSupported(file)) {
      toast({
        title: "Formato inválido",
        description: "Envie PDF, Word, TXT, Markdown ou imagem.",
        variant: "destructive"
      });
      return;
    }

    setIsExtractingFile(true);
    try {
      const text = await extractTextFromFile(file);
      setInput(prev => prev + (prev ? '\n\n' : '') + text);
      toast({ 
        title: "Texto extraído!", 
        description: file.name 
      });
    } catch (error: any) {
      toast({ 
        title: "Erro ao processar", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsExtractingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const threadGroups = groupThreadsByDate(threads);
  const showEmptyState = !isCreatingNewThread && !selectedThreadId && threads.length === 0;
  const showNewThreadState = isCreatingNewThread || (threads.length === 0 && !isLoadingThreads);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 shadow-2xl gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <DialogTitle className="text-foreground text-lg">
            🎯 Mentor Chat
            <span className="text-muted-foreground font-normal text-base ml-2">
              — {memberName} {memberRole && `(${memberRole})`}
            </span>
          </DialogTitle>
        </DialogHeader>

        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Sidebar de Threads */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <div className="h-full flex flex-col border-r border-border">
              <div className="p-3 border-b border-border">
                <Button 
                  onClick={handleNewThread} 
                  variant="outline" 
                  className="w-full gap-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  Nova Conversa
                </Button>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {isLoadingThreads ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : threads.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma conversa ainda</p>
                    </div>
                  ) : (
                    threadGroups.map(group => (
                      <div key={group.label} className="mb-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
                          {group.label}
                        </p>
                        {group.threads.map(thread => (
                          <div key={thread.id} className="group relative">
                            {editingThreadId === thread.id ? (
                              <div className="flex items-center gap-1 px-2 py-1">
                                <Input
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameThread(thread.id, editingTitle);
                                    if (e.key === 'Escape') {
                                      setEditingThreadId(null);
                                      setEditingTitle('');
                                    }
                                  }}
                                  onBlur={() => handleRenameThread(thread.id, editingTitle)}
                                  autoFocus
                                  className="h-8 text-sm"
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedThreadId(thread.id);
                                  setIsCreatingNewThread(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors flex items-center justify-between ${
                                  selectedThreadId === thread.id
                                    ? 'bg-primary/10 text-primary'
                                    : 'hover:bg-muted text-foreground'
                                }`}
                              >
                                <span className="truncate flex-1">{thread.title}</span>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      onClick={(e) => e.stopPropagation()}
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent transition-opacity flex-shrink-0"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingThreadId(thread.id);
                                        setEditingTitle(thread.title);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Renomear
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingThread(thread);
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Área de Chat */}
          <ResizablePanel defaultSize={75}>
            <div className="h-full flex flex-col">
              <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
                <div className="space-y-4">
                  {isLoadingMessages && selectedThreadId && (
                    <div className="space-y-4">
                      <Skeleton className="h-16 w-3/4" />
                      <Skeleton className="h-12 w-1/2 ml-auto" />
                    </div>
                  )}

                  {(showEmptyState || showNewThreadState) && !isLoadingMessages && (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">
                        {showNewThreadState ? 'Nova conversa' : 'Início'} sobre {memberName}
                      </p>
                      <p className="text-sm mt-1">Use as sugestões abaixo ou faça uma pergunta</p>
                    </div>
                  )}

                  {!isLoadingMessages && messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
                            : 'bg-muted text-foreground rounded-2xl rounded-bl-md'
                        }`}
                      >
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                              li: ({ children }) => <li className="mb-1">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Pensando...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Área de input */}
              <div className="px-6 pb-6 pt-3 border-t border-border flex-shrink-0">
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                  {quickSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion.text)}
                      disabled={isLoading}
                      className="flex-shrink-0 px-3 py-1.5 text-sm bg-muted hover:bg-accent 
                                 text-muted-foreground hover:text-accent-foreground rounded-full 
                                 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {suggestion.emoji} {suggestion.text}
                    </button>
                  ))}
                </div>

                <div className="flex items-end gap-2 bg-background border border-border rounded-2xl shadow-lg px-4 py-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isExtractingFile}
                    className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground mb-0.5"
                    aria-label="Anexar arquivo"
                  >
                    {isExtractingFile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Como posso ajudar você hoje?"
                    disabled={isLoading || isExtractingFile}
                    rows={1}
                    className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground 
                               placeholder:text-muted-foreground disabled:cursor-not-allowed min-w-0
                               resize-none min-h-[40px] max-h-[200px] py-2.5
                               focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <div className="mb-0.5">
                    <VoiceInput 
                      onTranscription={(text) => {
                        setInput(text);
                        setTimeout(adjustTextareaHeight, 0);
                      }}
                      disabled={isLoading || isExtractingFile}
                    />
                  </div>
                  <Button 
                    onClick={() => handleSend()} 
                    disabled={isLoading || isExtractingFile || !input.trim()}
                    size="icon"
                    className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 flex-shrink-0 mb-0.5"
                    aria-label="Enviar mensagem"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        <AlertDialog open={!!deletingThread} onOpenChange={() => setDeletingThread(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
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
