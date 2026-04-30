/**
 * Onda 4.1 — Painel de observabilidade unificada
 *
 * Lista logs recentes de Edge Functions com filtros por função, nível
 * e busca por request_id. Restrita a super_admin via RLS na tabela.
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/supabaseSafe';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, AlertTriangle, Activity, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FunctionLog {
  id: string;
  request_id: string;
  function_name: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  event: string;
  duration_ms: number | null;
  user_id: string | null;
  workspace_id: string | null;
  metadata: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
}

const LEVEL_STYLES: Record<string, string> = {
  debug: 'bg-muted text-muted-foreground',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  warn: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

export const AdminObservability = () => {
  const [logs, setLogs] = useState<FunctionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [functionFilter, setFunctionFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from('function_logs' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (functionFilter !== 'all') query = query.eq('function_name', functionFilter);
    if (levelFilter !== 'all') query = query.eq('level', levelFilter);
    if (search.trim()) {
      // request_id full match or partial event/error_message
      const s = search.trim();
      if (/^[0-9a-f-]{36}$/i.test(s)) {
        query = query.eq('request_id', s);
      } else {
        query = query.or(`event.ilike.%${s}%,error_message.ilike.%${s}%`);
      }
    }

    try {
      const data = await safeQuery<FunctionLog[]>(query as any);
      setLogs(data ?? []);
    } catch (e) {
      console.error('[AdminObservability] failed to load logs', e);
      setLogs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [functionFilter, levelFilter]);

  const functionNames = useMemo(() => {
    const set = new Set(logs.map((l) => l.function_name));
    return Array.from(set).sort();
  }, [logs]);

  const stats = useMemo(() => {
    const errors = logs.filter((l) => l.level === 'error').length;
    const warns = logs.filter((l) => l.level === 'warn').length;
    const aiCalls = logs.filter((l) => l.event === 'ai_call');
    const avgLatency = aiCalls.length
      ? Math.round(aiCalls.reduce((acc, l) => acc + (l.duration_ms ?? 0), 0) / aiCalls.length)
      : 0;
    return { errors, warns, aiCalls: aiCalls.length, avgLatency };
  }, [logs]);

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Observabilidade</h1>
        <p className="text-muted-foreground mt-1">
          Logs unificados de Edge Functions. Retidos por 14 dias (info/debug) e 90 dias (warn/error).
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Erros (últimos 500)</div>
            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Avisos</div>
            <div className="text-2xl font-bold text-amber-600">{stats.warns}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Chamadas IA</div>
            <div className="text-2xl font-bold">{stats.aiCalls}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Latência IA média</div>
            <div className="text-2xl font-bold">{stats.avgLatency}ms</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-center">
          <Select value={functionFilter} onValueChange={setFunctionFilter}>
            <SelectTrigger className="w-[220px] rounded-xl">
              <SelectValue placeholder="Função" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as funções</SelectItem>
              {functionNames.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[160px] rounded-xl">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1 min-w-[260px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="request_id, event ou mensagem de erro"
              className="pl-9 rounded-xl"
            />
          </div>

          <Button onClick={load} disabled={loading} className="rounded-xl gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Logs recentes ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="divide-y">
              {logs.length === 0 && !loading && (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum log encontrado com os filtros atuais.
                </div>
              )}
              {logs.map((l) => (
                <div key={l.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <Badge className={`${LEVEL_STYLES[l.level]} font-mono text-[10px] uppercase`}>
                      {l.level}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono font-semibold">{l.function_name}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="font-medium">{l.event}</span>
                        {l.duration_ms !== null && (
                          <Badge variant="outline" className="text-xs">{l.duration_ms}ms</Badge>
                        )}
                      </div>
                      {l.error_message && (
                        <div className="mt-1 flex items-start gap-1 text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="break-all">{l.error_message}</span>
                        </div>
                      )}
                      {l.metadata && Object.keys(l.metadata).length > 0 && (
                        <pre className="mt-1 text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2 overflow-x-auto max-w-full">
                          {JSON.stringify(l.metadata, null, 0)}
                        </pre>
                      )}
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                        <span>{formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}</span>
                        <span title={l.request_id}>req: {l.request_id.slice(0, 8)}</span>
                        {l.user_id && <span title={l.user_id}>user: {l.user_id.slice(0, 8)}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
