// Card de insight no topo de /lider/objetivos: mostra quantos liderados estão
// sem metas vigentes e dá chips clicáveis para abrir o sheet daquela pessoa.
import { Target, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/MemberAvatar';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';
import type { MemberGoalsSummary } from '@/hooks/useTeamGoalsSummary';

interface Props {
  members: LeaderMemberRow[];
  summaryByMember: Map<string, MemberGoalsSummary>;
  onPickMember: (m: LeaderMemberRow) => void;
}

export function GoalsCoverageInsight({ members, summaryByMember, onPickMember }: Props) {
  const withoutActive = members.filter((m) => (summaryByMember.get(m.id)?.active ?? 0) === 0);
  const total = members.length;
  const without = withoutActive.length;

  if (total === 0) return null;

  return (
    <Card className="p-5 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] bg-gradient-to-r from-primary/5 to-transparent">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Target className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {without === 0
              ? `Todos os ${total} liderados têm metas vigentes.`
              : `${without} de ${total} ${without === 1 ? 'liderado está' : 'liderados estão'} sem metas vigentes.`}
          </p>
          {without > 0 && (
            <>
              <p className="text-xs text-muted-foreground mt-1">
                Adicione uma meta para destravar PDI e Avaliação Formal.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {withoutActive.slice(0, 8).map((m) => (
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
                      size="xs"
                    />
                    <span>{m.name.split(' ')[0]}</span>
                    <ArrowRight className="h-3 w-3 opacity-60" />
                  </Button>
                ))}
                {withoutActive.length > 8 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{withoutActive.length - 8}
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
