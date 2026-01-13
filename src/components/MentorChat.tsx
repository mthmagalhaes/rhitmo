import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from '@/components/ui/resizable';
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
import { Send, Loader2, Paperclip, FileText, Image, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { VoiceInput } from './VoiceInput';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ThreadSidebar, 
  EmptyThreadState, 
  RenameThreadDialog,
  type ChatThread 
} from './mentor';

interface MentorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  thread_id: string | null;
}

interface AttachedFile {
  name: string;
  url: string;
  type: string;
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

const ALLOWED_FILE_TYPES = [
  'image/png', 'image/jpeg', 'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/markdown'
];

const getQuickSuggestions = (memberName: string) => [
  { 
    emoji: '📊', 
    text: 'Analisar padrões de comportamento', 
    hiddenMessage: `Analise as notas disponíveis sobre ${memberName} e identifique padrões de comportamento, participação em reuniões, temas discutidos e evolução ao longo do tempo. Considere transcrições de reuniões e 1:1s como fontes válidas de observação comportamental.` 
  },
  { 
    emoji: '🗣️', 
    text: 'Roteiro para 1:1', 
    hiddenMessage: `Com base nas notas e reuniões recentes de ${memberName}, sugira um roteiro para a próxima 1:1. Inclua tópicos relevantes baseados nos temas discutidos recentemente e possíveis pontos de acompanhamento.` 
  },
  { 
    emoji: '💡', 
    text: 'Sugerir PDI', 
    hiddenMessage: `Analise as notas disponíveis sobre ${memberName} e sugira possíveis pontos para um Plano de Desenvolvimento Individual (PDI). Considere as atividades, desafios e temas discutidos nas reuniões.` 
  },
  { 
    emoji: '⚠️', 
    text: 'Identificar riscos', 
    hiddenMessage: `Revise as notas e transcrições de reuniões de ${memberName} e identifique possíveis sinais de atenção: mudanças de engajamento, sobrecarga, conflitos ou padrões que merecem acompanhamento do gestor.` 
  },
  { 
    emoji: '📊', 
    text: 'Avaliação Trimestral', 
    hiddenMessage: `Gere uma avaliação de desempenho estruturada (Pontos Fortes e A Melhorar) de ${memberName} baseada estritamente nas notas dos últimos 90 dias. Considere transcrições de reuniões como evidências válidas.` 
  },
  { 
    emoji: '📝', 
    text: 'Resumir Histórico', 
    hiddenMessage: `Resuma cronologicamente os fatos mais relevantes registrados sobre ${memberName}. Inclua temas de reuniões, projetos mencionados e evolução ao longo do tempo.` 
  },
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
  const [isUploading, setIsUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [searchPhase, setSearchPhase] = useState<'idle' | 'searching' | 'generating'>('idle');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameThreadId, setRenameThreadId] = useState<string | null>(null);
  const [renameThreadTitle, setRenameThreadTitle] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null);
  const [isCreatingNewThread, setIsCreatingNewThread] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedThreadId(null);
      setIsCreatingNewThread(false);
    }
  }, [open]);

  // Buscar threads do membro
  const { data: threads = [], isLoading: isLoadingThreads } = useQuery({
    queryKey: ['chat-threads', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('member_id', memberId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as ChatThread[];
    },
    enabled: open && !!memberId && !!user,
  });

  // Auto-select first thread if exists and none selected (unless creating new)
  useEffect(() => {
    if (threads.length > 0 && selectedThreadId === null && !isCreatingNewThread) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, selectedThreadId, isCreatingNewThread]);

  // Buscar mensagens da thread selecionada
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
    enabled: open && !!selectedThreadId && !!user,
  });

  // Mutation para criar thread
  const createThreadMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('chat_threads')
        .insert({
          user_id: user.id,
          member_id: memberId,
          title: title.slice(0, 50) + (title.length > 50 ? '...' : '')
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as ChatThread;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-threads', memberId] });
    }
  });

  // Mutation para renomear thread
  const renameThreadMutation = useMutation({
    mutationFn: async ({ threadId, newTitle }: { threadId: string; newTitle: string }) => {
      const { error } = await supabase
        .from('chat_threads')
        .update({ title: newTitle })
        .eq('id', threadId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-threads', memberId] });
      toast({ title: 'Conversa renomeada!' });
    }
  });

  // Mutation para excluir thread
  const deleteThreadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase
        .from('chat_threads')
        .delete()
        .eq('id', threadId);
      
      if (error) throw error;
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-threads', memberId] });
      if (selectedThreadId === deletedId) {
        setSelectedThreadId(null);
      }
      toast({ title: 'Conversa excluída!' });
    }
  });

  // Mutation para salvar mensagem
  const saveMessageMutation = useMutation({
    mutationFn: async ({ 
      role, 
      content, 
      threadId 
    }: { 
      role: 'user' | 'assistant'; 
      content: string; 
      threadId: string 
    }) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('mentor_messages')
        .insert({
          user_id: user.id,
          member_id: memberId,
          role: role,
          content: content,
          thread_id: threadId
        });
      
      if (error) throw error;

      // Update thread's updated_at
      await supabase
        .from('chat_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', threadId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-messages', selectedThreadId] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads', memberId] });
    }
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Formato não suportado",
        description: "Envie imagem (PNG, JPG, WebP), PDF, Word, TXT ou Markdown.",
        variant: "destructive"
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive"
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(data.path);
      
      setAttachedFile({
        name: file.name,
        url: urlData.publicUrl,
        type: file.type
      });
      
      toast({ title: "Arquivo anexado!", description: file.name });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ 
        title: "Erro no upload", 
        description: error.message || "Falha ao enviar arquivo.", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
  };

  const handleSend = async (messageToSend?: string) => {
    const finalMessage = messageToSend || input;
    if (!finalMessage.trim() || isLoading) return;

    const currentAttachment = attachedFile;
    
    setInput('');
    setAttachedFile(null);
    setIsLoading(true);
    setSearchPhase('searching');

    // Gerar título se for nova conversa
    let activeThreadId = selectedThreadId;
    
    if (!activeThreadId) {
      // Criar nova thread com título baseado na mensagem
      const suggestions = getQuickSuggestions(memberName);
      const title = messageToSend 
        ? (suggestions.find(s => s.hiddenMessage === messageToSend || s.text === messageToSend)?.text || finalMessage.slice(0, 40))
        : finalMessage.slice(0, 40);
      
      try {
        const newThread = await createThreadMutation.mutateAsync(title);
        activeThreadId = newThread.id;
        setSelectedThreadId(newThread.id);
        setIsCreatingNewThread(false);
      } catch (error) {
        console.error('Error creating thread:', error);
        toast({ 
          title: "Erro ao criar conversa", 
          variant: "destructive" 
        });
        setIsLoading(false);
        setSearchPhase('idle');
        return;
      }
    }

    // Criar mensagem do usuário com indicação de anexo
    let userMessage = finalMessage;
    if (currentAttachment) {
      const fileLabel = currentAttachment.type.startsWith('image/') ? '📷' : '📎';
      userMessage = `${fileLabel} [${currentAttachment.name}]\n\n${finalMessage}`;
    }

    // Salvar mensagem do usuário
    await saveMessageMutation.mutateAsync({ 
      role: 'user', 
      content: userMessage, 
      threadId: activeThreadId 
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      setSearchPhase('generating');
      
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
            memberId: memberId,
            memberName: memberName,
            memberRole: memberRole,
            workStyleData: workStyleData,
            keyObjectives: keyObjectives,
            threadId: activeThreadId,
            fileUrl: currentAttachment?.url || null,
            fileType: currentAttachment?.type || null,
            fileName: currentAttachment?.name || null
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
        } catch {
          // If we can't parse JSON, use default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.response) {
        throw new Error('Resposta inválida do servidor.');
      }

      // Salvar resposta do assistente
      await saveMessageMutation.mutateAsync({ 
        role: 'assistant', 
        content: data.response, 
        threadId: activeThreadId 
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Erro no chat:', error);
      
      let errorMessage = 'Erro ao conectar com o Mentor. Tente novamente.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Tempo de resposta excedido. Tente novamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      await saveMessageMutation.mutateAsync({ 
        role: 'assistant', 
        content: `⚠️ ${errorMessage}`, 
        threadId: activeThreadId 
      });

      toast({
        title: "Erro ao consultar mentor",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setSearchPhase('idle');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: { emoji: string; text: string; hiddenMessage: string }) => {
    const message = suggestion.hiddenMessage || suggestion.text;
    handleSend(message);
  };

  const handleNewConversation = () => {
    setSelectedThreadId(null);
    setIsCreatingNewThread(true);
  };

  const handleRenameThread = (threadId: string, currentTitle: string) => {
    setRenameThreadId(threadId);
    setRenameThreadTitle(currentTitle);
    setRenameDialogOpen(true);
  };

  const handleConfirmRename = (newTitle: string) => {
    if (renameThreadId) {
      renameThreadMutation.mutate({ threadId: renameThreadId, newTitle });
    }
  };

  const handleDeleteThread = (threadId: string) => {
    setDeleteThreadId(threadId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteThreadId) {
      deleteThreadMutation.mutate(deleteThreadId);
    }
    setDeleteDialogOpen(false);
    setDeleteThreadId(null);
  };

  const isNewConversation = selectedThreadId === null;
  const showEmptyState = isNewConversation && !isLoading;

  return (
    <>
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
            {/* Sidebar */}
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
              <ThreadSidebar
                threads={threads}
                selectedThreadId={selectedThreadId}
                isLoading={isLoadingThreads}
                onNewConversation={handleNewConversation}
                onSelectThread={(threadId) => {
                  setSelectedThreadId(threadId);
                  setIsCreatingNewThread(false);
                }}
                onRenameThread={handleRenameThread}
                onDeleteThread={handleDeleteThread}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Main chat area */}
            <ResizablePanel defaultSize={75}>
              <div className="h-full flex flex-col">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedThreadId || 'new'}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    {showEmptyState ? (
                      <EmptyThreadState
                        memberName={memberName}
                        suggestions={getQuickSuggestions(memberName)}
                        onSuggestionClick={handleSuggestionClick}
                        isLoading={isLoading}
                      />
                    ) : (
                      <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
                        <div className="space-y-4">
                          {isLoadingMessages && (
                            <div className="space-y-4">
                              <Skeleton className="h-16 w-3/4" />
                              <Skeleton className="h-12 w-1/2 ml-auto" />
                              <Skeleton className="h-20 w-3/4" />
                            </div>
                          )}

                          {!isLoadingMessages && messages.length === 0 && selectedThreadId && (
                            <div className="text-center py-12 text-muted-foreground">
                              <p className="text-sm">Nenhuma mensagem nesta conversa ainda</p>
                            </div>
                          )}

                          {messages.map((msg) => (
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
                                  <span>
                                    {searchPhase === 'searching' ? '🔍 Consultando histórico...' : '✨ Gerando resposta...'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Área de input */}
                <div className="px-6 pb-6 pt-3 border-t border-border flex-shrink-0">
                  {/* Quick suggestions - show only for new conversation or when there are no messages */}
                  {!showEmptyState && (
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                      {getQuickSuggestions(memberName).slice(0, 4).map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          disabled={isLoading}
                          className="flex-shrink-0 px-3 py-1.5 text-sm bg-muted hover:bg-accent 
                                     text-muted-foreground hover:text-accent-foreground rounded-full 
                                     transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {suggestion.emoji} {suggestion.text}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Card de arquivo anexado */}
                  {attachedFile && (
                    <div className="mb-3 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-border">
                      {attachedFile.type.startsWith('image/') ? (
                        <Image className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate flex-1">{attachedFile.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={handleRemoveAttachment}
                        disabled={isLoading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Feedback de status */}
                  {searchPhase !== 'idle' && (
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {searchPhase === 'searching' 
                        ? '🔍 Consultando Diário de Bordo...'
                        : '✨ Gerando resposta...'}
                    </div>
                  )}

                  {/* Cápsula flutuante de input */}
                  <div className="flex items-center gap-2 bg-background border border-border rounded-2xl shadow-lg px-4 py-2">
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
                      disabled={isLoading || isUploading || !!attachedFile}
                      className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Anexar arquivo"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={attachedFile ? "Adicione uma pergunta sobre o arquivo..." : "Como posso ajudar você hoje?"}
                      disabled={isLoading || isUploading}
                      className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground 
                                 placeholder:text-muted-foreground disabled:cursor-not-allowed min-w-0"
                    />
                    <VoiceInput 
                      onTranscription={(text) => setInput(text)}
                      disabled={isLoading || isUploading}
                    />
                    <Button 
                      onClick={() => handleSend()} 
                      disabled={isLoading || isUploading || !input.trim()}
                      size="icon"
                      className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 flex-shrink-0"
                      aria-label="Enviar mensagem"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <RenameThreadDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        currentTitle={renameThreadTitle}
        onConfirm={handleConfirmRename}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as mensagens desta conversa serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
