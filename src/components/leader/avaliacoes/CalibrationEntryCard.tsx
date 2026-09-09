// Rhitmo 2.0 — Bloco Calibrações: ponte de Avaliações para a grade de calibração.
// Mostra o ciclo aberto e quantas pessoas já têm decisão registrada.
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Scale, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCalibrationSessions, useCalibrationGrid } from '@/hooks/useCalibration';

interface Props {
  workspaceId?: string | null;
}

export function CalibrationEntryCard({ workspaceId }: Props) {
  const { sessions } = useCalibrationSessions(workspaceId ?? null);

  const openSession = useMemo(
    () => (sessions.data ?? []).find((s) => s.status === 'draft') ?? null,
    [sessions.data],
  );

  const { data: rows = [] } = useCalibrationGrid(openSession);
  const confirmed = rows.filter((r) => r.decision_confirmed_at).length;

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Scale className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Calibração
            </p>
            <h2 className="font-serif text-lg font-semibold tracking-tight mt-0.5">
              Comparar o time antes de fechar as notas
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
              {openSession
                ? `Ciclo ${openSession.cycle_label} em aberto — ${confirmed} de ${rows.length} pessoas com decisão registrada.`
                : 'Nenhum ciclo aberto. Abra a calibração para ver todo o time lado a lado e evitar distorção entre pessoas.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {openSession && (
            <Badge variant="outline" className="rounded-xl font-normal">
              {openSession.cycle_label}
            </Badge>
          )}
          <Button asChild size="sm" variant="outline" className="rounded-xl">
            <Link to="/lider/calibracao">
              {openSession ? 'Abrir grade' : 'Abrir calibração'}
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
