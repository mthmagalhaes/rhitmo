// Mapa de colaboração da empresa inteira (ONA) — visão de RH.
// Restrito a HR Admin, Owner e Super Admin pela própria consulta no banco.
import { useMemo, useState } from 'react';
import { Network } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspaceNetwork, type NetworkWindow } from '@/hooks/useTeamNetwork';
import { NetworkExplorer } from '@/components/network/NetworkExplorer';

export default function HRRede() {
  const [windowDays, setWindowDays] = useState<NetworkWindow>(30);
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const { data: edges = [], isLoading } = useWorkspaceNetwork(windowDays);

  const teams = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of edges) {
      if (e.a_team_id) map.set(e.a_team_id, e.a_team_name ?? 'Time');
      if (e.b_team_id) map.set(e.b_team_id, e.b_team_name ?? 'Time');
    }
    return Array.from(map.entries());
  }, [edges]);

  const filtered = useMemo(() => {
    if (teamFilter === 'all') return edges;
    return edges.filter((e) => e.a_team_id === teamFilter || e.b_team_id === teamFilter);
  }, [edges, teamFilter]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Rede da empresa
          </h1>
          {teams.length > 1 && (
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-52 rounded-xl h-9 text-xs">
                <SelectValue placeholder="Todos os times" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os times</SelectItem>
                {teams.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Como o trabalho realmente flui, além do organograma. Cada ponto é uma pessoa e cada linha
          é uma relação de trabalho observada. Nenhum conteúdo de conversa é exposto.
        </p>
      </header>

      <NetworkExplorer
        edges={filtered}
        isLoading={isLoading}
        windowDays={windowDays}
        onWindowChange={(w) => setWindowDays(w as NetworkWindow)}
        colorBy="team"
        advanced
        emptyHint="A rede é montada com as conversas do Slack que a Rhitmo acompanha. Assim que houver colaboração registrada, o mapa aparece aqui."
      />
    </div>
  );
}
