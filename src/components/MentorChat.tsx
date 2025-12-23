import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Loader2, MessageCircle } from 'lucide-react';
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
  const scrollRef = useRef<HTMLDivElement>(null);
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
    staleTime: 1000 * 60 * 5, // 5 minutos
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

  const handleSend = async (messageToSend?: string) => {
    const finalMessage = messageToSend || input;
    if (!finalMessage.trim() || isLoading) return;

    setInput('');
    setIsLoading(true);

    // Salvar mensagem do usuário
    await saveMessageMutation.mutateAsync({ role: 'user', content: finalMessage });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const { data: session } = await supabase.auth.getSession();
      
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
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (text: string) => {
    handleSend(text);
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
                    <span>Pensando...</span>
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

          {/* Cápsula flutuante de input */}
          <div className="relative flex items-center bg-background border border-border rounded-2xl shadow-lg px-4 py-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Como posso ajudar você hoje?"
              disabled={isLoading}
              className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground 
                         placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />
            <VoiceInput 
              onTranscription={(text) => setInput(text)}
              disabled={isLoading}
              className="mr-1"
            />
            <Button 
              onClick={() => handleSend()} 
              disabled={isLoading || !input.trim()}
              size="icon"
              className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 ml-1 flex-shrink-0"
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
