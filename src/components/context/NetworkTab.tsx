// Aba "Rede" de /lider/contexto — ONA passivo (Rhitmo 2.0 Bloco 2).
// Mostra com quem cada liderado colabora, derivado das threads já capturadas
// no Slack. Nenhuma mensagem é exibida: só a intensidade da colaboração e os
// sinais que merecem atenção do líder.
import { useState } from 'react';
import { Network, Loader2, AlertTriangle, Radar, TrendingDown, Users, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useTeamNetwork,
  useTeamPulse,
  useAcknowledgeSignal,
  groupEdgesByReport,
  type NetworkSignal,
  type NetworkWindow,
} from '@/hooks/useTeamNetwork';

const WINDOWS: NetworkWindow[] = [30, 60, 90];

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

function strengthBar(weight: number, max: number) {
  const pct = max > 0 ? Math.max(6, Math.round((weight / max) * 100)) : 6;
  return pct;
}

export function NetworkTab() {
  const [windowDays, setWindowDays] = useState<NetworkWindow>(30);
  const { data: edges = [], isLoading } = useTeamNetwork(windowDays);
  const { data: signals = [] } = useTeamPulse(30);
  const acknowledge = useAcknowledgeSignal();

  const grouped = groupEdgesByReport(edges);
  const maxWeight = Math.max(1, ...edges.map((e) => Number(e.weight_total ?? 0)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Quem trabalha com quem, a partir das conversas que a Rhitmo já acompanha no Slack.
          Nenhuma mensagem aparece aqui, só a intensidade da colaboração.
        </p>
        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
          {WINDOWS.map((w) => (
            <Button
              key={w}
              size="sm"
              variant={windowDays === w ? 'default' : 'ghost'}
              className="rounded-lg h-7 px-3 text-xs"
              onClick={() => setWindowDays(w)}
            >
              {w} dias
            </Button>
          ))}
        </div>
      </div>

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
                  className="flex items-start gap-3 rounded-xl bg-muted/40 px-3 py-2.5"
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
                    onClick={() => acknowledge.mutate(s.id)}
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

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-12 text-center space-y-2">
            <Network className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">Ainda sem rede nesta janela</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              A rede é montada com as conversas do Slack que a Rhitmo acompanha. Assim que houver
              conversas com mais de uma pessoa do time, elas aparecem aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {grouped.map((m) => (
            <Card
              key={m.memberId}
              className="rounded-2xl border-none shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold tracking-tight flex items-center justify-between">
                  <span>{m.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {m.partners.length} {m.partners.length === 1 ? 'conexão' : 'conexões'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {m.partners.slice(0, 6).map((p) => (
                  <TooltipProvider key={p.id} delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="space-y-1 cursor-default">
                          <div className="flex items-center justify-between text-xs">
                            <span className="truncate">{p.name}</span>
                            <span className="text-muted-foreground shrink-0 ml-2">
                              {p.events}x
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/70"
                              style={{ width: `${strengthBar(p.weight, maxWeight)}%` }}
                            />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {p.events} conversas em comum
                        {p.lastAt
                          ? ` · última em ${new Date(p.lastAt).toLocaleDateString('pt-BR')}`
                          : ''}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {m.partners.length > 6 && (
                  <p className="text-[11px] text-muted-foreground pt-1">
                    +{m.partners.length - 6} outras pessoas
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
