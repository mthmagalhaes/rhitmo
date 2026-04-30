// Sprint 10.2 — Card de entrada para iniciar uma auto-avaliação no Dashboard do liderado.
import { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SelfReviewWizard } from './SelfReviewWizard';

interface StartSelfReviewCardProps {
  memberId: string;
  memberName: string;
  authorUserId: string;
  selfReviewCount?: number;
}

export function StartSelfReviewCard({
  memberId,
  memberName,
  authorUserId,
  selfReviewCount = 0,
}: StartSelfReviewCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] bg-gradient-to-br from-primary/5 via-card to-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wider">
                Sua voz importa
              </span>
            </div>
            <h3 className="font-serif text-lg font-semibold text-foreground tracking-tight">
              Conte sua versão da história
            </h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md leading-relaxed">
              Em poucos minutos, registre suas conquistas, pontos de atenção e o que precisa do seu líder.
              Seu líder verá automaticamente no feed de Contexto.
            </p>
            {selfReviewCount > 0 && (
              <p className="text-xs text-muted-foreground/80 mt-2">
                {selfReviewCount === 1
                  ? '1 auto-avaliação enviada'
                  : `${selfReviewCount} auto-avaliações enviadas`}
              </p>
            )}
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="gap-2 rounded-xl shrink-0"
          >
            Iniciar auto-avaliação
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <SelfReviewWizard
        open={open}
        onClose={() => setOpen(false)}
        memberId={memberId}
        memberName={memberName}
        authorUserId={authorUserId}
      />
    </>
  );
}
