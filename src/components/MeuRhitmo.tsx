import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface MeuRhitmoProps {
  memberName: string;
  memberRole: string;
  workStyleData: any;
  aiAnalysis: any;
  pdiItems: any[];
  latestReview: string | null;
  userId: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const quickSuggestions = [
  "Como me preparo para pedir promoção?",
  "Me ajuda a processar um feedback difícil",
  "Quais são meus pontos cegos?",
  "Como posso acelerar meu desenvolvimento?",
  "Me prepara para minha próxima 1:1",
];

export default function MeuRhitmo({ memberName, memberRole, workStyleData, aiAnalysis, pdiItems, latestReview, userId }: MeuRhitmoProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load existing messages on mount
  useEffect(() => {
    const loadHistory = async () => {
      // Find thread
      const { data: member } = await supabase
        .from('team_members')
        .select('id')
        .eq('linked_user_id', userId)
        .maybeSingle();
      if (!member) return;

      const { data: thread } = await supabase
        .from('chat_threads')
        .select('id')
        .eq('user_id', userId)
        .eq('member_id', member.id)
        .eq('title', 'meu-rhitmo')
        .maybeSingle();

      if (!thread) return;
      setThreadId(thread.id);

      const { data: msgs } = await supabase
        .from('mentor_messages')
        .select('id, role, content')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });

      if (msgs) {
        setMessages(msgs.map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content })));
      }
    };
    loadHistory();
  }, [userId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages, isLoading]);

  const handleSend = async (messageToSend?: string) => {
    const finalMessage = messageToSend || input;
    if (!finalMessage.trim() || isLoading) return;

    setInput('');
    const tempId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: finalMessage }]);
    setIsLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meu-rhitmo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token}`,
        },
        body: JSON.stringify({
          question: finalMessage,
          memberName,
          memberRole,
          workStyleData,
          aiAnalysis,
          pdiItems,
          latestReview,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao conectar com o Meu Rhitmo.');
      }

      const data = await response.json();
      if (!data.response) throw new Error('Resposta inválida.');

      if (data.threadId) setThreadId(data.threadId);

      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: data.response }]);
    } catch (error: any) {
      console.error('Meu Rhitmo error:', error);
      toast.error(error.message || 'Erro ao conectar. Tente novamente.');
      // Remove the user message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-5 border-b border-border">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">Meu Rhitmo</p>
          <p className="text-xs text-muted-foreground">Seu parceiro pessoal de desenvolvimento</p>
        </div>
        <Badge className="ml-auto bg-primary/10 text-primary text-xs border-0 shrink-0">Confidencial</Badge>
      </div>

      {/* Messages area */}
      <ScrollArea className="h-80 p-5">
        {/* Empty state */}
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-8 px-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1 text-foreground">Olá, {memberName.split(' ')[0]}! 👋</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Sou seu parceiro de desenvolvimento. Posso te ajudar a pensar na carreira, se preparar para conversas importantes ou processar um feedback que você recebeu.
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              "mb-4 flex",
              msg.role === 'user' ? "justify-end" : "justify-start items-start"
            )}
          >
            {msg.role === 'assistant' && (
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 shrink-0 mt-0.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === 'user'
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted/50 text-foreground rounded-bl-sm"
              )}
            >
              {msg.role === 'assistant' ? (
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0 prose-headings:text-sm">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-start items-start mb-4">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-muted/50 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </ScrollArea>

      {/* Quick suggestions — only on empty state */}
      {messages.length === 0 && !isLoading && (
        <div className="px-5 pb-4 flex flex-wrap gap-2">
          {quickSuggestions.map(suggestion => (
            <button
              key={suggestion}
              onClick={() => handleSend(suggestion)}
              className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left text-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Pergunte sobre sua carreira ou peça ajuda com uma situação..."
            className="resize-none min-h-[44px] max-h-32 text-sm rounded-xl"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0 rounded-xl h-11 w-11"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Suas conversas são confidenciais e não são compartilhadas com seu líder.
        </p>
      </div>
    </Card>
  );
}
