// Sprint 13.2 — /lider/mentor: launchpad dedicado para o "Pergunte ao Mentor".
// Inspirado no Ask Windy (Windmill): composer único no topo, sugestões abaixo
// e histórico de conversas recentes. Permite ao líder escolher o liderado
// (ou ficar em "chat geral") e o escopo de contexto antes de iniciar.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sparkles, ArrowUp, MessageSquare, ChevronDown, Users, Layers, History, X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useLeaderMembers, type LeaderMemberRow } from '@/hooks/useLeaderMembers';
import { Button } from '@/components/ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MemberAvatar } from '@/components/MemberAvatar';
import { MentorChat } from '@/components/MentorChat';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ContextScope = 'geral' | 'tudo' | 'notas';

interface ThreadRow {
  id: string;
  title: string;
  type: string;
  updated_at: string;
  member_id: string | null;
}

const SUGGESTIONS = [
  { emoji: '📋', text: 'Resumir o último mês' },
  { emoji: '🗓️', text: 'Sugerir pauta para próxima 1:1' },
  { emoji: '🔍', text: 'Quais padrões aparecem nos últimos 30 dias?' },
  { emoji: '⚠️', text: 'Quem está em risco esta semana?' },
  { emoji: '🪞', text: 'Identificar contradições no meu Mirror' },
  { emoji: '⚡', text: 'Listar ações pendentes não resolvidas' },
];

export default function LiderMentor() {
  const { user } = useAuth();
  const { id: effectiveUserId } = useEffectiveUser();
  const { members } = useLeaderMembers();
  const navigate = useNavigate();

  const [selectedMember, setSelectedMember] = useState<LeaderMemberRow | null>(null);
  const [scope, setScope] = useState<ContextScope>('geral');
  const [input, setInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);

  // ── Recent threads ───────────────────────────────────────────────
  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ['mentor-page-threads', effectiveUserId],
    queryFn: async (): Promise<ThreadRow[]> => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from('chat_threads')
        .select('id, title, type, updated_at, member_id')
        .eq('user_id', effectiveUserId)
        .in('type', ['mentor', 'general_chat', 'brief'])
        .order('updated_at', { ascending: false })
        .limit(showAllHistory ? 50 : 10);
      if (error) return [];
      return (data ?? []) as ThreadRow[];
    },
    enabled: !!effectiveUserId,
    staleTime: 30_000,
  });

  // ── Feedbacks for member context (when scope != 'geral') ────────
  const { data: memberFeedbacks = [] } = useQuery({
    queryKey: ['mentor-page-feedbacks', selectedMember?.id],
    queryFn: async () => {
      if (!selectedMember) return [];
      const { data } = await supabase
        .from('feedbacks')
        .select('id, title, content, occurred_at, created_at, tags')
        .eq('member_id', selectedMember.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!selectedMember,
    staleTime: 60_000,
  });

  const memberLookup = useMemo(() => {
    const map = new Map<string, LeaderMemberRow>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q));
  }, [members, memberQuery]);

  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Você';

  // ── Actions ──────────────────────────────────────────────────────
  const goToThread = (threadId: string, prompt?: string) => {
    navigate(`/lider/mentor/${threadId}`, {
      state: prompt ? { initialPrompt: prompt } : undefined,
    });
  };

  const startNewChat = async (prompt: string) => {
    if (!effectiveUserId || !prompt.trim()) return;
    const titleText = prompt.slice(0, 40) + (prompt.length > 40 ? '…' : '');
    // For "geral" scope (no member context) we still create a member-less thread.
    const memberId = selectedMember && scope !== 'geral' ? selectedMember.id : null;
    const insertData: any = {
      user_id: effectiveUserId,
      title: titleText,
      type: 'mentor',
      member_id: memberId,
    };
    const { data, error } = await supabase
      .from('chat_threads')
      .insert(insertData)
      .select('id')
      .single();
    if (error || !data) {
      console.error('Erro ao criar thread', error);
      return;
    }
    goToThread(data.id, prompt);
  };

  const handleSubmit = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    startNewChat(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestion = (text: string) => {
    startNewChat(text);
  };


  const handleClearMember = () => {
    setSelectedMember(null);
    setScope('geral');
  };

  const scopeLabels: Record<ContextScope, string> = {
    geral: 'Chat geral',
    tudo: 'Tudo do liderado',
    notas: 'Apenas notas/diário',
  };

  // ── Resolve memberId/feedbacks for the modal based on scope ──────
  const chatMemberId = selectedMember?.id;
  const chatFeedbacks =
    selectedMember && scope !== 'geral' ? memberFeedbacks : [];

  return (
    <div className="min-h-[calc(100svh-3rem)] bg-background overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-10">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="mb-8">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Pergunte à Rhitmo
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-serif">
            Olá, {userName.split(' ')[0]} — o que você quer entender hoje?
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground max-w-2xl leading-relaxed">
            Sua copiloto de liderança. Pergunte algo geral ou escolha um liderado para conversar com contexto.
          </p>
        </header>

        {/* ── Composer ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] focus-within:border-primary/50 focus-within:shadow-[0_0_0_2px_hsl(var(--primary)/0.1)] transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedMember
                ? `Pergunte sobre ${selectedMember.name.split(' ')[0]}…`
                : 'Pergunte qualquer coisa sobre liderança, seu time ou o que você precisa…'
            }
            rows={2}
            className="w-full bg-transparent border-0 outline-none text-[15px] text-foreground placeholder:text-muted-foreground resize-none min-h-[64px] max-h-[200px] px-5 pt-4 pb-2 focus:ring-0"
          />

          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border/40 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Liderado picker */}
              <Popover open={memberPickerOpen} onOpenChange={setMemberPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                      selectedMember
                        ? 'bg-primary/10 text-primary hover:bg-primary/15'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                    )}
                  >
                    {selectedMember ? (
                      <MemberAvatar
                        memberId={selectedMember.id}
                        memberName={selectedMember.name}
                        avatarUrl={selectedMember.avatar}
                        size="sm"
                      />
                    ) : (
                      <Users className="h-3.5 w-3.5" />
                    )}
                    <span className="font-medium">
                      {selectedMember ? selectedMember.name : 'Liderado'}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-0">
                  <div className="p-2 border-b border-border">
                    <Input
                      placeholder="Buscar liderado…"
                      value={memberQuery}
                      onChange={(e) => setMemberQuery(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <ScrollArea className="max-h-72">
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          handleClearMember();
                          setMemberPickerOpen(false);
                        }}
                        className={cn(
                          'w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-muted',
                          !selectedMember && 'bg-muted',
                        )}
                      >
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Chat geral</p>
                          <p className="text-[11px] text-muted-foreground">
                            Sem contexto de liderado
                          </p>
                        </div>
                      </button>
                      {filteredMembers.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedMember(m);
                            setScope('tudo');
                            setMemberPickerOpen(false);
                          }}
                          className={cn(
                            'w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-muted',
                            selectedMember?.id === m.id && 'bg-muted',
                          )}
                        >
                          <MemberAvatar
                            memberId={m.id}
                            memberName={m.name}
                            avatarUrl={m.avatar}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{m.name}</p>
                            {m.role && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {m.role}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                      {filteredMembers.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Nenhum liderado encontrado.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Scope picker (only when a member is selected) */}
              {selectedMember && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span className="font-medium">{scopeLabels[scope]}</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-56 p-1">
                    {(['tudo', 'notas', 'geral'] as ContextScope[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setScope(s)}
                        className={cn(
                          'w-full text-left px-2 py-2 rounded-lg text-sm hover:bg-muted',
                          scope === s && 'bg-muted font-medium',
                        )}
                      >
                        <p>{scopeLabels[s]}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s === 'tudo' && 'RAG completo: notas, 1:1s, pulse, PDI.'}
                          {s === 'notas' && 'Apenas anotações do diário.'}
                          {s === 'geral' && 'Sem contexto específico do liderado.'}
                        </p>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}

              {selectedMember && (
                <button
                  type="button"
                  onClick={handleClearMember}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Limpar liderado"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="h-9 w-9 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              aria-label="Enviar"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Suggestions ────────────────────────────────────────── */}
        <section className="mt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Sugestões
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestion(s.text)}
                className="px-3 py-2 text-sm rounded-full border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors text-foreground"
              >
                <span className="mr-1.5">{s.emoji}</span>
                {s.text}
              </button>
            ))}
          </div>
        </section>

        {/* ── Recent chats ───────────────────────────────────────── */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Conversas recentes
            </p>
            {threads.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllHistory((v) => !v)}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <History className="h-3 w-3" />
                {showAllHistory ? 'Ver menos' : 'Ver tudo'}
              </button>
            )}
          </div>

          {threadsLoading ? (
            <p className="text-sm text-muted-foreground py-4">Carregando…</p>
          ) : threads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <MessageSquare className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                Nenhuma conversa ainda. Faça uma pergunta acima para começar.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60 rounded-2xl border border-border bg-card overflow-hidden">
              {threads.map((t) => {
                const m = t.member_id ? memberLookup.get(t.member_id) ?? null : null;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (m) {
                          setSelectedMember(m);
                          setScope('tudo');
                        } else {
                          setSelectedMember(null);
                          setScope('geral');
                        }
                        startChat(undefined, t.id);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors text-left"
                    >
                      <MessageSquare className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {t.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {m ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 rounded-full">
                              {m.name.split(' ')[0]}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 rounded-full">
                              Geral
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(t.updated_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ── MentorChat modal ──────────────────────────────────────── */}
      <MentorChat
        open={chatOpen}
        onOpenChange={(o) => {
          setChatOpen(o);
          if (!o) {
            setInitialPrompt(undefined);
            setActiveThreadId(null);
          }
        }}
        userType="leader"
        memberName={selectedMember?.name || userName}
        memberId={chatMemberId}
        memberRole={selectedMember?.role}
        feedbacks={chatFeedbacks}
        userId={effectiveUserId ?? undefined}
        initialPrompt={initialPrompt}
        initialThreadId={activeThreadId}
      />
    </div>
  );
}
