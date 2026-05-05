// Sprint 8.3 — Página /lider/contexto: feed unificado do Context Graph.
// Reusa EvidenceDrawer (montado globalmente em App.tsx) e o evento `rhitmo:open-evidence`.
import { useEffect, useMemo, useState } from 'react';
import { Layers, Loader2, X, Sparkles } from 'lucide-react';
import { useAccount } from '@/contexts/AccountContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeamTimeline } from '@/hooks/useTeamTimeline';
import { EvidenceCard } from '@/components/context/EvidenceCard';
import {
  SourceFilterChips,
  type SourceKey,
} from '@/components/context/SourceFilterChips';
import { MemberFilterSelect } from '@/components/context/MemberFilterSelect';
import { SendPulseButton } from '@/components/pulse/SendPulseButton';

const PULSE_BANNER_KEY = 'rhitmo:contexto-pulse-banner-dismissed';

export default function LiderContexto() {
  const { workspaceId } = useAccount();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceKey[]>([]);
  const [showPulseBanner, setShowPulseBanner] = useState(false);

  // First-visit Pulse↔Contexto explainer banner (P1).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(PULSE_BANNER_KEY)) {
      setShowPulseBanner(true);
    }
  }, []);

  const dismissPulseBanner = () => {
    setShowPulseBanner(false);
    try {
      localStorage.setItem(PULSE_BANNER_KEY, '1');
    } catch {
      /* ignore quota / privacy mode */
    }
  };

  const memberIds = useMemo(() => (memberId ? [memberId] : null), [memberId]);
  const sourceTables = useMemo(() => (sources.length ? sources : null), [sources]);
  const hasFilters = !!memberId || sources.length > 0;

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTeamTimeline({
    workspaceId,
    memberIds,
    sourceTables,
    enabled: !!workspaceId,
  });

  const rows = useMemo(() => (data?.pages ?? []).flat(), [data]);

  const toggleSource = (key: SourceKey) => {
    setSources((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const clearAllFilters = () => {
    setMemberId(null);
    setSources([]);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-2">
          <Layers className="h-3.5 w-3.5" />
          Contexto
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-serif">
          Tudo o que aconteceu com sua equipe
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground max-w-2xl leading-relaxed">
          Diário, 1:1s, sinais do Slack, kudos, metas e avaliações em uma única
          linha do tempo. Clique em qualquer item para ver a evidência original.
        </p>
      </header>

      {/* Pulse↔Contexto explainer (first visit) */}
      {showPulseBanner && (
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex items-start gap-3 shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
          <div className="rounded-xl bg-primary/10 p-2 shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Pulse vive aqui dentro
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
              Toda resposta de Pulse vira evidência no seu Context Graph. Use o
              botão <strong className="font-semibold text-foreground">Enviar
              Pulse</strong> abaixo para disparar uma pergunta — as respostas
              aparecem aqui na timeline junto com tudo o que sua equipe gera.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissPulseBanner}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-muted-foreground/70 hover:bg-primary/10 hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sticky filters */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/85 backdrop-blur-md border-b border-border/40 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <MemberFilterSelect value={memberId} onChange={setMemberId} />
          <SourceFilterChips
            selected={sources}
            onToggle={toggleSource}
            onClear={() => setSources([])}
          />
          <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
            <SendPulseButton />
          </div>
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          <p className="font-medium">Não conseguimos carregar o feed agora.</p>
          <p className="mt-1 text-destructive/80">
            Tente novamente em alguns instantes.
          </p>
          {import.meta.env.DEV && error instanceof Error && (
            <pre className="mt-3 text-[11px] font-mono whitespace-pre-wrap text-destructive/70 bg-destructive/5 rounded-lg p-2 max-h-32 overflow-auto">
              {error.message}
            </pre>
          )}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-10 text-center">
          <Layers className="h-8 w-8 mx-auto text-muted-foreground/60 mb-3" />
          {hasFilters ? (
            <>
              <p className="text-sm font-medium text-foreground mb-1">
                Nenhuma evidência para os filtros selecionados
              </p>
              <p className="text-[13px] text-muted-foreground mb-4">
                Tente remover os filtros para ver tudo.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="rounded-xl"
              >
                Limpar filtros
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground mb-1">
                Seu Context Graph ainda está vazio
              </p>
              <p className="text-[13px] text-muted-foreground">
                Registre uma nota no <strong className="font-semibold text-foreground">Diário</strong>,
                envie um Pulse ou faça uma 1:1 — tudo o que sua equipe gerar
                aparece aqui automaticamente.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <EvidenceCard key={row.id} row={row} />
          ))}

          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-xl"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  'Carregar mais'
                )}
              </Button>
            </div>
          )}

          {isFetching && !isFetchingNextPage && !isLoading && (
            <p className="text-center text-[11px] text-muted-foreground/70 pt-2">
              Atualizando...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
