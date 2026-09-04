// Grafo força-dirigido da rede de colaboração (ONA).
// Renderiza em SVG para permitir hover/clique acessível. O layout é calculado
// uma vez com d3-force e depois congelado — sem animação contínua.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import type { Graph, GraphNode } from '@/lib/networkMetrics';

type ColorBy = 'team' | 'report';

interface SimNode extends SimulationNodeDatum {
  id: string;
  node: GraphNode;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  weight: number;
  events: number;
}

const TEAM_TOKENS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'];

function teamColor(teamId: string | null, palette: Map<string, string>) {
  if (!teamId) return 'hsl(var(--muted-foreground))';
  return palette.get(teamId) ?? 'hsl(var(--muted-foreground))';
}

export interface NetworkGraphProps {
  graph: Graph;
  colorBy?: ColorBy;
  highlightId?: string | null;
  onSelect?: (node: GraphNode | null) => void;
  height?: number;
}

export function NetworkGraph({
  graph,
  colorBy = 'team',
  highlightId = null,
  onSelect,
  height = 460,
}: NetworkGraphProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hovered, setHovered] = useState<string | null>(null);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const palette = useMemo(() => {
    const map = new Map<string, string>();
    const teams = Array.from(
      new Set(graph.nodes.map((n) => n.teamId).filter((t): t is string => !!t)),
    );
    teams.forEach((t, i) => map.set(t, `hsl(var(${TEAM_TOKENS[i % TEAM_TOKENS.length]}))`));
    return map;
  }, [graph.nodes]);

  const maxDegree = useMemo(
    () => Math.max(1, ...graph.nodes.map((n) => n.degree)),
    [graph.nodes],
  );
  const maxWeight = useMemo(
    () => Math.max(0.0001, ...graph.links.map((l) => l.weight)),
    [graph.links],
  );

  // Layout: roda a simulação de forma síncrona e congela.
  useEffect(() => {
    if (graph.nodes.length === 0) {
      setPositions(new Map());
      return;
    }
    const nodes: SimNode[] = graph.nodes.map((n) => ({ id: n.id, node: n }));
    const links: SimLink[] = graph.links.map((l) => ({
      source: l.source,
      target: l.target,
      weight: l.weight,
      events: l.events,
    }));

    const sim = forceSimulation(nodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((l) => 40 + 60 * (1 - l.weight / maxWeight))
          .strength(0.35),
      )
      .force('charge', forceManyBody().strength(-160))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide(18))
      .stop();

    sim.tick(300);

    const map = new Map<string, { x: number; y: number }>();
    for (const n of nodes) map.set(n.id, { x: n.x ?? width / 2, y: n.y ?? height / 2 });
    setPositions(map);
  }, [graph, width, height, maxWeight]);

  const active = highlightId ?? hovered;
  const neighbors = useMemo(() => {
    if (!active) return null;
    const set = new Set<string>([active]);
    for (const nb of graph.adjacency.get(active) ?? []) set.add(nb.id);
    return set;
  }, [active, graph.adjacency]);

  return (
    <div ref={wrapperRef} className="w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Mapa de colaboração entre pessoas"
        className="select-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) onSelect?.(null);
        }}
      >
        <g>
          {graph.links.map((l, i) => {
            const a = positions.get(l.source);
            const b = positions.get(l.target);
            if (!a || !b) return null;
            const dim = neighbors ? !(neighbors.has(l.source) && neighbors.has(l.target)) : false;
            return (
              <line
                key={`${l.source}-${l.target}-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="hsl(var(--foreground))"
                strokeOpacity={dim ? 0.05 : 0.16}
                strokeWidth={0.6 + (l.weight / maxWeight) * 2.6}
                strokeLinecap="round"
              />
            );
          })}
        </g>
        <g>
          {graph.nodes.map((n) => {
            const p = positions.get(n.id);
            if (!p) return null;
            const r = 4 + Math.sqrt(n.degree / maxDegree) * 9;
            const dim = neighbors ? !neighbors.has(n.id) : false;
            const fill =
              colorBy === 'team'
                ? teamColor(n.teamId, palette)
                : n.isReport
                  ? 'hsl(var(--primary))'
                  : 'hsl(var(--muted-foreground))';
            return (
              <g
                key={n.id}
                transform={`translate(${p.x},${p.y})`}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect?.(n)}
                className="cursor-pointer"
                tabIndex={0}
                onFocus={() => setHovered(n.id)}
                onBlur={() => setHovered(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect?.(n);
                  }
                }}
                aria-label={n.name}
              >
                <circle
                  r={r}
                  fill={fill}
                  fillOpacity={dim ? 0.2 : 0.9}
                  stroke="hsl(var(--background))"
                  strokeWidth={1.5}
                />
                {(active === n.id || n.degree / maxDegree > 0.6) && (
                  <text
                    y={-r - 5}
                    textAnchor="middle"
                    className="fill-foreground text-[10px] font-medium"
                    opacity={dim ? 0.3 : 1}
                  >
                    {n.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

export function TeamLegend({ graph }: { graph: Graph }) {
  const teams = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const n of graph.nodes) {
      if (!n.teamId) continue;
      const cur = map.get(n.teamId) ?? { name: n.teamName ?? 'Time', count: 0 };
      cur.count += 1;
      map.set(n.teamId, cur);
    }
    return Array.from(map.entries());
  }, [graph.nodes]);

  if (teams.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {teams.map(([id, t], i) => (
        <li key={id} className="flex items-center gap-2 text-xs">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ background: `hsl(var(${TEAM_TOKENS[i % TEAM_TOKENS.length]}))` }}
          />
          <span className="truncate">{t.name}</span>
          <span className="text-muted-foreground ml-auto">({t.count})</span>
        </li>
      ))}
    </ul>
  );
}
