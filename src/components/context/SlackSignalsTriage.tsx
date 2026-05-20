// Sprint 18 — Triagem dos sinais pendentes do Slack dentro de /lider/contexto.
// Reusa useEvidence + EvidenceCard de /evidence, com header de bulk approve.
import { useMemo, useState } from 'react';
import { Loader2, Sparkles, Slack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEvidence, useEvidenceMutations, type SlackEvidence } from '@/hooks/useEvidence';
import { EvidenceCard } from '@/components/evidence/EvidenceCard';

export function SlackSignalsTriage() {
  const { data: evidences = [], isLoading } = useEvidence({ status: 'pending' });
  const { dismiss, convertToFeedback, approve } = useEvidenceMutations();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const highConfidenceIds = useMemo(
    () =>
      evidences
        .filter((e) => e.relevance_score >= 0.7 && e.category !== 'outro')
        .map((e) => e.id),
    [evidences],
  );

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleConvert = (ev: SlackEvidence) => convertToFeedback.mutate(ev);
  const handleDismiss = (id: string) => dismiss.mutate([id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (evidences.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center space-y-2">
        <Slack className="h-6 w-6 mx-auto text-muted-foreground/70" />
        <p className="text-sm font-medium text-foreground">Nenhum sinal pendente</p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          A Rhitmo aprova automaticamente sinais de alta confiança. O que sobra aqui são casos ambíguos pra você revisar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3">
        <div className="text-sm">
          <span className="font-semibold text-foreground">{evidences.length}</span>
          <span className="text-muted-foreground"> sinais pendentes</span>
          {highConfidenceIds.length > 0 && (
            <span className="text-muted-foreground"> · {highConfidenceIds.length} de alta confiança</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <Button
                size="sm"
                variant="default"
                className="rounded-xl"
                onClick={() => {
                  approve.mutate(Array.from(selected));
                  setSelected(new Set());
                }}
              >
                Aprovar {selected.size}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl"
                onClick={() => {
                  dismiss.mutate(Array.from(selected));
                  setSelected(new Set());
                }}
              >
                Dispensar {selected.size}
              </Button>
            </>
          )}
          {highConfidenceIds.length > 0 && selected.size === 0 && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-1.5"
              onClick={() => approve.mutate(highConfidenceIds)}
              disabled={approve.isPending}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Aprovar alta confiança
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {evidences.map((ev) => (
          <div key={ev.id} className="relative">
            <EvidenceCard
              evidence={ev}
              selected={selected.has(ev.id)}
              onSelect={toggleSelect}
              onDismiss={handleDismiss}
              onConvert={handleConvert}
              busy={approve.isPending || dismiss.isPending || convertToFeedback.isPending}
            />
            <div className="absolute top-4 right-4">
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg h-7 text-xs"
                onClick={() => approve.mutate([ev.id])}
                disabled={approve.isPending}
              >
                Aprovar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
