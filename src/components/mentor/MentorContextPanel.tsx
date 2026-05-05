// Sprint 13.5 — Painel direito do /lider/mentor.
// Ocupa o espaço vazio à direita do launchpad com conteúdo útil:
// 1) Contexto ativo (liderado + escopo + mini-stats)
// 2) Como obter o melhor (dicas educacionais)
// 3) Atalhos de teclado
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Sparkles, Users, Lightbulb, Target, Lock, Keyboard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Badge } from '@/components/ui/badge';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';

type ContextScope = 'geral' | 'tudo' | 'notas';

interface Props {
  selectedMember: LeaderMemberRow | null;
  scope: ContextScope;
  onPickMember: () => void;
}

const scopeLabels: Record<ContextScope, string> = {
  geral: 'Sem contexto',
  tudo: 'Tudo do liderado',
  notas: 'Apenas notas',
};

export function MentorContextPanel({ selectedMember, scope, onPickMember }: Props) {
  const { data: stats } = useQuery({
    queryKey: ['mentor-context-stats', selectedMember?.id],
    queryFn: async () => {
      if (!selectedMember) return null;
      const [{ count }, lastFb] = await Promise.all([
        supabase
          .from('feedbacks')
          .select('id', { count: 'exact', head: true })
          .eq('member_id', selectedMember.id),
        supabase
          .from('feedbacks')
          .select('created_at')
          .eq('member_id', selectedMember.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        notesCount: count ?? 0,
        lastActivity: lastFb.data?.created_at as string | undefined,
      };
    },
    enabled: !!selectedMember,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-4">
      {/* ── Card 1: Contexto ativo ─────────────────────────────── */}
      <section className="rounded-2xl bg-card border border-border/60 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Contexto desta conversa
        </p>

        {selectedMember ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <MemberAvatar
                memberId={selectedMember.id}
                memberName={selectedMember.name}
                avatarUrl={selectedMember.avatar}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {selectedMember.name}
                </p>
                {selectedMember.role && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {selectedMember.role}
                  </p>
                )}
              </div>
            </div>

            <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 rounded-full mb-3">
              Escopo: {scopeLabels[scope]}
            </Badge>

            <div className="space-y-1.5 pt-3 border-t border-border/40">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Notas registradas</span>
                <span className="font-medium text-foreground">{stats?.notesCount ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Última atividade</span>
                <span className="font-medium text-foreground">
                  {stats?.lastActivity
                    ? formatDistanceToNow(new Date(stats.lastActivity), {
                        addSuffix: true,
                        locale: ptBR,
                      })
                    : '—'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onPickMember}
              className="mt-3 w-full text-[12px] text-muted-foreground hover:text-foreground py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            >
              Trocar liderado
            </button>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Coaching pessoal</p>
                <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">
                  Reflexão sobre a sua liderança, sem foco em um liderado específico.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onPickMember}
              className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium text-primary hover:bg-primary/10 py-2 rounded-lg border border-primary/20 transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              Selecionar um liderado
            </button>
          </>
        )}
      </section>

      {/* ── Card 2: Como obter o melhor ────────────────────────── */}
      <section className="rounded-2xl bg-card border border-border/60 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Como obter o melhor
        </p>
        <ul className="space-y-3">
          <li className="flex gap-2.5">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[12px] text-foreground leading-snug">
              <span className="font-medium">Seja específico.</span>{' '}
              <span className="text-muted-foreground">
                "O que mudou no engajamento da Ana nas últimas 4 semanas?" rende mais que "Como está
                a Ana?".
              </span>
            </p>
          </li>
          <li className="flex gap-2.5">
            <Target className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[12px] text-foreground leading-snug">
              <span className="font-medium">Selecione um liderado</span>{' '}
              <span className="text-muted-foreground">
                para análises com contexto. Sem liderado, o foco vira a sua própria liderança.
              </span>
            </p>
          </li>
          <li className="flex gap-2.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[12px] text-foreground leading-snug">
              <span className="font-medium">Tudo é privado.</span>{' '}
              <span className="text-muted-foreground">
                Suas conversas não saem do seu workspace.
              </span>
            </p>
          </li>
        </ul>
      </section>

      {/* ── Card 3: Atalhos ────────────────────────────────────── */}
      <section className="rounded-2xl bg-card border border-border/60 p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Keyboard className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Atalhos
          </p>
        </div>
        <ul className="space-y-2 text-[12px]">
          <li className="flex items-center justify-between">
            <span className="text-muted-foreground">Enviar</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-foreground border border-border/60">
              ↵
            </kbd>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted-foreground">Quebra de linha</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-foreground border border-border/60">
              ⇧ ↵
            </kbd>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted-foreground">Busca global</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-foreground border border-border/60">
              ⌘ K
            </kbd>
          </li>
        </ul>
      </section>
    </div>
  );
}
