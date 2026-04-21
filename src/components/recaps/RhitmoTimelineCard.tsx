import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, ArrowDown, Music, CheckCircle2 } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMonthlyRecaps, useQuarterlyRecaps, useGenerateMonthlyRecap } from '@/hooks/useRecaps';

interface Props {
  memberId: string;
  feedbacksLastMonthCount: number;
  onJumpToRhitmo: () => void;
}

/**
 * Empty-state / transition card for users who already have feedbacks but no recaps yet.
 * Shows up before the tabs in MemberDetails to bridge the gap toward the Rhitmo ritual.
 */
export function RhitmoTimelineCard({ memberId, feedbacksLastMonthCount, onJumpToRhitmo }: Props) {
  const { data: monthly = [], isLoading: mLoading } = useMonthlyRecaps(memberId, 6);
  const { data: quarterly = [], isLoading: qLoading } = useQuarterlyRecaps(memberId, 4);
  const generate = useGenerateMonthlyRecap(memberId);

  const lastMonth = useMemo(() => {
    const d = subMonths(startOfMonth(new Date()), 1);
    return format(d, 'yyyy-MM-01');
  }, []);
  const lastMonthLabel = useMemo(() => {
    const d = subMonths(startOfMonth(new Date()), 1);
    return format(d, "MMMM 'de' yyyy", { locale: ptBR });
  }, []);

  if (mLoading || qLoading) return null;

  const totalRecaps = monthly.length + quarterly.length;
  const confirmedCount =
    monthly.filter((m) => m.status === 'confirmed').length +
    quarterly.filter((q) => q.status === 'confirmed').length;
  const hasLastMonthRecap = monthly.some((m) => m.period_month.slice(0, 10) === lastMonth);

  // State A — has recaps already → collapsed pointer
  if (totalRecaps > 0) {
    return (
      <Card className="p-4 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] mb-6 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Music className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                Rhitmo desta pessoa
                {confirmedCount > 0 && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {confirmedCount} confirmado{confirmedCount === 1 ? '' : 's'}
                  </Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {monthly.length} mensa{monthly.length === 1 ? 'l' : 'is'} • {quarterly.length} trimestra{quarterly.length === 1 ? 'l' : 'is'} no histórico
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={onJumpToRhitmo}>
            Ver linha do tempo Rhitmo
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>
    );
  }

  // State B — has enough evidence to generate the first monthly
  if (feedbacksLastMonthCount >= 3 && !hasLastMonthRecap) {
    return (
      <Card className="p-5 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] mb-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-11 w-11 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Music className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-[240px]">
            <p className="font-semibold text-foreground">
              Você tem {feedbacksLastMonthCount} notas de {lastMonthLabel} sem resumo.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Gere o primeiro Rhitmo Mensal — a IA condensa o mês em 3 pontos. Você confirma em ~3 minutos. É o que vai alimentar suas próximas reviews.
            </p>
          </div>
          <Button
            size="sm"
            className="rounded-xl gap-2"
            onClick={() => generate.mutate({ periodMonth: lastMonth })}
            disabled={generate.isPending}
          >
            {generate.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Gerar Rhitmo Mensal
          </Button>
        </div>
      </Card>
    );
  }

  // State C — too few evidences yet → soft prompt
  return (
    <Card className="p-4 rounded-2xl border border-dashed border-border bg-muted/20 mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
          <Music className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-[240px]">
          <p className="text-sm font-medium text-foreground">Rhitmo ainda não tem ritmo</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registre ao menos 3 notas em um mês para destravar seu primeiro Rhitmo Mensal — ele vira a base das próximas reviews.
          </p>
        </div>
      </div>
    </Card>
  );
}
