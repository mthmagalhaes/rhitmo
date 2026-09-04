// Camada de rede (ONA passivo) — Rhitmo 2.0 Bloco 2.
// Lê os pares de colaboração calculados diariamente a partir das threads do
// Slack (`team_network_edges`) e os sinais derivados (`network_signals`).
// Privacidade: nenhuma mensagem é exposta, só a existência e a intensidade
// da colaboração. RLS/ownership garantidos nas RPCs SECURITY DEFINER.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeRpc } from '@/lib/supabaseSafe';

export type NetworkWindow = 30 | 60 | 90;

export interface NetworkEdge {
  member_a_id: string;
  member_a_name: string;
  member_b_id: string;
  member_b_name: string;
  weight_total: number;
  event_count: number;
  last_event_at: string | null;
  a_is_report: boolean;
  b_is_report: boolean;
}

export interface NetworkSignal {
  id: string;
  member_id: string;
  member_name: string;
  signal_type: 'isolate' | 'super_connector' | 'pattern_drop' | 'pattern_spike';
  severity: 'info' | 'watch' | 'attention';
  payload: Record<string, unknown> | null;
  detected_at: string;
}

export function useTeamNetwork(windowDays: NetworkWindow = 30) {
  return useQuery({
    queryKey: ['team-network', windowDays],
    queryFn: async () => {
      const data = await safeRpc<NetworkEdge[]>('get_team_network', {
        _window_days: windowDays,
      });
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeamPulse(windowDays: NetworkWindow = 30) {
  return useQuery({
    queryKey: ['team-pulse', windowDays],
    queryFn: async () => {
      const data = await safeRpc<NetworkSignal[]>('get_team_pulse', {
        _window_days: windowDays,
      });
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAcknowledgeSignal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (signalId: string) => {
      await safeRpc('acknowledge_network_signal', { _signal_id: signalId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-pulse'] });
    },
  });
}

/** Agrupa arestas por pessoa liderada, para leitura "quem trabalha com quem". */
export function groupEdgesByReport(edges: NetworkEdge[]) {
  const map = new Map<
    string,
    { memberId: string; name: string; partners: { id: string; name: string; weight: number; events: number; lastAt: string | null }[] }
  >();

  const push = (
    id: string,
    name: string,
    partnerId: string,
    partnerName: string,
    e: NetworkEdge,
  ) => {
    const entry = map.get(id) ?? { memberId: id, name, partners: [] };
    entry.partners.push({
      id: partnerId,
      name: partnerName,
      weight: Number(e.weight_total ?? 0),
      events: e.event_count ?? 0,
      lastAt: e.last_event_at,
    });
    map.set(id, entry);
  };

  for (const e of edges) {
    if (e.a_is_report) push(e.member_a_id, e.member_a_name, e.member_b_id, e.member_b_name, e);
    if (e.b_is_report) push(e.member_b_id, e.member_b_name, e.member_a_id, e.member_a_name, e);
  }

  return Array.from(map.values())
    .map((m) => ({
      ...m,
      partners: m.partners.sort((x, y) => y.weight - x.weight),
    }))
    .sort((a, b) => b.partners.length - a.partners.length);
}
