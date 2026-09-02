import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBotHoursUsage } from '@/hooks/useBotHoursUsage';

/**
 * Assinatura v2: plano base por assento (sem bot) + captura como add-on.
 * A ligação com o Stripe entra na fase seguinte.
 */
export default function V2Billing() {
  const { data: usage, isLoading } = useBotHoursUsage();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-bold tracking-tight">Plano base</h2>
              <Badge variant="secondary" className="text-[10px]">Por assento</Badge>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              R$ 29,90
              <span className="ml-1 text-sm font-normal text-muted-foreground">/assento/mês</span>
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              <li>Conectores de note taker e Magic Paste</li>
              <li>Anotações &amp; Evidências com origem e data</li>
              <li>Pautas de 1:1, avaliação formal e Mentor</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-bold tracking-tight">Captura</h2>
              <Badge variant="outline" className="text-[10px]">Add-on</Badge>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              R$ 39
              <span className="ml-1 text-sm font-normal text-muted-foreground">/5h de bot/mês</span>
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Para reuniões em que ninguém está gravando. Ativável por assento, cancelável a
              qualquer momento.
            </p>
            {!isLoading && usage && (
              <p className="mt-3 text-xs text-muted-foreground">
                Uso atual: {usage.hoursUsed.toFixed(1)}h de {usage.hoursCap}h disponíveis.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
