// Sprint 20 — Hero editorial do Rhitmo Formal (destaque acima do Mensal).
// Vive no topo do detalhe de /lider/avaliacoes/:memberId.
import { Sparkles, Calendar, ArrowRight, FileText } from 'lucide-react';
import { format, differenceInMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  memberName: string;
  lastFormalAt: string | null;      // ISO
  lastFormalTitle?: string | null;
  monthlyConfirmedCount: number;
  onCreateFormal: () => void;
}

function suggestedNextCycle(lastFormalAt: string | null): string {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3) + 1;
  const label = `Q${q}/${d.getFullYear()}`;
  if (!lastFormalAt) return label;
  const months = differenceInMonths(new Date(), parseISO(lastFormalAt));
  if (months >= 3) return `${label} em aberto`;
  return `${label} já feito`;
}

export function FormalReviewHero({
  memberName,
  lastFormalAt,
  lastFormalTitle,
  monthlyConfirmedCount,
  onCreateFormal,
}: Props) {
  const monthsSince = lastFormalAt
    ? differenceInMonths(new Date(), parseISO(lastFormalAt))
    : null;
  const nextCycle = suggestedNextCycle(lastFormalAt);
  const isOverdue = monthsSince === null || monthsSince >= 3;

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent',
        'p-6 lg:p-7 shadow-[0_2px_28px_rgba(0,0,0,0.05)]',
      )}
    >
      <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
              Rhitmo Formal
            </p>
            {isOverdue && (
              <Badge
                variant="outline"
                className="rounded-full text-[10px] px-2 py-0 h-5 bg-amber-500/10 text-amber-700 border-amber-500/30"
              >
                {monthsSince === null ? 'sem histórico' : `há ${monthsSince} meses`}
              </Badge>
            )}
          </div>

          <h2 className="font-serif text-2xl lg:text-[26px] font-bold tracking-tight leading-tight">
            {isOverdue
              ? `Hora de fechar o ciclo com ${memberName.split(' ')[0]}`
              : `Próximo ciclo: ${nextCycle}`}
          </h2>

          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
            A avaliação formal ancora reconhecimento, calibração e próximos passos.
            Puxamos evidências dos últimos meses — você revisa, calibra e compartilha.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {monthlyConfirmedCount === 0
                ? 'Sem Mensais confirmados ainda'
                : `${monthlyConfirmedCount} Mensal(is) confirmado(s) como base`}
            </span>
            {lastFormalAt && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Última: {format(parseISO(lastFormalAt), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                {lastFormalTitle ? ` · ${lastFormalTitle}` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0">
          <Button
            size="lg"
            onClick={onCreateFormal}
            className="rounded-2xl h-12 px-6 gap-2 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)]"
          >
            <Sparkles className="h-4 w-4" />
            Novo Rhitmo Formal
            <ArrowRight className="h-4 w-4 opacity-80" />
          </Button>
        </div>
      </div>
    </section>
  );
}
