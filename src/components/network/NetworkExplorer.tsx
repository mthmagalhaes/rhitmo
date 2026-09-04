// Explorador de rede reutilizado pela aba Rede do líder e pela visão de RH.
// Junta: grafo + busca + resumo + legenda + pessoas-chave + painel de detalhe.
import { useMemo, useState } from 'react';
import { Loader2, Network, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  buildGraph,
  betweennessRank,
  crossTeamRank,
  degreeRank,
  eigenvectorRank,
  peripheral,
  summarize,
  type GraphNode,
  type RawEdge,
} from '@/lib/networkMetrics';
import { NetworkGraph, TeamLegend } from './NetworkGraph';
import { NetworkSummary } from './NetworkSummary';
import { KeyPeopleCards, type KeyPeopleBlock } from './KeyPeopleCards';

export type NetworkWindowDays = 30 | 60 | 90;

interface Props {
  edges: RawEdge[];
  isLoading?: boolean;
  windowDays: NetworkWindowDays;
  onWindowChange: (w: NetworkWindowDays) => void;
  colorBy?: 'team' | 'report';
  /** Métricas extras (influência e periferia) — usadas na visão de RH. */
  advanced?: boolean;
  focusId?: string | null;
  emptyHint?: string;
}

const WINDOWS: NetworkWindowDays[] = [30, 60, 90];

export function NetworkExplorer({
  edges,
  isLoading,
  windowDays,
  onWindowChange,
  colorBy = 'team',
  advanced = false,
  focusId = null,
  emptyHint,
}: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GraphNode | null>(null);

  const graph = useMemo(() => buildGraph(edges), [edges]);
  const summary = useMemo(() => summarize(graph), [graph]);

  const searchMatch = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.trim().toLowerCase();
    return graph.nodes.find((n) => n.name.toLowerCase().includes(q)) ?? null;
  }, [query, graph.nodes]);

  const highlightId = selected?.id ?? searchMatch?.id ?? focusId ?? null;

  const blocks: KeyPeopleBlock[] = useMemo(() => {
    if (graph.nodes.length === 0) return [];
    const base: KeyPeopleBlock[] = [
      {
        key: 'most-connected',
        title: 'Mais conectadas',
        help: 'Pessoas com mais relações de trabalho ativas na janela escolhida.',
        people: degreeRank(graph, 5),
        format: (p) => `${p.value} conexões`,
      },
      {
        key: 'brokers',
        title: 'Conectores críticos',
        help: 'Estão no caminho entre grupos que, sem elas, deixariam de se falar. Se essa pessoa sai, duas partes da empresa perdem contato.',
        people: betweennessRank(graph, 5),
      },
      {
        key: 'cross-team',
        title: 'Pontes entre times',
        help: 'Quem mais colabora com pessoas de outros times.',
        people: crossTeamRank(graph, 5),
        format: (p) => `${p.value} fora do time`,
      },
    ];
    if (!advanced) return base;
    return [
      ...base,
      {
        key: 'influence',
        title: 'Influência',
        help: 'Quem está conectado a pessoas que também são muito conectadas. É o mesmo raciocínio do PageRank, aplicado a gente.',
        people: eigenvectorRank(graph, 5),
      },
      {
        key: 'periphery',
        title: 'Na periferia',
        help: 'Conectadas a pouquíssima gente. Nem sempre é problema, mas vale olhar.',
        people: peripheral(graph, 5),
        format: (p) => `${p.value} conexões`,
      },
    ];
  }, [graph, advanced]);

  const detailPartners = useMemo(() => {
    if (!highlightId) return [];
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    return (graph.adjacency.get(highlightId) ?? [])
      .map((nb) => {
        const link = graph.links.find(
          (l) =>
            (l.source === highlightId && l.target === nb.id) ||
            (l.target === highlightId && l.source === nb.id),
        );
        return {
          id: nb.id,
          name: byId.get(nb.id)?.name ?? 'Pessoa',
          weight: nb.weight,
          events: link?.events ?? 0,
          lastAt: link?.lastAt ?? null,
        };
      })
      .sort((a, b) => b.weight - a.weight);
  }, [highlightId, graph]);

  const highlightNode = highlightId ? graph.nodes.find((n) => n.id === highlightId) : null;
  const maxPartnerWeight = Math.max(0.0001, ...detailPartners.map((p) => p.weight));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (graph.nodes.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="py-14 text-center space-y-2">
          <Network className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">Ainda sem rede nesta janela</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {emptyHint ??
              'A rede é montada com as conversas do Slack que a Rhitmo acompanha. Assim que houver conversas com mais de uma pessoa, elas aparecem aqui.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <Card className="rounded-3xl border-none shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden">
          <CardHeader className="pb-2 flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base font-semibold tracking-tight">Mapa da rede</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                  }}
                  placeholder="Buscar pessoa..."
                  className="h-8 w-44 rounded-xl pl-8 text-xs"
                />
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
                {WINDOWS.map((w) => (
                  <Button
                    key={w}
                    size="sm"
                    variant={windowDays === w ? 'default' : 'ghost'}
                    className="rounded-lg h-6 px-2.5 text-[11px]"
                    onClick={() => onWindowChange(w)}
                  >
                    {w}d
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <NetworkGraph
              graph={graph}
              colorBy={colorBy}
              highlightId={highlightId}
              onSelect={(n) => {
                setSelected(n);
                if (!n) setQuery('');
              }}
            />
            <p className="text-[11px] text-muted-foreground px-1 pb-1">
              Cada ponto é uma pessoa e cada linha é uma relação de trabalho. Nenhuma mensagem
              aparece aqui, só a intensidade da colaboração.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-2xl border-none shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <NetworkSummary data={summary} />
            </CardContent>
          </Card>

          {colorBy === 'team' && (
            <Card className="rounded-2xl border-none shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold tracking-tight">Times</CardTitle>
              </CardHeader>
              <CardContent>
                <TeamLegend graph={graph} />
              </CardContent>
            </Card>
          )}

          {highlightNode && (
            <Card className="rounded-2xl border-none shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold tracking-tight">
                  {highlightNode.name}
                </CardTitle>
                {highlightNode.teamName && (
                  <p className="text-[11px] text-muted-foreground">{highlightNode.teamName}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {detailPartners.slice(0, 8).map((p) => (
                  <div key={p.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate">{p.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{p.events}x</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{
                          width: `${Math.max(6, Math.round((p.weight / maxPartnerWeight) * 100))}%`,
                        }}
                      />
                    </div>
                    {p.lastAt && (
                      <p className="text-[10px] text-muted-foreground">
                        última em {new Date(p.lastAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                ))}
                {detailPartners.length > 8 && (
                  <p className="text-[11px] text-muted-foreground">
                    +{detailPartners.length - 8} outras pessoas
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <KeyPeopleCards
        blocks={blocks}
        onSelect={(id) => {
          const node = graph.nodes.find((n) => n.id === id) ?? null;
          setSelected(node);
          setQuery('');
        }}
      />
    </div>
  );
}
