import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Loader2, MessageCircle, Paperclip, FileText, Image, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { VoiceInput } from './VoiceInput';

interface MentorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
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

const quickSuggestions = [
  { emoji: '📊', text: 'Analisar padrões de comportamento', hiddenMessage: '' },
  { emoji: '🗣️', text: 'Roteiro para 1:1', hiddenMessage: '' },
  { emoji: '💡', text: 'Sugerir PDI', hiddenMessage: '' },
  { emoji: '⚠️', text: 'Identificar riscos', hiddenMessage: '' },
  { emoji: '📊', text: 'Avaliação Trimestral', hiddenMessage: 'Gere uma avaliação de desempenho estruturada (Pontos Fortes e A Melhorar) baseada estritamente nas notas dos últimos 90 dias.' },
  { emoji: '📝', text: 'Resumir Histórico', hiddenMessage: 'Resuma cronologicamente os fatos mais relevantes registrados sobre este membro.' },
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar histórico de mensagens
  const { data: messages = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['mentor-messages', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mentor_messages')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as MentorMessage[];
    },
    enabled: open && !!memberId && !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Mutation para salvar mensagem
  const saveMessageMutation = useMutation({
    mutationFn: async (message: { role: 'user' | 'assistant'; content: string }) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('mentor_messages')
        .insert({
          user_id: user.id,
          member_id: memberId,
          role: message.role,
          content: message.content
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-messages', memberId] });
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

    // Validar tipo
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Formato não suportado",
        description: "Envie imagem (PNG, JPG, WebP), PDF, Word, TXT ou Markdown.",
        variant: "destructive"
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validar tamanho (max 10MB)
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
      // Gerar nome único com user_id como pasta
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      
      // Upload para Storage
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);
      
      if (error) throw error;
      
      // Obter URL pública
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

    // Capturar anexo atual antes de limpar
    const currentAttachment = attachedFile;
    
    setInput('');
    setAttachedFile(null);
    setIsLoading(true);
    setSearchPhase('searching');

    // Criar mensagem do usuário com indicação de anexo
    let userMessage = finalMessage;
    if (currentAttachment) {
      const fileLabel = currentAttachment.type.startsWith('image/') ? '📷' : '📎';
      userMessage = `${fileLabel} [${currentAttachment.name}]\n\n${finalMessage}`;
    }

    // Salvar mensagem do usuário
    await saveMessageMutation.mutateAsync({ role: 'user', content: userMessage });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s para processar arquivos

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
            // Novos campos para anexo
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
          // Se não conseguir parsear o JSON, usa mensagem padrão
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.response) {
        throw new Error('Resposta inválida do servidor.');
      }

      // Salvar resposta do assistente
      await saveMessageMutation.mutateAsync({ role: 'assistant', content: data.response });
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Erro no chat:', error);
      
      let errorMessage = 'Erro ao conectar com o Mentor. Tente novamente.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Tempo de resposta excedido. Tente novamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Salvar erro como mensagem do assistente
      await saveMessageMutation.mutateAsync({ role: 'assistant', content: `⚠️ ${errorMessage}` });

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

  const handleSuggestionClick = (suggestion: typeof quickSuggestions[0]) => {
    const message = suggestion.hiddenMessage || suggestion.text;
    handleSend(message);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 shadow-2xl gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <DialogTitle className="text-foreground text-lg">
            🎯 Mentor Chat
            <span className="text-muted-foreground font-normal text-base ml-2">
              — {memberName} {memberRole && `(${memberRole})`}
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
          <div className="space-y-4">
            {/* Skeleton loader */}
            {isLoadingHistory && (
              <div className="space-y-4">
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-12 w-1/2 ml-auto" />
                <Skeleton className="h-20 w-3/4" />
              </div>
            )}

            {/* Empty state */}
            {!isLoadingHistory && messages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Início da conversa sobre {memberName}</p>
                <p className="text-sm mt-1">Use as sugestões abaixo ou faça uma pergunta</p>
              </div>
            )}

            {/* Messages */}
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
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      {attachedFile ? 'Processando arquivo...' : 'Pensando...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Área de input */}
        <div className="px-6 pb-6 pt-3 border-t border-border flex-shrink-0">
          {/* Chips de sugestão rápida */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
            {quickSuggestions.map((suggestion, idx) => (
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
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            {/* Paperclip button for file upload */}
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
      </DialogContent>
    </Dialog>
  );
};
