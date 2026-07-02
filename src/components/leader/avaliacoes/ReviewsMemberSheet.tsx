/**
 * @deprecated Sprint 20 — substituído por `ReviewsMemberDetail` no layout
 * master-detail de /lider/avaliacoes/:memberId. Mantido temporariamente para
 * referência; não é mais importado em nenhum lugar.
 */
// Sheet lateral aberto ao clicar em uma linha de /lider/avaliacoes.
// Reusa RhitmoTimelineCard + MonthlyRecapSection + PerformanceReviewList.
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfMonth, subMonths } from 'date-fns';
import { Music, Sparkles } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MemberAvatar } from '@/components/MemberAvatar';
import { RhitmoTimelineCard } from '@/components/recaps/RhitmoTimelineCard';
import { MonthlyRecapSection } from '@/components/recaps/MonthlyRecapSection';
import { PerformanceReviewList } from '@/components/PerformanceReviewList';
import { supabase } from '@/integrations/supabase/client';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';

type SubTab = 'monthly' | 'formal';

interface Props {
  member: LeaderMemberRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: SubTab;
  onCreateFormal: () => void;
}

export function ReviewsMemberSheet({
  member,
  open,
  onOpenChange,
  initialTab = 'monthly',
  onCreateFormal,
}: Props) {
  const [tab, setTab] = useState<SubTab>(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab, member?.id]);

  const { lastMonthStart, thisMonthStart } = useMemo(() => {
    const tStart = startOfMonth(new Date());
    return {
      lastMonthStart: subMonths(tStart, 1).toISOString(),
      thisMonthStart: tStart.toISOString(),
    };
  }, []);

  const { data: feedbacksLastMonthCount = 0 } = useQuery({
    queryKey: ['feedback-count-last-month', member?.id, lastMonthStart],
    enabled: !!member?.id && open,
    queryFn: async () => {
      if (!member?.id) return 0;
      const { count } = await supabase
        .from('feedbacks')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', member.id)
        .gte('occurred_at', lastMonthStart)
        .lt('occurred_at', thisMonthStart);
      return count ?? 0;
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto p-0">
        {member && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b">
              <div className="flex items-center gap-3 min-w-0">
                <MemberAvatar
                  memberId={member.id}
                  memberName={member.name}
                  avatarUrl={member.avatar}
                  size="lg"
                />
                <div className="min-w-0">
                  <SheetTitle className="font-serif text-xl tracking-tight truncate text-left">
                    {member.name}
                  </SheetTitle>
                  {member.role && (
                    <p className="text-sm text-muted-foreground truncate">{member.role}</p>
                  )}
                </div>
              </div>
            </SheetHeader>

            <div className="p-6 space-y-6">
              <RhitmoTimelineCard
                memberId={member.id}
                feedbacksLastMonthCount={feedbacksLastMonthCount}
                onJumpToRhitmo={() => setTab('monthly')}
              />

              <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)} className="w-full">
                <TabsList className="grid w-full max-w-sm grid-cols-2 rounded-xl">
                  <TabsTrigger value="monthly" className="rounded-lg gap-1.5 text-xs">
                    <Music className="h-3.5 w-3.5" />
                    Acompanhamento Mensal
                  </TabsTrigger>
                  <TabsTrigger value="formal" className="rounded-lg gap-1.5 text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    Histórico Formal
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="monthly" className="mt-6">
                  <MonthlyRecapSection memberId={member.id} />
                </TabsContent>

                <TabsContent value="formal" className="mt-6">
                  <PerformanceReviewList
                    memberId={member.id}
                    memberName={member.name}
                    onCreateReview={onCreateFormal}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
