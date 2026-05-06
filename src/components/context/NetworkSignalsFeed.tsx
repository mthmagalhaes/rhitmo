// Sprint 14 — Network feed tab for /lider/contexto?tab=rede
// Lists all network signals chronologically with ack + filter by member.

import { useEffect, useState } from 'react';
import { Loader2, Check, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { signalToRhyText, signalAccent, signalLabel } from '@/lib/rhyVoice';
import { tryRpc } from '@/lib/supabaseSafe';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PulseSignal } from '@/hooks/useTeamPulse';

interface NetworkSignalRow extends PulseSignal {
  acknowledged_at: string | null;
}

export function NetworkSignalsFeed() {
  const { workspaceId } = useAccount();
  const [rows, setRows] = useState<NetworkSignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAcked, setShowAcked] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    let query = supabase
      .from('network_signals')
      .select('id, member_id, signal_type, severity, payload, detected_at, acknowledged_at, team_members!inner(name)')
      .order('detected_at', { ascending: false })
      .limit(100);
    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    if (!showAcked) query = query.is('acknowledged_at', null);

    const { data, error } = await query;
    if (error) {
      console.warn('[NetworkSignalsFeed] fetch failed', error);
      setRows([]);
    } else {
      const mapped: NetworkSignalRow[] = (data ?? []).map((r: any) => ({
        id: r.id,
        member_id: r.member_id,
        member_name: r.team_members?.name ?? null,
        signal_type: r.signal_type,
        severity: r.severity,
        payload: r.payload ?? {},
        detected_at: r.detected_at,
        acknowledged_at: r.acknowledged_at,
      }));
      setRows(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, showAcked]);

  const ack = async (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, acknowledged_at: new Date().toISOString() } : r)));
    await tryRpc('acknowledge_network_signal', { _signal_id: id });
    if (!showAcked) setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Sinais que o Rhy detectou no padrão de colaboração do time.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => setShowAcked((v) => !v)}
        >
          {showAcked ? 'Esconder lidos' : 'Mostrar lidos'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Tudo fluindo. O Rhy não detectou nada de diferente nas últimas semanas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((s) => (
            <Card key={s.id} className="rounded-2xl p-4 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border-border/50">
              <div className="flex items-start gap-3">
                <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${signalAccent(s.signal_type, s.severity)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant="secondary" className="rounded-md text-[10px] uppercase tracking-wide font-medium">
                      {signalLabel(s.signal_type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(s.detected_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {signalToRhyText(s)}
                  </p>
                </div>
                {!s.acknowledged_at && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => ack(s.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Lido
                  </Button>
                )}
              </div>
              <div className="mt-3 ml-5 flex items-center gap-2">
                <Link to={`/lider/1on1s?member=${s.member_id}`}>
                  <Button variant="outline" size="sm" className="h-7 rounded-lg gap-1.5 text-xs">
                    <Calendar className="h-3 w-3" />
                    Agendar 1:1
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
