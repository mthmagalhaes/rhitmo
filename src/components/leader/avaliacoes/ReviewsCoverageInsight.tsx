// Card de insight no topo de /lider/avaliacoes: quantos liderados ainda não têm
// Acompanhamento Mensal do mês atual + chips para abrir o sheet daquela pessoa.
import { Music, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/MemberAvatar';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';
import type { MemberReviewsSummary } from '@/hooks/useTeamReviewsSummary';

interface Props {
  members: LeaderMemberRow[];
  summaryByMember: Map<string, MemberReviewsSummary>;
  onPickMember: (m: LeaderMemberRow) => void;
}

export function ReviewsCoverageInsight({ members, summaryByMember, onPickMember }: Props) {
  const missing = members.filter((m) => {
    const s = summaryByMember.get(m.id);
    return s && !s.hasCurrentMonthRecap;
  });
  const total = members.length;

  if (total === 0) return null;

  return (
    <Card className="p-5 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] bg-gradient-to-r from-primary/5 to-transparent">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Music className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {missing.length === 0
              ? `Todos os ${total} liderados já têm o Acompanhamento Mensal deste mês.`
              : `${missing.length} de ${total} ${missing.length === 1 ? 'liderado está' : 'liderados estão'} sem o Acompanhamento Mensal deste mês.`}
          </p>
          {missing.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground mt-1">
                Gere o Rhitmo Mensal para manter o histórico vivo e ancorar avaliações.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {missing.slice(0, 8).map((m) => (
                  <Button
                    key={m.id}
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full text-xs gap-1.5 pl-1 pr-2.5"
                    onClick={() => onPickMember(m)}
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
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
