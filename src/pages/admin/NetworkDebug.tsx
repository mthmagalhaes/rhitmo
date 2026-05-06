import { useEffect, useMemo, useState } from 'react';
import { Loader2, Play, Network, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { safeRpc, safeFunctionInvoke } from '@/lib/supabaseSafe';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Workspace {
  id: string;
  name: string;
}

interface EdgeRow {
  member_a_id: string;
  member_a_name: string | null;
  member_b_id: string;
  member_b_name: string | null;
  weight_total: number;
  event_count: number;
  sources: string[];
  last_event_at: string | null;
}

interface Stats {
  total_edges: number;
  total_members: number;
  connected_members: number;
  isolates: number;
  super_connectors: { member_id: string; name: string | null; total_weight: number }[];
}

export default function NetworkDebug() {
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [windowDays, setWindowDays] = useState<30 | 60 | 90>(30);
  const [edges, setEdges] = useState<EdgeRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  // Load workspaces (super admin can read all via RLS escalation through policies)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('workspaces')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setWorkspaces((data ?? []) as Workspace[]);
      if (data && data.length > 0 && !workspaceId) setWorkspaceId(data[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      try {
        const [edgesRes, statsRes] = await Promise.all([
          safeRpc<EdgeRow[]>('network_debug_top_edges', {
            _workspace_id: workspaceId,
            _window_days: windowDays,
            _limit: 50,
          }),
          safeRpc<Stats>('network_debug_stats', {
            _workspace_id: workspaceId,
            _window_days: windowDays,
          }),
        ]);
        setEdges(edgesRes ?? []);
        setStats(statsRes ?? null);
      } catch (err) {
        console.error('[NetworkDebug] fetch failed', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, windowDays]);

  const triggerBuild = async () => {
    if (!workspaceId) return;
    setTriggering(true);
    try {
      const res = await safeFunctionInvoke<{ events_ingested?: number; edges_recomputed?: number }>(
        'build-team-graph',
        { workspace_id: workspaceId },
      );
      toast({
        title: 'Build concluído',
        description: `Eventos: ${res?.events_ingested ?? '?'} • Edges: ${res?.edges_recomputed ?? '?'}`,
      });
      fetchData();
    } catch (err) {
      toast({
        title: 'Falha ao rodar build',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setTriggering(false);
    }
  };

  const selectedWs = useMemo(
    () => workspaces.find((w) => w.id === workspaceId),
    [workspaces, workspaceId],
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif tracking-tight">Network Debug</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inspeção do grafo de colaboração (ONA). Visível só para super admins.
          </p>
        </div>
        <Button onClick={triggerBuild} disabled={triggering || !workspaceId} className="gap-2">
          {triggering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Rodar build agora
        </Button>
      </header>

      <div className="flex flex-wrap gap-3">
        <Select value={workspaceId} onValueChange={setWorkspaceId}>
          <SelectTrigger className="w-[280px] rounded-xl">
            <SelectValue placeholder="Selecione um workspace" />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v) as 30 | 60 | 90)}>
          <SelectTrigger className="w-[180px] rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Janela: 30 dias</SelectItem>
            <SelectItem value="60">Janela: 60 dias</SelectItem>
            <SelectItem value="90">Janela: 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Network} label="Total edges" value={stats?.total_edges ?? '—'} />
        <StatCard icon={Users} label="Membros conectados" value={`${stats?.connected_members ?? '—'} / ${stats?.total_members ?? '—'}`} />
        <StatCard icon={AlertCircle} label="Isolates" value={stats?.isolates ?? '—'} tone={stats?.isolates ? 'warn' : 'neutral'} />
        <StatCard icon={Network} label="Super-connectors" value={stats?.super_connectors?.length ?? 0} />
      </div>

      {/* Super-connectors list */}
      {stats?.super_connectors && stats.super_connectors.length > 0 && (
        <Card className="p-4 rounded-2xl">
          <h2 className="text-sm font-semibold mb-3">Top 5 super-connectors</h2>
          <div className="flex flex-wrap gap-2">
            {stats.super_connectors.map((sc) => (
              <Badge key={sc.member_id} variant="secondary" className="rounded-lg">
                {sc.name ?? sc.member_id.slice(0, 6)} · {sc.total_weight.toFixed(1)}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Edges table */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Top 50 edges por peso</h2>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membro A</TableHead>
              <TableHead>Membro B</TableHead>
              <TableHead className="text-right">Peso</TableHead>
              <TableHead className="text-right">Eventos</TableHead>
              <TableHead>Fontes</TableHead>
              <TableHead>Último evento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {edges.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  Nenhuma edge nesta janela. Rode o build pra popular.
                </TableCell>
              </TableRow>
            )}
            {edges.map((e) => (
              <TableRow key={`${e.member_a_id}-${e.member_b_id}`}>
                <TableCell className="font-medium">{e.member_a_name ?? '—'}</TableCell>
                <TableCell className="font-medium">{e.member_b_name ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{e.weight_total.toFixed(1)}</TableCell>
                <TableCell className="text-right tabular-nums">{e.event_count}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {e.sources.map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px] rounded">{s}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {e.last_event_at
                    ? formatDistanceToNow(new Date(e.last_event_at), { addSuffix: true, locale: ptBR })
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {selectedWs && (
        <p className="text-xs text-muted-foreground">
          Workspace: <code>{selectedWs.id}</code>
        </p>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: typeof Network;
  label: string;
  value: string | number;
  tone?: 'neutral' | 'warn';
}) {
  return (
    <Card className="p-4 rounded-2xl">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`text-2xl font-semibold tracking-tight ${tone === 'warn' ? 'text-amber-600' : ''}`}>
        {value}
      </div>
    </Card>
  );
}
