// Sprint 13.2 — /lider/mentor: launchpad dedicado para o "Pergunte ao Mentor".
// Inspirado no Ask Windy (Windmill): composer único no topo, sugestões abaixo
// e histórico de conversas recentes. Permite ao líder escolher o liderado
// (ou ficar em "chat geral") e o escopo de contexto antes de iniciar.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sparkles, ArrowUp, MessageSquare, ChevronDown, Users, Layers, History, X, Pin, Pencil, Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useLeaderMembers, type LeaderMemberRow } from '@/hooks/useLeaderMembers';
// (Button removed — composer uses native button now)
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MemberAvatar } from '@/components/MemberAvatar';
// MentorChat modal removed — full-page chat now lives at /lider/mentor/:threadId
import { Badge } from '@/components/ui/badge';
import { MentorContextPanel } from '@/components/mentor/MentorContextPanel';
import { cn } from '@/lib/utils';
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

type ContextScope = 'geral' | 'tudo' | 'notas';

interface ThreadRow {
  id: string;
  title: string;
  type: string;
  updated_at: string;
  member_id: string | null;
  is_pinned?: boolean;
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
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'coach' | 'member'>('coach');
  const [selectedMember, setSelectedMember] = useState<LeaderMemberRow | null>(null);
  const [scope, setScope] = useState<ContextScope>('geral');
  const [input, setInput] = useState('');
  // (modal state removed — chat now lives at /lider/mentor/:threadId)
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingThread, setDeletingThread] = useState<ThreadRow | null>(null);

  // ── Recent threads ───────────────────────────────────────────────
  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ['mentor-page-threads', effectiveUserId],
    queryFn: async (): Promise<ThreadRow[]> => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from('chat_threads')
        .select('id, title, type, updated_at, member_id, is_pinned')
        .eq('user_id', effectiveUserId)
        .in('type', ['mentor', 'general_chat', 'brief'])
        .order('is_pinned' as any, { ascending: false })
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

  const refreshThreads = () => queryClient.invalidateQueries({ queryKey: ['mentor-page-threads', effectiveUserId] });

  const handleRenameThread = async (threadId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) { setEditingThreadId(null); setEditingTitle(''); return; }
    const { error } = await supabase.from('chat_threads').update({ title: trimmed }).eq('id', threadId);
    if (!error) await refreshThreads();
    setEditingThreadId(null);
    setEditingTitle('');
  };

  const handleTogglePinThread = async (thread: ThreadRow) => {
    const { error } = await supabase
      .from('chat_threads')
      .update({ is_pinned: !thread.is_pinned } as any)
      .eq('id', thread.id);
    if (!error) await refreshThreads();
  };

  const handleDeleteThread = async (thread: ThreadRow) => {
    await supabase.from('mentor_messages').delete().eq('thread_id', thread.id);
    const { error } = await supabase.from('chat_threads').delete().eq('id', thread.id);
    if (!error) await refreshThreads();
    setDeletingThread(null);
  };

  const scopeLabels: Record<ContextScope, string> = {
    geral: 'Chat geral',
    tudo: 'Tudo do liderado',
    notas: 'Apenas notas/diário',
  };

  // (chatMemberId/chatFeedbacks moved to /lider/mentor/:threadId)
  void memberFeedbacks;

  return (
    <div className="flex h-[calc(100svh-3rem)] overflow-hidden bg-background">
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-2xl px-6 lg:px-8 py-8">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="mb-6">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Pergunte à Rhitmo
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-serif">
            Olá, {userName.split(' ')[0]} — o que você quer entender hoje?
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground max-w-2xl leading-relaxed">
            Sua copiloto de liderança. Reflita sobre você ou analise um liderado com contexto completo.
          </p>

          {/* Mode toggle: Coach vs Member */}
          <div className="mt-5 inline-flex items-center gap-1 rounded-2xl bg-muted/50 p-1 border border-border/40">
            <button
              type="button"
              onClick={() => {
                setMode('coach');
                setSelectedMember(null);
                setScope('geral');
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-medium transition-all',
                mode === 'coach'
                  ? 'bg-background text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Conversar comigo (coach)
            </button>
            <button
              type="button"
              onClick={() => setMode('member')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-medium transition-all',
                mode === 'member'
                  ? 'bg-background text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Analisar um liderado
            </button>
          </div>
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
        <section className="mt-6">
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
        <section className="mt-8">
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
                  <li key={t.id} className="group flex items-center gap-2 px-4 py-3 hover:bg-muted/40 transition-colors">
                    <button
                      type="button"
                      onClick={() => {
                        if (m) { setSelectedMember(m); setScope('tudo'); }
                        else { setSelectedMember(null); setScope('geral'); }
                        goToThread(t.id);
                      }}
                      className="flex-1 min-w-0 flex items-center gap-3 text-left"
                    >
                      {t.is_pinned ? <Pin className="h-4 w-4 text-primary fill-primary shrink-0" /> : <MessageSquare className="h-4 w-4 text-muted-foreground/70 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        {editingThreadId === t.id ? (
                          <Input
                            value={editingTitle}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameThread(t.id, editingTitle);
                              if (e.key === 'Escape') { setEditingThreadId(null); setEditingTitle(''); }
                            }}
                            onBlur={() => handleRenameThread(t.id, editingTitle)}
                            autoFocus
                            className="h-8 text-sm rounded-xl"
                          />
                        ) : (
                          <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                        )}
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
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                      <button type="button" onClick={() => handleTogglePinThread(t)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted" aria-label={t.is_pinned ? 'Desafixar conversa' : 'Fixar conversa'}><Pin className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => { setEditingThreadId(t.id); setEditingTitle(t.title); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted" aria-label="Renomear conversa"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => setDeletingThread(t)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" aria-label="Excluir conversa"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        </div>
      </main>

      <aside className="hidden lg:block w-[340px] shrink-0 border-l border-border/40 bg-muted/30 overflow-y-auto">
        <div className="px-5 py-8">
          <MentorContextPanel
            selectedMember={selectedMember}
            scope={scope}
            onPickMember={() => setMemberPickerOpen(true)}
          />
        </div>
      </aside>

      <AlertDialog open={!!deletingThread} onOpenChange={() => setDeletingThread(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a conversa "{deletingThread?.title}" e todo o histórico dela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingThread && handleDeleteThread(deletingThread)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
