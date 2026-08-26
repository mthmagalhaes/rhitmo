import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConnectorFrame } from '@/components/brand/ConnectorFrame';
import { Clock, Loader2 } from 'lucide-react';
import { useBotHoursUsage } from '@/hooks/useBotHoursUsage';
import {
  EXTRA_HOURS_PACK_BRL,
  EXTRA_HOURS_PACK_HOURS,
  RECALL_HOURS_PER_PAID_SEAT,
} from '@/hooks/usePlanLimits';

const fmt = (h: number) => `${h.toFixed(1).replace('.', ',')}h`;

export function BotHoursCard() {
  const { data, isLoading } = useBotHoursUsage();

  return (
    <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <ConnectorFrame><Clock className="w-5 h-5 text-primary" /></ConnectorFrame>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base font-serif tracking-tight">Horas de transcrição</CardTitle>
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : data?.unlimited ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Sem teto</Badge>
            ) : null}
          </div>
          <CardDescription className="text-xs mt-1">
            Consumo do bot neste mês. Uploads e notas manuais não contam.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading || !data ? (
          <div className="h-2 rounded-full bg-muted animate-pulse" />
        ) : data.unlimited ? (
          <p className="text-sm text-muted-foreground">
            {fmt(data.hoursUsed)} usadas este mês. Seu workspace está sem teto de horas.
          </p>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={
                  data.percent >= 100
                    ? 'text-sm font-semibold text-destructive'
                    : data.percent >= 80
                    ? 'text-sm font-semibold text-amber-600'
                    : 'text-sm font-semibold'
                }
              >
                {fmt(data.hoursUsed)} de {fmt(data.hoursCap)} usadas
              </span>
              <span className="text-[11px] text-muted-foreground">{Math.round(data.percent)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  data.percent >= 100 ? 'bg-destructive' : data.percent >= 80 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.max(2, data.percent)}%` }}
              />
            </div>
            {data.percent >= 100 ? (
              <p className="text-xs text-destructive">
                Limite de {fmt(data.hoursCap)} atingido. O bot não entra em novas reuniões até você adicionar
                assentos ou um pacote de horas. Uploads e notas seguem liberados.
              </p>
            ) : data.percent >= 80 ? (
              <p className="text-xs text-amber-600">
                Você já usou {Math.round(data.percent)} % da franquia. Considere um pacote de{' '}
                {EXTRA_HOURS_PACK_HOURS}h por R$ {EXTRA_HOURS_PACK_BRL.toFixed(2).replace('.', ',')}.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Cada liderado pago inclui {RECALL_HOURS_PER_PAID_SEAT}h de bot por mês.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
