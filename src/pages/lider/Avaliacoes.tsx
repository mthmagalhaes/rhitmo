// Sprint 12.6 — Avaliações vira página terminal: ao selecionar liderado,
// líder vê timeline + barra para gerar Mensal / Trimestral / Avaliação Formal
// inline. Sem redirect para /member/:id, sem modal de "escolha o tipo".
import { useState, useMemo } from 'react';
import { startOfMonth, subMonths } from 'date-fns';
import { ClipboardCheck, Music, BarChart3, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MemberAvatar } from '@/components/MemberAvatar';
import { MemberMasterList } from '@/components/leader/MemberMasterList';
import { EmptyMemberDetail } from '@/components/leader/EmptyMemberDetail';
import { RhitmoTimelineCard } from '@/components/recaps/RhitmoTimelineCard';
import { MonthlyRecapSection } from '@/components/recaps/MonthlyRecapSection';
import { QuarterlyRecapSection } from '@/components/recaps/QuarterlyRecapSection';
import { PerformanceReviewList } from '@/components/PerformanceReviewList';
import { CreateFormalReviewDialog } from '@/components/review/CreateFormalReviewDialog';
import { useLeaderMembers } from '@/hooks/useLeaderMembers';
import { supabase } from '@/integrations/supabase/client';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';

type SubTab = 'monthly' | 'quarterly' | 'formal';

export default function LiderAvaliacoes() {
  const { workspace } = useLeaderMembers();
  const [selected, setSelected] = useState<LeaderMemberRow | null>(null);
  const [activeSub, setActiveSub] = useState<SubTab>('monthly');
  const [formalDialogOpen, setFormalDialogOpen] = useState(false);

  const { lastMonthStart, thisMonthStart } = useMemo(() => {
    const tStart = startOfMonth(new Date());
    return {
      lastMonthStart: subMonths(tStart, 1).toISOString(),
      thisMonthStart: tStart.toISOString(),
    };
  }, []);

  // Conta evidências do mês passado para alimentar o RhitmoTimelineCard
  const { data: feedbacksLastMonthCount = 0 } = useQuery({
    queryKey: ['feedback-count-last-month', selected?.id, lastMonthStart],
    enabled: !!selected?.id,
    queryFn: async () => {
      if (!selected?.id) return 0;
      const { count } = await supabase
        .from('feedbacks')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', selected.id)
        .gte('occurred_at', lastMonthStart)
        .lt('occurred_at', thisMonthStart);
      return count ?? 0;
    },
  });

  const handleSelectMember = (m: LeaderMemberRow) => {
    setSelected(m);
    setActiveSub('monthly');
  };

  return (
    <div data-tour="reviews-list" className="flex h-[calc(100svh-3.5rem)] lg:h-[calc(100svh-3rem)] overflow-hidden">
      <MemberMasterList
        selectedMemberId={selected?.id ?? null}
        onSelect={handleSelectMember}
      />

      <main className="flex-1 min-w-0 overflow-y-auto bg-background">
        <div className="lg:hidden px-4 sm:px-6 pt-4" />

        {!selected ? (
          <div className="max-w-5xl px-6 lg:px-8 py-6">
            <header className="mb-2">
              <h1 className="font-serif text-2xl font-bold tracking-tight">
                Rhitmo
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione um liderado para ver o Rhitmo dele e gerar avaliações Mensal, Trimestral ou Formal.
              </p>
            </header>
            <EmptyMemberDetail
              icon={ClipboardCheck}
              title="Selecione um liderado"
              description="Escolha alguém à esquerda para ver a linha do tempo do Rhitmo e gerar avaliações com base nas evidências."
            />
          </div>
        ) : (
          <div className="max-w-5xl px-6 lg:px-8 py-6 space-y-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Rhitmo
            </p>

            <header className="flex items-center gap-3 -mt-3">
              <MemberAvatar
                memberId={selected.id}
                memberName={selected.name}
                avatarUrl={selected.avatar}
                size="lg"
              />
              <div>
                <h1 className="font-serif text-2xl font-bold tracking-tight">
                  {selected.name}
                </h1>
                {selected.role && (
                  <p className="text-sm text-muted-foreground">
                    {selected.role}
                  </p>
                )}
              </div>
            </header>

            {/* Linha do tempo Rhitmo (estado A/B/C, já existe) */}
            <RhitmoTimelineCard
              memberId={selected.id}
              feedbacksLastMonthCount={feedbacksLastMonthCount}
              onJumpToRhitmo={() => setActiveSub('monthly')}
            />

            {/* Sub-tabs com conteúdo histórico de cada tipo */}
            <Tabs
              value={activeSub}
              onValueChange={(v) => setActiveSub(v as SubTab)}
              className="w-full"
            >
              <TabsList className="grid w-full max-w-md grid-cols-3 rounded-xl">
                <TabsTrigger value="monthly" className="rounded-lg gap-1.5 text-xs">
                  <Music className="h-3.5 w-3.5" />
                  Mensal
                </TabsTrigger>
                <TabsTrigger value="quarterly" className="rounded-lg gap-1.5 text-xs">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Trimestral
                </TabsTrigger>
                <TabsTrigger value="formal" className="rounded-lg gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  Formal
                </TabsTrigger>
              </TabsList>

              <TabsContent value="monthly" className="mt-6">
                <MonthlyRecapSection memberId={selected.id} />
              </TabsContent>

              <TabsContent value="quarterly" className="mt-6">
                <QuarterlyRecapSection memberId={selected.id} />
              </TabsContent>

              <TabsContent value="formal" className="mt-6">
                <PerformanceReviewList
                  memberId={selected.id}
                  memberName={selected.name}
                  onCreateReview={() => setFormalDialogOpen(true)}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {selected && workspace?.id && (
        <CreateFormalReviewDialog
          open={formalDialogOpen}
          onOpenChange={setFormalDialogOpen}
          member={{
            id: selected.id,
            name: selected.name,
            role: selected.role ?? '',
          }}
          workspaceId={workspace.id}
          onReviewCreated={() => {
            setFormalDialogOpen(false);
            setActiveSub('formal');
          }}
        />
      )}
    </div>
  );
}
