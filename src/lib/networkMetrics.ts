// Métricas de rede (ONA) calculadas no cliente sobre as arestas já carregadas.
// Escala esperada: dezenas a poucas centenas de nós, então algoritmos O(n*m)
// (Brandes) rodam sem problema no navegador.

export interface RawEdge {
  member_a_id: string;
  member_a_name: string;
  member_b_id: string;
  member_b_name: string;
  weight_total: number | string | null;
  event_count: number | null;
  last_event_at: string | null;
  a_is_report?: boolean | null;
  b_is_report?: boolean | null;
  a_team_id?: string | null;
  a_team_name?: string | null;
  b_team_id?: string | null;
  b_team_name?: string | null;
}

export interface GraphNode {
  id: string;
  name: string;
  teamId: string | null;
  teamName: string | null;
  isReport: boolean;
  degree: number;
  strength: number;
  crossTeam: number;
}

export interface GraphLink {
  source: string;
  target: string;
  weight: number;
  events: number;
  lastAt: string | null;
}

export interface Graph {
  nodes: GraphNode[];
  links: GraphLink[];
  adjacency: Map<string, { id: string; weight: number }[]>;
}

export function buildGraph(edges: RawEdge[]): Graph {
  const nodes = new Map<string, GraphNode>();
  const links: GraphLink[] = [];
  const adjacency = new Map<string, { id: string; weight: number }[]>();

  const ensure = (
    id: string,
    name: string,
    teamId: string | null | undefined,
    teamName: string | null | undefined,
    isReport: boolean,
  ) => {
    const existing = nodes.get(id);
    if (existing) {
      if (isReport) existing.isReport = true;
      return existing;
    }
    const node: GraphNode = {
      id,
      name: name || 'Sem nome',
      teamId: teamId ?? null,
      teamName: teamName ?? null,
      isReport,
      degree: 0,
      strength: 0,
      crossTeam: 0,
    };
    nodes.set(id, node);
    adjacency.set(id, []);
    return node;
  };

  for (const e of edges) {
    if (!e.member_a_id || !e.member_b_id || e.member_a_id === e.member_b_id) continue;
    const weight = Math.max(0.0001, Number(e.weight_total ?? 0) || 0.0001);
    const a = ensure(e.member_a_id, e.member_a_name, e.a_team_id, e.a_team_name, !!e.a_is_report);
    const b = ensure(e.member_b_id, e.member_b_name, e.b_team_id, e.b_team_name, !!e.b_is_report);

    links.push({
      source: a.id,
      target: b.id,
      weight,
      events: e.event_count ?? 0,
      lastAt: e.last_event_at ?? null,
    });

    a.degree += 1;
    b.degree += 1;
    a.strength += weight;
    b.strength += weight;
    if (a.teamId && b.teamId && a.teamId !== b.teamId) {
      a.crossTeam += 1;
      b.crossTeam += 1;
    }
    adjacency.get(a.id)!.push({ id: b.id, weight });
    adjacency.get(b.id)!.push({ id: a.id, weight });
  }

  return { nodes: Array.from(nodes.values()), links, adjacency };
}

export interface RankedPerson {
  id: string;
  name: string;
  teamName: string | null;
  value: number;
  /** 0..1, para barra de intensidade */
  ratio: number;
}

function rank(
  entries: { id: string; name: string; teamName: string | null; value: number }[],
  limit: number,
): RankedPerson[] {
  const max = Math.max(...entries.map((e) => e.value), 0);
  return entries
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((e) => ({ ...e, ratio: max > 0 ? e.value / max : 0 }));
}

export function degreeRank(graph: Graph, limit = 5): RankedPerson[] {
  return rank(
    graph.nodes.map((n) => ({ id: n.id, name: n.name, teamName: n.teamName, value: n.degree })),
    limit,
  );
}

export function crossTeamRank(graph: Graph, limit = 5): RankedPerson[] {
  return rank(
    graph.nodes.map((n) => ({ id: n.id, name: n.name, teamName: n.teamName, value: n.crossTeam })),
    limit,
  );
}

/**
 * Betweenness centrality (Brandes, grafo não-direcionado e não ponderado nos
 * caminhos mínimos — o peso indica intensidade, não distância).
 * Quem tem valor alto está no caminho entre grupos que, sem essa pessoa,
 * deixariam de se falar.
 */
export function betweenness(graph: Graph): Map<string, number> {
  const scores = new Map<string, number>();
  for (const n of graph.nodes) scores.set(n.id, 0);

  for (const s of graph.nodes) {
    const stack: string[] = [];
    const preds = new Map<string, string[]>();
    const sigma = new Map<string, number>();
    const dist = new Map<string, number>();

    for (const n of graph.nodes) {
      preds.set(n.id, []);
      sigma.set(n.id, 0);
      dist.set(n.id, -1);
    }
    sigma.set(s.id, 1);
    dist.set(s.id, 0);

    const queue: string[] = [s.id];
    let head = 0;
    while (head < queue.length) {
      const v = queue[head++];
      stack.push(v);
      for (const { id: w } of graph.adjacency.get(v) ?? []) {
        if (dist.get(w)! < 0) {
          dist.set(w, dist.get(v)! + 1);
          queue.push(w);
        }
        if (dist.get(w) === dist.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          preds.get(w)!.push(v);
        }
      }
    }

    const delta = new Map<string, number>();
    for (const n of graph.nodes) delta.set(n.id, 0);
    while (stack.length) {
      const w = stack.pop()!;
      for (const v of preds.get(w)!) {
        delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
      }
      if (w !== s.id) scores.set(w, scores.get(w)! + delta.get(w)!);
    }
  }

  // grafo não-direcionado: cada par contado duas vezes
  for (const [k, v] of scores) scores.set(k, v / 2);
  return scores;
}

export function betweennessRank(graph: Graph, limit = 5): RankedPerson[] {
  const scores = betweenness(graph);
  return rank(
    graph.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      teamName: n.teamName,
      value: scores.get(n.id) ?? 0,
    })),
    limit,
  );
}

/** Eigenvector centrality por power iteration — o "PageRank" das pessoas. */
export function eigenvector(graph: Graph, iterations = 50): Map<string, number> {
  const scores = new Map<string, number>();
  const n = graph.nodes.length || 1;
  for (const node of graph.nodes) scores.set(node.id, 1 / n);

  for (let i = 0; i < iterations; i++) {
    const next = new Map<string, number>();
    let norm = 0;
    for (const node of graph.nodes) {
      let sum = 0;
      for (const nb of graph.adjacency.get(node.id) ?? []) {
        sum += (scores.get(nb.id) ?? 0) * nb.weight;
      }
      next.set(node.id, sum);
      norm += sum * sum;
    }
    norm = Math.sqrt(norm);
    if (norm === 0) break;
    for (const [k, v] of next) scores.set(k, v / norm);
  }
  return scores;
}

export function eigenvectorRank(graph: Graph, limit = 5): RankedPerson[] {
  const scores = eigenvector(graph);
  return rank(
    graph.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      teamName: n.teamName,
      value: scores.get(n.id) ?? 0,
    })),
    limit,
  );
}

/** Pessoas na periferia: menos conexões (assumindo pelo menos uma). */
export function peripheral(graph: Graph, limit = 5): RankedPerson[] {
  const sorted = graph.nodes
    .filter((n) => n.degree > 0)
    .sort((a, b) => a.degree - b.degree)
    .slice(0, limit);
  const max = Math.max(...graph.nodes.map((n) => n.degree), 1);
  return sorted.map((n) => ({
    id: n.id,
    name: n.name,
    teamName: n.teamName,
    value: n.degree,
    ratio: n.degree / max,
  }));
}

/** Quantos blocos desconectados existem na rede. */
export function componentCount(graph: Graph): number {
  const seen = new Set<string>();
  let count = 0;
  for (const node of graph.nodes) {
    if (seen.has(node.id)) continue;
    count++;
    const stack = [node.id];
    seen.add(node.id);
    while (stack.length) {
      const cur = stack.pop()!;
      for (const nb of graph.adjacency.get(cur) ?? []) {
        if (!seen.has(nb.id)) {
          seen.add(nb.id);
          stack.push(nb.id);
        }
      }
    }
  }
  return count;
}

export interface NetworkSummaryData {
  people: number;
  relationships: number;
  avgConnections: number;
  components: number;
}

export function summarize(graph: Graph): NetworkSummaryData {
  const people = graph.nodes.length;
  const relationships = graph.links.length;
  return {
    people,
    relationships,
    avgConnections: people > 0 ? Math.round(((relationships * 2) / people) * 10) / 10 : 0,
    components: componentCount(graph),
  };
}
