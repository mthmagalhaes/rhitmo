// Aba "Rede" de /lider/contexto — ONA passivo (Rhitmo 2.0 Bloco 2).
// Mostra o mapa de colaboração do time, derivado das threads já capturadas no
// Slack. Nenhuma mensagem é exibida: só a existência e a intensidade da
// colaboração, mais os sinais que merecem atenção do líder.
import { useState } from 'react';
import { AlertTriangle, Radar, TrendingDown, Users, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useTeamNetwork,
  useTeamPulse,
  useAcknowledgeSignal,
  type NetworkSignal,
  type NetworkWindow,
} from '@/hooks/useTeamNetwork';
import { NetworkExplorer } from '@/components/network/NetworkExplorer';

const SIGNAL_META: Record<
  NetworkSignal['signal_type'],
  { label: string; description: string; icon: typeof Radar }
> = {
  isolate: {
    label: 'Pouca conexão',
    description: 'Colabora com bem menos pessoas do que a média do time.',
    icon: AlertTriangle,
  },
  super_connector: {
    label: 'Ponto de concentração',
    description: 'Está no meio de muito mais conversas do que o resto do time.',
    icon: Users,
  },
  pattern_drop: {
    label: 'Queda de colaboração',
    description: 'Trabalhou com bem menos gente do que costumava nos últimos meses.',
    icon: TrendingDown,
  },
  pattern_spike: {
    label: 'Salto de colaboração',
    description: 'Aumento fora do normal no número de pessoas com quem trabalha.',
    icon: Radar,
  },
};

function severityClass(sev: NetworkSignal['severity']) {
  if (sev === 'attention') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (sev === 'watch') return 'bg-sky-100 text-sky-800 border-sky-200';
  return 'bg-muted text-muted-foreground';
}

export function NetworkTab() {
  const [windowDays, setWindowDays] = useState<NetworkWindow>(30);
  const [focusId, setFocusId] = useState<string | null>(null);
  const { data: edges = [], isLoading } = useTeamNetwork(windowDays);
  const { data: signals = [] } = useTeamPulse(30);
  const acknowledge = useAcknowledgeSignal();

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground max-w-2xl">
        Quem trabalha com quem, a partir das conversas que a Rhitmo já acompanha no Slack. O mapa
        mostra apenas a intensidade da colaboração, nunca o conteúdo.
      </p>

      {signals.length > 0 && (
        <Card className="rounded-2xl border-none shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
              <Radar className="h-4 w-4 text-primary" />
              Sinais para olhar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {signals.map((s) => {
              const meta = SIGNAL_META[s.signal_type] ?? SIGNAL_META.pattern_spike;
              const Icon = meta.icon;
              return (
                <div
                  key={s.id}
                  className="flex items-start gap-3 rounded-xl bg-muted/40 px-3 py-2.5 cursor-pointer hover:bg-muted/60 transition-colors"
                  onClick={() => setFocusId(s.member_id)}
                >
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{s.member_name}</span>
                      <Badge variant="outline" className={`text-[10px] ${severityClass(s.severity)}`}>
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg h-7 px-2 text-xs"
                    disabled={acknowledge.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      acknowledge.mutate(s.id);
                    }}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Ok
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <NetworkExplorer
        edges={edges}
        isLoading={isLoading}
        windowDays={windowDays}
        onWindowChange={(w) => setWindowDays(w as NetworkWindow)}
        colorBy="team"
        focusId={focusId}
      />
    </div>
  );
}
