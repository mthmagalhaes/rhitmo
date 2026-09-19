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
import { useBillingStatus } from '@/hooks/useBillingStatus';
import { useLeaderBotAddon, type LeaderBotAddon } from '@/hooks/useLeaderBotAddon';
import { cn } from '@/lib/utils';

/**
 * Assinatura v3: todo assento custa R$ 10/mês (R$ 8 no anual), líder incluído.
 * O bot de reunião é um add-on do líder: R$ 29,90/mês com 6h por ciclo.
 */

function toneFor(seat: LeaderBotAddon) {
  if (seat.basis === 'grandfathered') return 'neutral' as const;
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
  const { data: billing, isLoading: billingLoading } = useBillingStatus();
  const { data: leaders, isLoading, toggle } = useLeaderBotAddon();
  const { toast } = useToast();
  const [needsSubscription, setNeedsSubscription] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [pendingLeader, setPendingLeader] = useState<string | null>(null);

  const seats = Math.max(1, billing?.seatCount ?? 1);

  const handleToggle = async (seat: LeaderBotAddon, next: boolean) => {
    setPendingLeader(seat.leaderUserId);
    try {
      await toggle.mutateAsync({
        leaderUserId: seat.leaderUserId,
        action: next ? 'activate' : 'deactivate',
      });
      setNeedsSubscription(null);
      toast({
        title: next ? 'Bot de reunião ativado' : 'Bot de reunião desativado',
        description: next
          ? `${seat.leaderName} passa a ter 6h de bot por ciclo.`
          : `${seat.leaderName} não terá mais horas de bot no próximo ciclo.`,
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
      setPendingLeader(null);
    }
  };

  const handleCheckout = async (withAddon = false) => {
    setCheckoutLoading(true);
    try {
      const { data: session, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { seatCycle: 'monthly', seats, botAddon: withAddon },
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
      {!billingLoading && billing && !billing.hasSubscription && (
        <Alert className="rounded-2xl">
          <AlertTitle>
            {billing.trialActive
              ? `Teste gratuito · ${billing.daysLeft} ${billing.daysLeft === 1 ? 'dia restante' : 'dias restantes'}`
              : 'Teste encerrado'}
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {billing.trialActive
                ? 'Tudo liberado durante o teste, sem cartão. Assine quando quiser para não perder o ritmo.'
                : 'A leitura continua liberada, mas criar liderado, enviar o bot, gerar avaliação e perguntar à Rhitmo pedem assinatura.'}
            </span>
            <Button
              size="sm"
              className="rounded-xl"
              onClick={() => handleCheckout(false)}
              disabled={checkoutLoading}
            >
              {checkoutLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Assinar {seats} {seats === 1 ? 'assento' : 'assentos'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
            <p className="mt-1 text-xs text-muted-foreground">R$ 8 por assento no plano anual.</p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              <li>Todo mundo tem assento: líder e liderados</li>
              <li>Conectores de note taker e Magic Paste</li>
              <li>Anotações &amp; Evidências com origem e data</li>
              <li>Pautas de 1:1, avaliação formal e Pergunte à Rhitmo</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-bold tracking-tight">Bot de reunião</h2>
              <Badge variant="outline" className="text-[10px]">Add-on do líder</Badge>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              R$ 29,90
              <span className="ml-1 text-sm font-normal text-muted-foreground">/líder/mês</span>
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Inclui 6h de bot por ciclo, usadas nas reuniões de qualquer liderado do time. Só o
              líder precisa do add-on. Sem ele, a reunião ainda pode ser capturada por um note taker
              conectado.
            </p>
          </CardContent>
        </Card>
      </div>

      {needsSubscription && (
        <Alert className="rounded-2xl">
          <AlertTitle>Assine os assentos primeiro</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{needsSubscription}</span>
            <Button
              size="sm"
              className="rounded-xl"
              onClick={() => handleCheckout(true)}
              disabled={checkoutLoading}
            >
              {checkoutLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Assinar com o bot
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardContent className="p-6">
          <h2 className="font-serif text-xl font-bold tracking-tight">Bot de reunião do líder</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ative para quem precisa gravar reuniões sem note taker. As horas valem para todas as
            reuniões dos liderados desse líder.
          </p>

          <div className="mt-5 space-y-3">
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando líderes…
              </div>
            )}

            {!isLoading && leaders?.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum líder com time neste workspace.</p>
            )}

            {leaders?.map((seat) => {
              const tone = toneFor(seat);
              const remaining = Math.max(seat.hoursCap - seat.hoursUsed, 0);
              return (
                <div
                  key={seat.leaderUserId}
                  className="rounded-2xl border bg-card/50 p-4 shadow-[0_2px_20px_rgba(0,0,0,0.03)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{seat.leaderName}</p>
                      <p className={cn('mt-0.5 text-xs', TONE_TEXT[tone])}>
                        {seat.basis === 'grandfathered' && <>Plano legado · sem teto de horas</>}
                        {seat.basis === 'addon' && (
                          <>Add-on ativo · {seat.hoursUsed.toFixed(1)}h de {seat.hoursCap}h neste ciclo</>
                        )}
                        {seat.basis === 'trial' && (
                          <>Teste de 14 dias · {remaining.toFixed(1)}h restantes</>
                        )}
                        {seat.basis === 'none' && (
                          <>Sem bot disponível · ative o add-on ou conecte um note taker</>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {seat.basis === 'none' && <Plug className="h-4 w-4 text-muted-foreground" />}
                      {seat.hasAddon && <Bot className="h-4 w-4 text-primary" />}
                      {pendingLeader === seat.leaderUserId ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Switch
                          checked={seat.hasAddon}
                          onCheckedChange={(next) => handleToggle(seat, next)}
                          aria-label={`Add-on de bot para ${seat.leaderName}`}
                        />
                      )}
                    </div>
                  </div>
                  {(seat.basis === 'addon' || seat.basis === 'trial') && seat.hoursCap > 0 && (
                    <Progress
                      value={seat.percent}
                      className={cn('mt-3 h-1.5 bg-muted', TONE_BAR[tone])}
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
