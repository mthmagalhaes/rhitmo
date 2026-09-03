import { useState } from 'react';
import { Bot, Loader2, Plug } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useV2BotSeats, type V2BotSeat } from '@/hooks/useV2BotSeats';
import { cn } from '@/lib/utils';

/**
 * Assinatura v2: assento base R$ 10/mês (sem bot) + add-on de bot
 * R$ 19,90/mês por assento, com 4h de bot inclusas.
 */

function toneFor(seat: V2BotSeat) {
  if (seat.basis === 'none' || seat.hoursCap <= 0) return 'danger' as const;
  if (seat.percent >= 100) return 'danger' as const;
  if (seat.percent >= 80) return 'warning' as const;
  return 'neutral' as const;
}

const TONE_TEXT = {
  neutral: 'text-muted-foreground',
  warning: 'text-amber-600',
  danger: 'text-destructive',
} as const;

const TONE_BAR = {
  neutral: '[&>div]:bg-primary',
  warning: '[&>div]:bg-amber-500',
  danger: '[&>div]:bg-destructive',
} as const;

export default function V2Billing() {
  const { data, isLoading, toggle } = useV2BotSeats();
  const { toast } = useToast();
  const [needsSubscription, setNeedsSubscription] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [pendingMember, setPendingMember] = useState<string | null>(null);

  const handleToggle = async (seat: V2BotSeat, next: boolean) => {
    setPendingMember(seat.memberId);
    try {
      await toggle.mutateAsync({
        memberId: seat.memberId,
        action: next ? 'activate' : 'deactivate',
      });
      setNeedsSubscription(null);
      toast({
        title: next ? 'Add-on de bot ativado' : 'Add-on de bot desativado',
        description: next
          ? `${seat.memberName} passa a ter 4h de bot por ciclo.`
          : `${seat.memberName} não terá mais horas de bot no próximo ciclo.`,
      });
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === 'no_subscription') {
        setNeedsSubscription((err as Error).message);
        return;
      }
      toast({
        title: 'Não foi possível atualizar o add-on',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setPendingMember(null);
    }
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data: session, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { seatCycle: 'monthly', seats: Math.max(1, data?.seats.length ?? 1) },
      });
      if (error) throw error;
      if (!session?.url) throw new Error('Sem URL de checkout');
      window.location.href = session.url;
    } catch (err) {
      toast({
        title: 'Erro ao iniciar checkout',
        description: (err as Error).message || 'Tente novamente ou fale com support@rhitmo.co',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-bold tracking-tight">Assento</h2>
              <Badge variant="secondary" className="text-[10px]">Plano base</Badge>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              R$ 10
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
              <h2 className="font-serif text-xl font-bold tracking-tight">Bot de reunião</h2>
              <Badge variant="outline" className="text-[10px]">Add-on</Badge>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              R$ 19,90
              <span className="ml-1 text-sm font-normal text-muted-foreground">/assento/mês</span>
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Inclui 4h de bot por ciclo. Ative só para quem precisa gravar reuniões sem note taker.
              Total combinado: R$ 29,90 por assento.
            </p>
            {!isLoading && data && (
              <p className="mt-3 text-xs text-muted-foreground">
                Trial vitalício do workspace: {data.trialHoursRemaining.toFixed(1)}h restantes de{' '}
                {data.trialHoursTotal}h.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {needsSubscription && (
        <Alert className="rounded-2xl">
          <AlertTitle>Assine o assento primeiro</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{needsSubscription}</span>
            <Button size="sm" className="rounded-xl" onClick={handleCheckout} disabled={checkoutLoading}>
              {checkoutLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Assinar assentos
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardContent className="p-6">
          <h2 className="font-serif text-xl font-bold tracking-tight">Bot por liderado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sem add-on, o liderado usa as horas do trial único do workspace. Quando o trial acaba, a
            reunião ainda pode ser capturada por um note taker conectado.
          </p>

          <div className="mt-5 space-y-3">
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando liderados…
              </div>
            )}

            {!isLoading && data?.seats.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum liderado neste workspace ainda.</p>
            )}

            {data?.seats.map((seat) => {
              const tone = toneFor(seat);
              const remaining = Math.max(seat.hoursCap - seat.hoursUsed, 0);
              return (
                <div
                  key={seat.memberId}
                  className="rounded-2xl border bg-card/50 p-4 shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{seat.memberName}</p>
                      <p className={cn('mt-0.5 text-xs', TONE_TEXT[tone])}>
                        {seat.basis === 'addon' && (
                          <>Add-on ativo · {seat.hoursUsed.toFixed(1)}h de {seat.hoursCap}h neste ciclo</>
                        )}
                        {seat.basis === 'trial' && (
                          <>Trial · {remaining.toFixed(1)}h vitalícias restantes</>
                        )}
                        {seat.basis === 'none' && (
                          <>
                            Sem bot disponível · ative o add-on ou conecte um note taker
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {seat.basis === 'none' && <Plug className="h-4 w-4 text-muted-foreground" />}
                      {seat.hasAddon && <Bot className="h-4 w-4 text-primary" />}
                      {pendingMember === seat.memberId ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Switch
                          checked={seat.hasAddon}
                          onCheckedChange={(next) => handleToggle(seat, next)}
                          aria-label={`Add-on de bot para ${seat.memberName}`}
                        />
                      )}
                    </div>
                  </div>
                  {seat.hoursCap > 0 && (
                    <Progress
                      value={seat.percent}
                      className={cn('mt-3 h-1.5', TONE_BAR[tone])}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
