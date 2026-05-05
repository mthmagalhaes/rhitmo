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
import { citationMarkdownComponents } from '@/lib/markdownCitations';
import { CitationCounterProvider } from '@/components/context/CitationCounterProvider';
import { VoiceInput } from './VoiceInput';
import { ContextPicker } from './ContextPicker';
import { extractTextFromFile, isFileSupported } from '@/lib/fileParser';
import { usePlanLimits } from '@/hooks/usePlanLimits';
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
  summaryApplied?: boolean;
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
  userType: 'leader' | 'direct_report';
  memberName: string;
  memberId?: string;
  memberRole?: string;
  feedbacks?: any[];
  workStyleData?: any;
  keyObjectives?: string | null;
  leaderSyncData?: any;
  // direct_report-specific
  aiAnalysis?: any;
  pdiItems?: any[];
  latestReview?: string | null;
  userId?: string;
  initialPrompt?: string;
  initialThreadId?: string | null;
}

// Prompt Gallery — combate "blank page anxiety". Templates curtos para o
// chip-row no input (text) e cards ricos para o estado vazio (title+desc+icon).
const leaderSuggestions = [
  { emoji: '📋', text: 'Resumir o último mês' },
  { emoji: '🗓️', text: 'Sugerir pauta para próxima 1:1' },
  { emoji: '🔍', text: 'Quais padrões aparecem nos últimos 30 dias?' },
  { emoji: '⚠️', text: 'Quem está em risco esta semana?' },
  { emoji: '🪞', text: 'Identificar contradições no meu Mirror' },
  { emoji: '⚡', text: 'Listar ações pendentes não resolvidas' },
];

interface PromptGalleryItem {
  emoji: string;
  title: string;
  description: string;
}

const leaderPromptGallery: PromptGalleryItem[] = [
  {
    emoji: '📋',
    title: 'Resumir o último mês',
    description: 'Destaques, riscos e padrões de feedback dos últimos 30 dias.',
  },
  {
    emoji: '🗓️',
    title: 'Pauta para próxima 1:1',
    description: 'Tópicos sugeridos com base no que ficou em aberto.',
  },
  {
    emoji: '🔍',
    title: 'Padrões de feedback',
    description: 'Temas que se repetem nos últimos 30 dias.',
  },
  {
    emoji: '⚠️',
    title: 'Quem está em risco',
    description: 'Sinais de churn, sobrecarga ou desengajamento.',
  },
  {
    emoji: '🪞',
    title: 'Contradições no Mirror',
    description: 'O que você disse vs. o que mostrou nas 1:1s.',
  },
  {
    emoji: '⚡',
    title: 'Ações pendentes',
    description: 'Compromissos seus e do liderado ainda em aberto.',
  },
];

const directReportPromptGallery: PromptGalleryItem[] = [
  { emoji: '🚀', title: 'Preparar pedido de promoção', description: 'Como estruturar a conversa com base no seu histórico.' },
  { emoji: '💬', title: 'Processar feedback difícil', description: 'Te ajudo a ler o subtexto e planejar o próximo passo.' },
  { emoji: '🔍', title: 'Meus pontos cegos', description: 'O que recorrentemente aparece e você pode estar ignorando.' },
  { emoji: '⚡', title: 'Acelerar desenvolvimento', description: 'Próximas 2-3 alavancas com maior retorno.' },
  { emoji: '📋', title: 'Preparar próxima 1:1', description: 'Pauta sugerida com base no que ficou pendente.' },
  { emoji: '🎯', title: 'Próximos 90 dias', description: 'Objetivos realistas alinhados ao seu PDI.' },
];

const directReportSuggestions = [
  { emoji: '🚀', text: 'Como me preparo para pedir promoção?' },
  { emoji: '💬', text: 'Me ajuda a processar um feedback difícil' },
  { emoji: '🔍', text: 'Quais são meus pontos cegos?' },
  { emoji: '⚡', text: 'Como posso acelerar meu desenvolvimento?' },
  { emoji: '📋', text: 'Me prepara para minha próxima 1:1' },
];

export const MentorChat = ({ 
  open, 
  onOpenChange, 
  userType,
  memberName, 
  memberId,
  memberRole, 
  feedbacks = [], 
  workStyleData, 
  keyObjectives,
  leaderSyncData,
  aiAnalysis,
  pdiItems,
  latestReview,
  userId,
  initialPrompt,
  initialThreadId,
}: MentorChatProps) => {
  const isLeader = userType === 'leader';
  
  // Derive config from userType
  const threadType = isLeader ? 'mentor' : 'career';
  const threadsQueryKey = isLeader ? 'chat-threads' : 'meu-rhitmo-threads';
  const messagesQueryKey = isLeader ? 'mentor-messages' : 'meu-rhitmo-messages';
  const edgeFunctionName = isLeader ? 'chat-mentor' : 'meu-rhitmo';
  const title = isLeader ? 'Mentor Chat' : 'Meu Rhitmo';
  const quickSuggestions = isLeader ? leaderSuggestions : directReportSuggestions;

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [lastSummaryApplied, setLastSummaryApplied] = useState(false);
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isCreatingNewThread, setIsCreatingNewThread] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingThread, setDeletingThread] = useState<ChatThread | null>(null);
  const [attachment, setAttachment] = useState<{ name: string; content: string; imageBase64?: string; mimeType?: string; isImage?: boolean } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const placeholder = attachment
    ? 'Descreva o que você quer saber sobre a imagem...'
    : isLeader
      ? `Pergunte sobre ${memberName} (Ctrl+V para colar imagem)…`
      : 'Pergunte sobre sua carreira ou cole uma imagem (Ctrl+V)...';
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { canSendMentorMessage, mentorMessagesRemaining, limits } = usePlanLimits();

  // Resolve effective owner for queries
  const effectiveUserId = isLeader ? user?.id : userId;
  // For threads: leader queries by memberId, direct_report by userId
  const threadQueryId = isLeader ? memberId : userId;

  // ── Queries ──────────────────────────────────────────
  const { data: threads = [], isLoading: isLoadingThreads } = useQuery({
    queryKey: [threadsQueryKey, threadQueryId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      let query = supabase
        .from('chat_threads')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('type', threadType)
        .order('updated_at', { ascending: false });
      
      if (isLeader) {
        if (memberId) query = query.eq('member_id', memberId);
        else query = query.is('member_id', null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ChatThread[];
    },
    enabled: open && !!effectiveUserId,
    staleTime: 1000 * 60 * 5,
  });

  // Apply initialThreadId when sheet opens (overrides auto-select of most recent)
  useEffect(() => {
    if (open && initialThreadId) {
      setSelectedThreadId(initialThreadId);
      setIsCreatingNewThread(false);
    }
  }, [open, initialThreadId]);

  useEffect(() => {
    if (!isLoadingThreads && threads.length > 0 && !selectedThreadId && !isCreatingNewThread) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, isLoadingThreads, selectedThreadId, isCreatingNewThread]);

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: [messagesQueryKey, selectedThreadId],
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

  // Populate input with initialPrompt when dialog opens
  useEffect(() => {
    if (open && initialPrompt) {
      setInput(initialPrompt);
      setIsCreatingNewThread(true);
      setSelectedThreadId(null);
    }
  }, [open, initialPrompt]);

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

  const createThread = async (firstMessage: string) => {
    if (!effectiveUserId) throw new Error('Usuário não autenticado');
    const titleText = firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '...' : '');
    const insertData: any = { user_id: effectiveUserId, title: titleText, type: threadType };
    if (isLeader && memberId) insertData.member_id = memberId;
    
    const { data, error } = await supabase
      .from('chat_threads')
      .insert(insertData)
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
      queryClient.setQueryData([threadsQueryKey, threadQueryId], (old: ChatThread[] | undefined) =>
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
      queryClient.invalidateQueries({ queryKey: [threadsQueryKey, threadQueryId] });
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
    let finalMessage = messageToSend || input;
    if (!finalMessage.trim() && !attachment) return;
    if (isLoading || !effectiveUserId) return;

    if (!canSendMentorMessage) {
      toast({
        title: 'Limite de mensagens atingido',
        description: `Você atingiu o limite de ${limits.maxMentorMessages} mensagens/mês do plano ${limits.planName}. Faça upgrade para continuar.`,
        duration: 8000,
      });
      return;
    }

    let imageContent: { isImage: true; imageBase64: string; mimeType: string; textMessage: string } | undefined;
    if (attachment?.isImage && attachment.imageBase64 && attachment.mimeType) {
      const defaultText = isLeader ? 'Analise esta imagem detalhadamente. Se for uma conversa, identifique o contexto emocional, os sinais comportamentais e sugira como eu poderia responder de forma empática e estratégica. Se for um documento ou gráfico, extraia os insights principais.' : 'Analise esta imagem detalhadamente e me dê insights relevantes para meu desenvolvimento.';
      imageContent = { isImage: true, imageBase64: attachment.imageBase64, mimeType: attachment.mimeType, textMessage: finalMessage || defaultText };
    } else if (attachment) {
      finalMessage = finalMessage + `\n\n--- ARQUIVO ANEXADO (${attachment.name}) ---\n${attachment.content}`;
    }

    setInput('');
    setAttachment(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    // Progressive loading messages — sensação de progresso real
    const wordCount = finalMessage.split(/\s+/).length;
    const isLongMessage = wordCount > 800;
    let loadingInterval: ReturnType<typeof setInterval> | null = null;

    const defaultSteps = isLeader
      ? [
          `Lendo o histórico de ${memberName}…`,
          'Analisando padrões e contradições…',
          'Estruturando a resposta…',
        ]
      : [
          'Revendo seu contexto…',
          'Conectando insights…',
          'Preparando sua resposta…',
        ];
    const longSteps = [
      'Analisando transcrição…',
      'Extraindo tópicos e decisões…',
      'Gerando sugestões contextualizadas…',
    ];
    const loadingSteps = isLongMessage ? longSteps : defaultSteps;
    let stepIndex = 0;
    setLoadingMessage(loadingSteps[0]);
    loadingInterval = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, loadingSteps.length - 1);
      setLoadingMessage(loadingSteps[stepIndex]);
    }, 2500);

    try {
      let currentThreadId = selectedThreadId;

      if (isLeader) {
        // Leader mode: create thread client-side
        if (!currentThreadId || isCreatingNewThread) {
          const newThread = await createThread(finalMessage);
          currentThreadId = newThread.id;
          setSelectedThreadId(newThread.id);
          setIsCreatingNewThread(false);
          queryClient.invalidateQueries({ queryKey: [threadsQueryKey, threadQueryId] });
        }

        const savedContent = imageContent ? (imageContent.textMessage || '[Imagem enviada para análise]') : finalMessage;
        await supabase.from('mentor_messages').insert({ user_id: effectiveUserId, member_id: memberId ?? null, thread_id: currentThreadId, role: 'user', content: savedContent });
        queryClient.invalidateQueries({ queryKey: [messagesQueryKey, currentThreadId] });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
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
          contextFeedbacks = sorted.slice(0, 20);
        }

        const MAX_RETRIES = 3;
        let data: any = null;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          if (attempt > 0) {
            const delay = Math.pow(2, attempt - 1) * 1000;
            setLoadingMessage(`Reconectando... (tentativa ${attempt}/${MAX_RETRIES})`);
            await new Promise(r => setTimeout(r, delay));
          }

          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${edgeFunctionName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.session?.access_token}` },
            body: JSON.stringify({
              question: finalMessage,
              feedbacks: contextFeedbacks,
              memberName, memberRole, managerName, workStyleData, keyObjectives, contextMode, leaderSyncData,
              conversationHistory: messages.slice(-10).map(msg => ({ role: msg.role, content: msg.content })),
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
        setLastSummaryApplied(!!data.metadata?.summary_applied);

        await supabase.from('mentor_messages').insert({ user_id: effectiveUserId, member_id: memberId ?? null, thread_id: currentThreadId, role: 'assistant', content: data.response });
        await supabase.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', currentThreadId);
        queryClient.invalidateQueries({ queryKey: [messagesQueryKey, currentThreadId] });
        queryClient.invalidateQueries({ queryKey: [threadsQueryKey, threadQueryId] });

      } else {
        // Direct report mode: edge function creates thread
        if (!currentThreadId || isCreatingNewThread) {
          currentThreadId = null;
        }

        const { data: session } = await supabase.auth.getSession();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const MAX_RETRIES = 3;
        let data: any = null;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          if (attempt > 0) {
            const delay = Math.pow(2, attempt - 1) * 1000;
            setLoadingMessage(`Reconectando... (tentativa ${attempt}/${MAX_RETRIES})`);
            await new Promise(r => setTimeout(r, delay));
          }

          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${edgeFunctionName}`, {
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
              imageContent,
            }),
            signal: controller.signal,
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
          let errorMessage = 'Erro ao conectar com o Meu Rhitmo. Tente novamente.';
          try { const errorData = await response.json(); errorMessage = errorData.error || errorMessage; } catch {}
          throw new Error(errorMessage);
        }

        if (!data?.response) throw new Error('Resposta inválida do servidor.');

        if (data.threadId && data.threadId !== selectedThreadId) {
          setSelectedThreadId(data.threadId);
          setIsCreatingNewThread(false);
          queryClient.invalidateQueries({ queryKey: [threadsQueryKey, threadQueryId] });
        }

        queryClient.invalidateQueries({ queryKey: [messagesQueryKey, data.threadId || currentThreadId] });
        queryClient.invalidateQueries({ queryKey: [threadsQueryKey, threadQueryId] });
      }
    } catch (error: any) {
      console.error('Erro no chat:', error);
      let errorMessage = isLeader ? 'Erro ao conectar com o Mentor. Tente novamente.' : 'Erro ao conectar. Tente novamente.';
      if (error.name === 'AbortError') {
        errorMessage = 'A resposta está demorando mais que o normal. Tente reformular com uma pergunta mais específica ou envie de novo.';
      } else if (error.message?.includes('429') || error.message?.toLowerCase().includes('ocupado')) {
        errorMessage = 'O serviço de IA está com muitas requisições agora. Aguarde 30 segundos e tente de novo.';
      } else if (error.message?.includes('402') || error.message?.toLowerCase().includes('crédito')) {
        errorMessage = 'Créditos de IA esgotados no workspace. Avise o administrador.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({ title: isLeader ? "Erro ao consultar mentor" : "Erro no Meu Rhitmo", description: errorMessage, variant: "destructive", duration: 7000 });
    } finally { setIsLoading(false); setLoadingMessage(''); if (loadingInterval) clearInterval(loadingInterval); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItem = Array.from(items).find(item => item.type.startsWith('image/'));
    if (!imageItem) return;

    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Formato não suportado', description: 'Use PNG, JPG ou WEBP.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande', description: 'Máximo 5MB.', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Full = event.target?.result as string;
      const base64Data = base64Full.split(',')[1];
      setAttachment({ name: 'imagem-colada.png', content: '', imageBase64: base64Data, mimeType: file.type, isImage: true });
      toast({ title: '📋 Imagem colada!', description: 'Descreva o que você quer saber sobre ela.' });
    };
    reader.readAsDataURL(file);
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

  const handleStartEdit = (msg: MentorMessage) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
    setTimeout(() => {
      if (editTextareaRef.current) {
        editTextareaRef.current.style.height = 'auto';
        editTextareaRef.current.style.height = `${Math.min(editTextareaRef.current.scrollHeight, 200)}px`;
        editTextareaRef.current.focus();
      }
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async (msg: MentorMessage) => {
    if (!editingContent.trim() || isLoading) return;
    const trimmed = editingContent.trim();
    if (trimmed === msg.content) { handleCancelEdit(); return; }

    setEditingMessageId(null);
    setEditingContent('');
    setIsLoading(true);

    try {
      // Update message content
      await supabase.from('mentor_messages').update({ content: trimmed }).eq('id', msg.id);

      // Delete all messages after this one in the thread
      const msgIndex = messages.findIndex(m => m.id === msg.id);
      const subsequentMessages = messages.slice(msgIndex + 1);
      if (subsequentMessages.length > 0) {
        const idsToDelete = subsequentMessages.map(m => m.id);
        await supabase.from('mentor_messages').delete().in('id', idsToDelete);
      }

      // Invalidate to show updated state
      await queryClient.invalidateQueries({ queryKey: [messagesQueryKey, selectedThreadId] });

      // Re-send edited message to get new AI response
      await handleSend(trimmed);
    } catch (error: any) {
      console.error('Erro ao editar mensagem:', error);
      toast({ title: 'Erro ao editar', description: 'Tente novamente.', variant: 'destructive' });
      setIsLoading(false);
    }
  };

  // ── Derived state ────────────────────────────────────
  const threadGroups = groupThreadsByDate(threads);
  const showEmptyState = !isCreatingNewThread && !selectedThreadId && threads.length === 0;
  const showNewThreadState = isCreatingNewThread || (threads.length === 0 && !isLoadingThreads);
  const userInitials = isLeader
    ? (user?.user_metadata?.full_name
      ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
      : 'EU')
    : (memberName
      ? memberName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
      : 'EU');

  // Icon for assistant bubbles
  const AssistantIcon = () => isLeader
    ? <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-sm flex-shrink-0 mt-0.5">🎯</div>
    : <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 flex-shrink-0 mt-0.5"><Sparkles className="h-3.5 w-3.5 text-primary" /></div>;

  // ── Markdown components (with citation chip support) ──────────
  // citation-aware p/li/strong come LAST so they override the styled defaults below.
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
    // Citation-aware overrides (last wins):
    ...citationMarkdownComponents,
  };

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 shadow-[0_2px_40px_rgba(0,0,0,0.08)] [&>button]:hidden overflow-hidden">
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
                {isLeader ? '🎯' : <Sparkles className="h-4 w-4 text-primary" />}
              </div>
              <DialogTitle className="text-foreground text-base font-semibold tracking-tight">
                {title}
                {isLeader && (
                  <span className="text-muted-foreground font-normal text-sm ml-2">
                    — {memberName} {memberRole && `(${memberRole})`}
                  </span>
                )}
              </DialogTitle>
            </div>
            {isLeader ? (
              <ContextPicker 
                feedbacks={feedbacks}
                selectedIds={selectedContexts}
                onSelectionChange={setSelectedContexts}
              />
            ) : (
              <Badge className="bg-primary/10 text-primary text-xs border-0">Confidencial</Badge>
            )}
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
                    <p>Nenhuma conversa{isLeader ? '' : ' ainda'}</p>
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
                  <div className="flex flex-col items-center justify-center py-12 px-2 text-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-2xl mb-4">
                      {isLeader ? '🎯' : <Sparkles className="h-6 w-6 text-primary" />}
                    </div>
                    <h2 className="font-semibold text-xl text-foreground tracking-tight">
                      {isLeader ? `Mentor de ${memberName}` : `Olá, ${memberName.split(' ')[0]}! 👋`}
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-md mt-2">
                      {isLeader
                        ? `Pergunte qualquer coisa sobre ${memberName}, ou comece com um destes templates:`
                        : 'Sou seu parceiro de desenvolvimento. Comece com um destes templates ou pergunte o que quiser:'}
                    </p>

                    {/* Prompt Gallery — Bento grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-6 w-full max-w-2xl text-left">
                      {(isLeader ? leaderPromptGallery : directReportPromptGallery).map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(p.title)}
                          disabled={isLoading}
                          className="group rounded-2xl border border-border/60 bg-card p-3.5 hover:border-primary/40 hover:shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="text-lg leading-none mt-0.5">{p.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-foreground tracking-tight">
                                {p.title}
                              </p>
                              <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                                {p.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                {!isLoadingMessages && messages.map((msg, idx) => {
                  const isLastAssistant = msg.role === 'assistant' && idx === messages.length - 1;
                  return (
                  msg.role === 'user' ? (
                    <div key={msg.id} className="flex flex-row-reverse items-start gap-2.5 max-w-[75%] ml-auto group animate-message-in">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/20 text-primary text-[10px] font-semibold flex-shrink-0 mt-0.5">
                        {userInitials}
                      </div>
                      {editingMessageId === msg.id ? (
                        <div className="flex-1 min-w-0">
                          <textarea
                            ref={editTextareaRef}
                            value={editingContent}
                            onChange={(e) => {
                              setEditingContent(e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(msg); }
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="w-full bg-background border border-primary/40 rounded-xl px-4 py-2.5 text-sm text-foreground resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all min-h-[44px] max-h-[200px]"
                          />
                          <div className="flex items-center gap-2 mt-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-7 text-xs rounded-lg">
                              Cancelar
                            </Button>
                            <Button size="sm" onClick={() => handleSaveEdit(msg)} disabled={!editingContent.trim() || editingContent.trim() === msg.content} className="h-7 text-xs rounded-lg">
                              Salvar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="rounded-2xl px-4 py-2.5 bg-muted/60 border border-border/40 text-foreground text-sm leading-relaxed transition-all duration-200">
                            {msg.content}
                          </div>
                          <div className="absolute -bottom-1 left-0 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-0.5 translate-y-full pt-1">
                            <button
                              onClick={() => handleStartEdit(msg)}
                              disabled={isLoading}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleCopyMessage(msg.content)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Copiar"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={msg.id} className="flex items-start gap-3 group animate-message-in">
                      <AssistantIcon />
                      <div className="flex-1 min-w-0 text-sm text-foreground">
                        {isLeader && isLastAssistant && lastSummaryApplied && (
                          <div className="mb-2">
                            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[11px] rounded-full px-2.5 py-0.5 border-0 gap-1">
                              <Sparkles className="h-3 w-3" />
                              Resumo inteligente
                            </Badge>
                          </div>
                        )}
                        <CitationCounterProvider>
                          <ReactMarkdown components={markdownComponents}>
                            {msg.content}
                          </ReactMarkdown>
                        </CitationCounterProvider>
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 mt-1.5">
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
                );
                })}

                {/* Loading indicator — skeleton bubble + progresso suave */}
                {isLoading && (
                  <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
                    <AssistantIcon />
                    <div className="flex flex-col gap-2 max-w-[75%]">
                      <div className="rounded-2xl bg-muted/50 px-4 py-3 space-y-2">
                        <Skeleton className="h-3 w-48 rounded-full" />
                        <Skeleton className="h-3 w-64 rounded-full" />
                        <Skeleton className="h-3 w-40 rounded-full" />
                      </div>
                      <div className="flex items-center gap-2 px-1">
                        <span className="flex gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                        </span>
                        <span className="text-xs text-muted-foreground italic transition-opacity duration-300">
                          {loadingMessage || 'Pensando…'}
                        </span>
                      </div>
                    </div>
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
                  onPaste={handlePaste}
                  placeholder={placeholder}
                  disabled={isLoading || isExtractingFile}
                  rows={1}
                  className="w-full bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground resize-none min-h-[44px] max-h-[160px] px-4 pt-3 pb-1 focus:ring-0 disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-between px-3 py-2 border-t border-border/40">
                  <div className="flex items-center gap-1">
                    {isLeader ? (
                      <>
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
                      </>
                    ) : (
                      <div className="flex items-center gap-1">
                        <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFileSelect} />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isLoading || isExtractingFile}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          {isExtractingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                          <span className="hidden sm:inline">Anexar</span>
                        </button>
                        <p className="text-xs text-muted-foreground">
                          Conversas confidenciais
                        </p>
                      </div>
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
};
