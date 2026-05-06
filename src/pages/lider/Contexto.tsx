// PR6 — /lider/contexto volta ao feed cronológico bruto. O Brief executivo
// agora vive em /lider/1on1s. Aqui o líder investiga e audita evidências.
// Sprint 14: aba "Rede" lista sinais derivados do grafo (ONA).
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layers, Loader2, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAccount } from '@/contexts/AccountContext';
import { useTeamTimeline } from '@/hooks/useTeamTimeline';
import { EvidenceCard } from '@/components/context/EvidenceCard';
import { MemberFilterSelect } from '@/components/context/MemberFilterSelect';
import { SourceFilterChips, SOURCE_KEYS, type SourceKey } from '@/components/context/SourceFilterChips';
import { NetworkSignalsFeed } from '@/components/context/NetworkSignalsFeed';

export default function LiderContexto() {
  const { workspaceId } = useAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const memberParam = searchParams.get('member');
  const tabParam = searchParams.get('tab') === 'rede' ? 'rede' : 'evidencias';

  const [memberId, setMemberId] = useState<string | null>(memberParam);
  const [sources, setSources] = useState<SourceKey[]>([]);

  // Sync deep-link param → state
  useEffect(() => {
    setMemberId(memberParam);
  }, [memberParam]);

  const memberIds = useMemo(() => (memberId ? [memberId] : null), [memberId]);
  const sourceTables = useMemo(() => (sources.length ? (sources as unknown as string[]) : null), [sources]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useTeamTimeline({
    workspaceId,
    memberIds,
    sourceTables,
    enabled: !!workspaceId,
  });

  const rows = useMemo(() => (data?.pages ?? []).flat(), [data]);

  const handleMemberChange = (id: string | null) => {
    setMemberId(id);
    const next = new URLSearchParams(searchParams);
    if (id) next.set('member', id);
    else next.delete('member');
    setSearchParams(next, { replace: true });
  };

  return (
    <main className="min-h-[calc(100svh-3rem)] bg-background">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-6 space-y-6">
        <header>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-2">
            <Layers className="h-3.5 w-3.5" />
            Contexto
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-serif">
            Feed bruto do time
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground max-w-2xl leading-relaxed">
            Tudo que aconteceu — diário, 1:1s, kudos, metas, Pulse, sinais do Slack — em ordem cronológica.
            Use para investigar e auditar a evidência por trás de cada insight do Brief.
          </p>
        </header>

        <Tabs
          value={tabParam}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams);
            if (v === 'rede') next.set('tab', 'rede');
            else next.delete('tab');
            setSearchParams(next, { replace: true });
          }}
        >
          <TabsList className="rounded-xl">
            <TabsTrigger value="evidencias" className="rounded-lg gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Evidências
            </TabsTrigger>
            <TabsTrigger value="rede" className="rounded-lg gap-1.5">
              <Network className="h-3.5 w-3.5" />
              Rede
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evidencias" className="mt-5 space-y-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <MemberFilterSelect value={memberId} onChange={handleMemberChange} />
              </div>
              <SourceFilterChips
                selected={sources}
                onToggle={(k) =>
                  setSources((prev) => (prev.includes(k) ? prev.filter((s) => s !== k) : [...prev, k]))
                }
                onClear={() => setSources([])}
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma evidência encontrada para os filtros atuais.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((row) => (
                  <EvidenceCard key={row.id} row={row} />
                ))}
                {hasNextPage && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={isFetchingNextPage}
                      onClick={() => fetchNextPage()}
                    >
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          Carregando…
                        </>
                      ) : (
                        'Carregar mais'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rede" className="mt-5">
            <NetworkSignalsFeed />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
