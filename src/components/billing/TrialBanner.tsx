import { useNavigate } from 'react-router-dom';
import { Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBillingStatus } from '@/hooks/useBillingStatus';
import { cn } from '@/lib/utils';

/** Faixa de assinatura (teste legado ou conta nova sem plano): dias restantes e atalho para assinar. */
export function TrialBanner() {
  const { data } = useBillingStatus();
  const navigate = useNavigate();

  if (!data || data.billingModel !== 'v3') return null;
  if (data.hasSubscription || data.isGrandfathered) return null;

  const urgent = data.locked || data.daysLeft <= 3;

  return (
    <div
      className={cn(
        'mx-4 mt-3 flex flex-col gap-2 rounded-2xl px-4 py-3 text-sm shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:justify-between lg:mx-6',
        urgent ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-foreground',
      )}
    >
      <div className="flex items-center gap-2">
        {data.locked ? <Lock className="h-4 w-4 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
        <span>
          {data.locked ? (
            <>
              {data.trialEndsAt ? 'Seu teste terminou.' : 'Escolha seu plano, mensal ou anual, para começar.'}{' '}
              Criar liderado, enviar o bot, gerar avaliação e perguntar à Rhitmo pedem assinatura. Cancele quando quiser.
            </>
          ) : (
            <>
              Teste gratuito: {data.daysLeft} {data.daysLeft === 1 ? 'dia restante' : 'dias restantes'}
              , tudo liberado e sem cartão.
            </>
          )}
        </span>
      </div>
      <Button
        size="sm"
        variant={urgent ? 'destructive' : 'default'}
        className="rounded-xl"
        onClick={() => navigate('/v2/billing')}
      >
        Assinar agora
      </Button>
    </div>
  );
}
