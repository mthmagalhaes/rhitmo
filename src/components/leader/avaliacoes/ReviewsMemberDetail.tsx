// Sprint 20 — Detalhe nativo do liderado em /lider/avaliacoes/:memberId.
// Substitui o antigo ReviewsMemberSheet (overlay lateral) por conteúdo full-width
// no shell master-detail. Formal em primeiro plano; Mensal fica em accordion.
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfMonth, subMonths } from 'date-fns';
import { Music, ChevronDown, ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RhitmoTimelineCard } from '@/components/recaps/RhitmoTimelineCard';
import { MonthlyRecapSection } from '@/components/recaps/MonthlyRecapSection';
import { PerformanceReviewList } from '@/components/PerformanceReviewList';
import { FormalReviewHero } from './FormalReviewHero';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/supabaseSafe';
import { cn } from '@/lib/utils';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';

interface Props {
  member: LeaderMemberRow;
  onCreateFormal: () => void;
  onClose?: () => void;
}

export function ReviewsMemberDetail({ member, onCreateFormal, onClose }: Props) {
  const [monthlyOpen, setMonthlyOpen] = useState(false);

  const { lastMonthStart, thisMonthStart } = useMemo(() => {
    const tStart = startOfMonth(new Date());
    return {
      lastMonthStart: subMonths(tStart, 1).toISOString(),
      thisMonthStart: tStart.toISOString(),
    };
  }, []);

  const { data: feedbacksLastMonthCount = 0 } = useQuery({
    queryKey: ['feedback-count-last-month', member.id, lastMonthStart],
    enabled: !!member.id,
    queryFn: async () => {
      const { count } = await supabase
        .from('feedbacks')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', member.id)
        .gte('occurred_at', lastMonthStart)
        .lt('occurred_at', thisMonthStart);
      return count ?? 0;
    },
  });

  // Puxa contexto formal + count de mensais confirmados para o hero.
  const { data: lastFormal } = useQuery({
    queryKey: ['last-formal-review', member.id],
    enabled: !!member.id,
    queryFn: async () => {
      const q = supabase
        .from('performance_reviews')
        .select('id, title, created_at')
        .eq('member_id', member.id)
        .eq('review_type', 'manager')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      // safeQuery not needed for maybeSingle — fetch direct
      const { data } = await q;
      return data as { id: string; title: string | null; created_at: string } | null;
    },
  });

  const { data: monthlyConfirmedCount = 0 } = useQuery({
    queryKey: ['monthly-confirmed-count', member.id],
    enabled: !!member.id,
    queryFn: async () => {
      const { count } = await supabase
        .from('monthly_recaps')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', member.id)
        .eq('status', 'confirmed');
      return count ?? 0;
    },
  });

  // Esc to close
  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8 space-y-6">
      {/* Back nav + breadcrumb — sempre visível */}
      {onClose && (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para avaliações
          </Button>
          <nav className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={onClose}
              className="hover:text-foreground transition-colors"
            >
              Avaliações
            </button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {member.name}
            </span>
          </nav>
        </div>
      )}

      {/* Header sutil — nome do liderado */}
      <header className="flex items-center gap-3 min-w-0">
        <MemberAvatar
          memberId={member.id}
          memberName={member.name}
          avatarUrl={member.avatar}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl font-bold tracking-tight truncate">
            {member.name}
          </h1>
          {member.role && (
            <p className="text-sm text-muted-foreground truncate">{member.role}</p>
          )}
        </div>
      </header>

      {/* Hero Formal */}
      <FormalReviewHero
        memberName={member.name}
        lastFormalAt={lastFormal?.created_at ?? null}
        lastFormalTitle={lastFormal?.title}
        monthlyConfirmedCount={monthlyConfirmedCount}
        onCreateFormal={onCreateFormal}
      />

      {/* Lista Formal — expandida por padrão */}
      <section>
        <PerformanceReviewList
          memberId={member.id}
          memberName={member.name}
          onCreateReview={onCreateFormal}
        />
      </section>

      {/* Contexto Mensal — accordion sutil abaixo */}
      <Collapsible open={monthlyOpen} onOpenChange={setMonthlyOpen}>
        <div className="rounded-2xl border bg-muted/20">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                'w-full flex items-center gap-3 px-5 py-4 text-left',
                'hover:bg-muted/40 transition-colors rounded-2xl',
              )}
            >
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Music className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Acompanhamento Mensal</p>
                <p className="text-xs text-muted-foreground">
                  {monthlyConfirmedCount === 0
                    ? 'Nenhum Mensal confirmado ainda — alimenta a próxima Formal.'
                    : `${monthlyConfirmedCount} Mensal(is) confirmado(s) · alimenta a próxima Formal.`}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform',
                  monthlyOpen && 'rotate-180',
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-5 pb-5 pt-1 space-y-4">
              <RhitmoTimelineCard
                memberId={member.id}
                feedbacksLastMonthCount={feedbacksLastMonthCount}
                onJumpToRhitmo={() => setMonthlyOpen(true)}
              />
              <MonthlyRecapSection memberId={member.id} />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
