// Rhitmo 2.0 — /lider/calibracao
// Pré-read + grade de calibração do time + ata do ciclo.
import { useEffect, useMemo, useState } from 'react';
import { Scale, Plus, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLeaderMembers } from '@/hooks/useLeaderMembers';
import {
  useCalibrationSessions, useCalibrationGrid, useSaveDecision,
  type CalibrationSession,
} from '@/hooks/useCalibration';
import { CalibrationGrid } from '@/components/leader/calibracao/CalibrationGrid';

export default function LiderCalibracao() {
  const { toast } = useToast();
  const { workspace } = useLeaderMembers();
  const { sessions, createSession, closeSession, updateNotes } =
    useCalibrationSessions(workspace?.id ?? null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = sessions.data ?? [];

  useEffect(() => {
    if (!selectedId && list.length > 0) setSelectedId(list[0].id);
  }, [list, selectedId]);

  const session: CalibrationSession | null = useMemo(
    () => list.find((s) => s.id === selectedId) ?? null,
    [list, selectedId],
  );

  const grid = useCalibrationGrid(session);
  const saveDecision = useSaveDecision(session);
  const [notes, setNotes] = useState('');

  useEffect(() => setNotes(session?.notes ?? ''), [session?.id, session?.notes]);

  const readOnly = session?.status === 'closed';

  const handleSave = (memberId: string, patch: Record<string, unknown>) => {
    saveDecision.mutate(
      { memberId, patch },
      {
        onError: (e: unknown) =>
          toast({
            title: 'Não deu para salvar',
            description: e instanceof Error ? e.message : String(e),
            variant: 'destructive',
          }),
      },
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 space-y-6">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 lg:p-10 shadow-[0_2px_28px_rgba(0,0,0,0.05)]">
        <div className="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <Scale className="h-4 w-4 text-primary" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
              Calibração
            </p>
          </div>
          <h1 className="font-serif text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
            O time inteiro lado a lado
          </h1>
          <p className="text-base text-muted-foreground mt-3 leading-relaxed">
            A Rhitmo sugere a partir dos trimestrais confirmados e das evidências do período.
            Você decide, registra a ata e o ciclo seguinte já começa com esse histórico.
          </p>
        </div>
      </section>

      <div className="flex items-center gap-3 flex-wrap">
        {list.length > 0 && (
          <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
            <SelectTrigger className="h-10 w-[260px] rounded-xl">
              <SelectValue placeholder="Escolher ciclo" />
            </SelectTrigger>
            <SelectContent>
              {list.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.cycle_label} {s.status === 'closed' ? '· fechada' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          variant="outline"
          className="rounded-xl"
          disabled={!workspace?.id || createSession.isPending}
          onClick={() =>
            createSession.mutate(undefined, {
              onSuccess: (s) => setSelectedId(s.id),
              onError: (e: unknown) =>
                toast({
                  title: 'Não deu para abrir a calibração',
                  description: e instanceof Error ? e.message : String(e),
                  variant: 'destructive',
                }),
            })
          }
        >
          {createSession.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Abrir calibração do ciclo
        </Button>

        {readOnly && (
          <Badge variant="outline" className="rounded-xl font-normal">
            <Lock className="h-3 w-3 mr-1" /> Ata fechada
          </Badge>
        )}
      </div>

      {sessions.isLoading && (
        <p className="text-sm text-muted-foreground">Carregando ciclos...</p>
      )}

      {!sessions.isLoading && list.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-medium">Nenhuma calibração aberta ainda</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Abra a calibração do ciclo atual para ver o time lado a lado com o que a Rhitmo
            já sabe de cada pessoa.
          </p>
        </div>
      )}

      {session && (
        <>
          {grid.isLoading ? (
            <p className="text-sm text-muted-foreground">Montando a grade...</p>
          ) : (
            <CalibrationGrid
              session={session}
              rows={grid.data ?? []}
              readOnly={readOnly}
              saving={saveDecision.isPending}
              onSave={handleSave}
            />
          )}

          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Ata do ciclo
            </p>
            <Textarea
              value={notes}
              disabled={readOnly}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="rounded-xl"
              placeholder="Combinados gerais da reunião de calibração, critérios usados, quem participou..."
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={readOnly || updateNotes.isPending}
                onClick={() =>
                  updateNotes.mutate(
                    { sessionId: session.id, notes },
                    { onSuccess: () => toast({ title: 'Ata salva' }) },
                  )
                }
              >
                Salvar ata
              </Button>
              {!readOnly && (
                <Button
                  className="rounded-xl"
                  disabled={closeSession.isPending}
                  onClick={() =>
                    closeSession.mutate(session.id, {
                      onSuccess: () => toast({ title: 'Calibração fechada' }),
                    })
                  }
                >
                  Fechar calibração
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
