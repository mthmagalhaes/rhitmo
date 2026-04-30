// Sprint 10.4 — Card de entrada para iniciar uma avaliação ascendente (upwards).
// Só renderiza quando o liderado tem um líder vinculado (teams.leader_user_id != null).
import { useState } from 'react';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLeaderInfo } from '@/hooks/useLeaderInfo';
import { UpwardsReviewWizard } from './UpwardsReviewWizard';

interface StartUpwardsReviewCardProps {
  memberId: string;
  memberName: string;
  authorUserId: string;
  upwardsReviewCount?: number;
}

export function StartUpwardsReviewCard({
  memberId,
  memberName,
  authorUserId,
  upwardsReviewCount = 0,
}: StartUpwardsReviewCardProps) {
  const [open, setOpen] = useState(false);
  const { data: leaderInfo, isLoading } = useLeaderInfo(memberId);

  // Guarda: sem líder vinculado, não exibimos o card.
  if (isLoading) return null;
  if (!leaderInfo?.leaderUserId) return null;

  return (
    <>
      <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] bg-gradient-to-br from-accent/10 via-card to-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wider">
                Avaliar meu líder
              </span>
            </div>
            <h3 className="font-serif text-lg font-semibold text-foreground tracking-tight">
              Dê feedback ascendente {leaderInfo.leaderName ? `para ${leaderInfo.leaderName}` : 'ao seu líder'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md leading-relaxed">
              Em poucos minutos, registre o que funciona, o que pode melhorar e como está a clareza dos objetivos. Seu líder verá no feed de Contexto.
            </p>
            {upwardsReviewCount > 0 && (
              <p className="text-xs text-muted-foreground/80 mt-2">
                {upwardsReviewCount === 1
                  ? '1 feedback ascendente enviado'
                  : `${upwardsReviewCount} feedbacks ascendentes enviados`}
              </p>
            )}
          </div>
          <Button
            onClick={() => setOpen(true)}
            variant="outline"
            className="gap-2 rounded-xl shrink-0"
          >
            Avaliar meu líder
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <UpwardsReviewWizard
        open={open}
        onClose={() => setOpen(false)}
        memberId={memberId}
        memberName={memberName}
        authorUserId={authorUserId}
        leaderName={leaderInfo.leaderName}
      />
    </>
  );
}
