// Sprint 13.3 — /lider/mentor/:threadId
// Página dedicada do Mentor Chat (estilo Claude/ChatGPT/Windmill). Renderiza
// a mesma experiência do MentorChat, mas em fullscreen, sem Dialog. O launchpad
// (/lider/mentor) cria a thread e navega para cá com `initialPrompt` no state.
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useLeaderMembers } from '@/hooks/useLeaderMembers';
import { MentorChat } from '@/components/MentorChat';

interface ThreadRow {
  id: string;
  member_id: string | null;
  user_id: string;
  type: string;
  source: string;
}

export default function LiderMentorThread() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { id: effectiveUserId } = useEffectiveUser();
  const { members, isLoading: membersLoading } = useLeaderMembers();

  const initState = (location.state ?? null) as
    | { initialPrompt?: string; initialAttachment?: { name: string; content: string; imageBase64?: string; mimeType?: string; isImage?: boolean } | null }
    | null;
  const initialPrompt = initState?.initialPrompt;
  const initialAttachment = initState?.initialAttachment ?? null;

  // Resolve member_id from the thread row
  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ['mentor-thread-meta', threadId],
    queryFn: async (): Promise<ThreadRow | null> => {
      if (!threadId) return null;
      const { data } = await supabase
        .from('chat_threads')
        .select('id, member_id, user_id, type, source')
        .eq('id', threadId)
        .maybeSingle();
      return data as ThreadRow | null;
    },
    enabled: !!threadId,
    staleTime: 60_000,
  });

  // Find member context (name/role) and feedbacks for the selected member
  const member = useMemo(() => {
    if (!thread?.member_id) return null;
    return members.find((m) => m.id === thread.member_id) ?? null;
  }, [thread?.member_id, members]);

  const { data: memberFeedbacks = [], isLoading: feedbacksLoading } = useQuery({
    queryKey: ['mentor-thread-feedbacks', thread?.member_id],
    queryFn: async () => {
      if (!thread?.member_id) return [];
      const { data } = await supabase
        .from('feedbacks')
        .select('id, title, content, occurred_at, created_at, tags')
        .eq('member_id', thread.member_id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!thread?.member_id,
    staleTime: 60_000,
  });

  // Clear state.initialPrompt/initialAttachment from history so refresh doesn't re-send
  useEffect(() => {
    if (initialPrompt || initialAttachment) {
      window.history.replaceState({}, '', location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!threadId) {
    navigate('/lider/mentor', { replace: true });
    return null;
  }

  // CRITICAL: wait for thread metadata AND (when the thread has a member)
  // for members/feedbacks queries to settle. Otherwise the MentorChat may
  // mount with memberId=undefined + feedbacks=[] and autoSendInitialPrompt
  // will send mode='leader_self' to chat-mentor, producing a generic
  // "sem citações / não conheço o perfil" answer for the wrong reasons.
  const hasMember = !!thread?.member_id;
  const waitingForMemberContext = hasMember && (membersLoading || feedbacksLoading);

  if (threadLoading || waitingForMemberContext) {
    return (
      <div className="flex items-center justify-center h-[calc(100svh-3rem)] bg-background">
        <div className="h-7 w-7 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  // Thread aponta para um liderado que não está no escopo do líder atual
  // (arquivado, migrado de time, sem permissão). Em vez de cair silenciosamente
  // em coach mode, avisa explicitamente.
  if (hasMember && !member) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100svh-3rem)] bg-background gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground max-w-md">
          Não encontrei esse liderado no seu escopo atual. Talvez ele tenha sido arquivado ou movido de time.
        </p>
        <button
          onClick={() => navigate('/lider/mentor')}
          className="text-sm text-primary hover:underline"
        >
          Voltar para o Pergunte à Rhitmo
        </button>
      </div>
    );
  }

  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Você';

  // Sem liderado selecionado → modo "Coaching Pessoal" do líder.
  // Passamos memberName=userName apenas para satisfazer a prop required do componente,
  // mas o backend recebe mode='leader_self' e ignora esse campo.
  const isCoachMode = !member?.id;

  return (
    <MentorChat
      open={true}
      onOpenChange={() => {}}
      embedded
      autoSendInitialPrompt={!!initialPrompt}
      initialPrompt={initialPrompt}
      initialThreadId={threadId}
      userType="leader"
      memberName={member?.name || userName}
      memberId={member?.id}
      memberRole={isCoachMode ? 'Coaching pessoal' : (member?.role || undefined)}
      feedbacks={memberFeedbacks}
      userId={effectiveUserId ?? undefined}
      onBack={() => navigate('/lider/mentor')}
      readOnly={thread?.source === 'slack'}
    />
  );
}

