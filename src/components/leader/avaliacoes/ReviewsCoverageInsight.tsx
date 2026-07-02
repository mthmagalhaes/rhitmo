// Card de insight no topo de /lider/avaliacoes: quantos liderados ainda não têm
// Acompanhamento Mensal do mês atual + chips para abrir o sheet daquela pessoa
// + bulk action para gerar todos de uma vez (>=3 pendentes).
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Music, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/MemberAvatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';
import type { MemberReviewsSummary } from '@/hooks/useTeamReviewsSummary';

interface Props {
  members: LeaderMemberRow[];
  summaryByMember: Map<string, MemberReviewsSummary>;
  onPickMember: (m: LeaderMemberRow) => void;
}

export function ReviewsCoverageInsight({ members, summaryByMember, onPickMember }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bulkLoading, setBulkLoading] = useState(false);

  const missing = members.filter((m) => {
    const s = summaryByMember.get(m.id);
    return s && !s.hasCurrentMonthRecap;
  });
  const total = members.length;
  const currentMonthLabel = format(new Date(), 'MMM yyyy', { locale: ptBR });

  if (total === 0) return null;

  const handleBulkGenerate = async () => {
    if (missing.length === 0 || bulkLoading) return;
    setBulkLoading(true);
    try {
      const results = await Promise.allSettled(
        missing.map((m) =>
          supabase.functions.invoke('generate-monthly-recap', {
            body: { member_id: m.id, regenerate: false },
          }),
        ),
      );
      const ok = results.filter(
        (r) => r.status === 'fulfilled' && !(r.value as any)?.error,
      ).length;
      const fail = results.length - ok;

      queryClient.invalidateQueries({ queryKey: ['team-monthly-recaps'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-recaps'] });
      queryClient.invalidateQueries({ queryKey: ['team-performance-reviews'] });

      if (ok > 0 && fail === 0) {
        toast({
          title: `${ok} Mensais gerados`,
          description: 'Revise e confirme cada um abaixo.',
        });
      } else if (ok > 0 && fail > 0) {
        toast({
          title: `${ok} gerados, ${fail} falharam`,
          description: 'Tente novamente os que falharam individualmente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Falha ao gerar Mensais',
          description: 'Tente novamente em alguns instantes.',
          variant: 'destructive',
        });
      }
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <Card className="relative overflow-hidden p-6 rounded-3xl border shadow-[0_2px_28px_rgba(0,0,0,0.05)] bg-gradient-to-br from-primary/8 via-primary/3 to-transparent">
      <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Music className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {missing.length === 0
              ? `Todos os ${total} liderados já têm o Mensal de ${currentMonthLabel}.`
              : `${missing.length} de ${total} ${missing.length === 1 ? 'liderado está' : 'liderados estão'} sem o Mensal de ${currentMonthLabel} (mês corrente).`}
          </p>
          {missing.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground mt-1">
                Gere o Rhitmo Mensal para manter o histórico vivo e ancorar avaliações.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {missing.slice(0, 8).map((m) => (
                  <Button
                    key={m.id}
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full text-xs gap-1.5 pl-1 pr-2.5"
                    onClick={() => onPickMember(m)}
                    disabled={bulkLoading}
                  >
                    <MemberAvatar
                      memberId={m.id}
                      memberName={m.name}
                      avatarUrl={m.avatar}
                      size="sm"
                    />
                    <span>{m.name.split(' ')[0]}</span>
                    <ArrowRight className="h-3 w-3 opacity-60" />
                  </Button>
                ))}
                {missing.length > 8 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{missing.length - 8}
                  </span>
                )}

                {missing.length >= 3 && (
                  <Button
                    size="sm"
                    className="h-7 rounded-full text-xs gap-1.5 ml-auto"
                    onClick={handleBulkGenerate}
                    disabled={bulkLoading}
                  >
                    {bulkLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {bulkLoading
                      ? `Gerando ${missing.length}…`
                      : `Gerar Mensal para os ${missing.length}`}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
