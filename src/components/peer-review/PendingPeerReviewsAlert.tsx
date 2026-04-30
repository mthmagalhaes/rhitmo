// Sprint 10.3 — Card de alerta no dashboard quando o usuário foi convidado para
// avaliar colegas. Reusa o visual do PendingPulseAlert.
import { useState } from 'react';
import { Users, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { usePendingPeerReviews, type PendingPeerReview } from '@/hooks/usePendingPeerReviews';
import { AnswerPeerReviewModal } from './AnswerPeerReviewModal';

export function PendingPeerReviewsAlert() {
  const { data: invites } = usePendingPeerReviews();
  const [active, setActive] = useState<PendingPeerReview | null>(null);

  if (!invites || invites.length === 0) return null;

  return (
    <>
      <Card className="p-5 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] bg-sky-50/60 dark:bg-sky-950/20 mb-6">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-sky-700 dark:text-sky-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {invites.length === 1
                ? 'Você tem 1 convite para avaliar um colega'
                : `Você tem ${invites.length} convites para avaliar colegas`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sua perspectiva ajuda o líder a montar um retrato 360 mais justo. Suas respostas são
              consolidadas antes de qualquer compartilhamento.
            </p>

            <div className="mt-3 space-y-2">
              {invites.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => setActive(inv)}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-sky-200/60 dark:border-sky-900/40 bg-background/80 hover:bg-background transition-colors px-3 py-2.5 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      Avaliar {inv.reviewed_member_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {inv.review_title}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-sky-700 dark:text-sky-300 font-medium flex-shrink-0">
                    Responder
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <AnswerPeerReviewModal invite={active} onClose={() => setActive(null)} />
    </>
  );
}
