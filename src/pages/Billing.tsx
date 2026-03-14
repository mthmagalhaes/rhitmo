import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Lock, CreditCard, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';

const PLANS = {
  pulse: {
    name: 'Starter',
    price: 'Grátis',
    priceDetail: 'para sempre',
    features: [
      'Até 5 membros',
      'Registro de feedbacks',
      'Notas de 1:1',
      'Timeline por membro',
    ],
    lockedFeatures: [
      'Análise de IA',
      'Performance Reviews',
      'Rhitmo Sync',
      'Analytics avançado',
    ],
  },
  pro: {
    name: 'Pro',
    price: 'R$69',
    priceDetail: '/mês por líder',
    features: [
      'Membros ilimitados',
      'Registro de feedbacks',
      'Notas de 1:1',
      'Timeline por membro',
      'Análise de IA com tags e sentimento',
      'Performance Reviews com IA',
      'Rhitmo Sync (perfil comportamental)',
      'Mentor IA por membro',
      'Importação de transcrições',
    ],
    lockedFeatures: [
      'Analytics avançado',
      'Dashboard HR',
    ],
  },
  business: {
    name: 'Business',
    price: 'R$89',
    priceDetail: '/mês por líder',
    features: [
      'Tudo do Pro',
      'Analytics avançado',
      'Dashboard HR',
      'Gestão multi-time',
      'Suporte prioritário',
      'Onboarding dedicado',
    ],
    lockedFeatures: [],
  },
};

type PlanKey = 'pulse' | 'pro' | 'business';

// --- Sub-components ---

function TrialBanner({ trialEndsAt, onManage }: { trialEndsAt: string; onManage: () => void }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  return (
    <div className="rounded-2xl border border-yellow-300/50 bg-yellow-50/80 dark:bg-yellow-900/20 dark:border-yellow-700/50 p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 dark:text-yellow-200">
        <AlertTriangle className="h-4 w-4" />
        Trial ativo — {daysLeft} {daysLeft === 1 ? 'dia restante' : 'dias restantes'}
      </div>
      <Button size="sm" variant="outline" className="rounded-xl" onClick={onManage}>
        Adicionar cartão
      </Button>
    </div>
  );
}

function PastDueBanner({ onManage }: { onManage: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <AlertTriangle className="h-4 w-4" />
        Pagamento pendente. Atualize seu cartão para continuar.
      </div>
      <Button size="sm" variant="destructive" className="rounded-xl" onClick={onManage}>
        Atualizar cartão
      </Button>
    </div>
  );
}

function formatDatePtBR(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// --- Main Component ---

const Billing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  // Success toast
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: 'Assinatura ativada! 🎉',
        description: 'Bem-vindo ao seu novo plano Rhitmo!',
      });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, toast, setSearchParams]);

  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ['workspace-billing', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, plan_tier')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['subscription', workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspace?.id,
  });

  const currentPlan = (workspace?.plan_tier as PlanKey) || 'pulse';

  const handleUpgrade = async (plan: string) => {
    setUpgradeLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast({
        title: 'Erro ao iniciar checkout',
        description: 'Tente novamente ou entre em contato: support@rhitmo.co',
        variant: 'destructive',
      });
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {},
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('No portal URL returned');
    } catch (err: any) {
      console.error('Portal error:', err);
      toast({
        title: 'Erro ao abrir portal',
        description: 'Tente novamente ou entre em contato: support@rhitmo.co',
        variant: 'destructive',
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (!user || loading || workspaceLoading || subLoading) {
    return (
      <div className="p-6 md:p-8 min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Active subscription (Pro or Business)
  if (currentPlan === 'pro' || currentPlan === 'business') {
    const plan = PLANS[currentPlan];
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6 pb-20">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Seu plano</h1>
          <p className="text-muted-foreground mt-1">Gerencie sua assinatura Rhitmo.</p>
        </div>

        {subscription?.status === 'trialing' && subscription.trial_ends_at && (
          <TrialBanner trialEndsAt={subscription.trial_ends_at} onManage={handleManageSubscription} />
        )}
        {subscription?.status === 'past_due' && (
          <PastDueBanner onManage={handleManageSubscription} />
        )}

        <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl font-bold tracking-tight">{plan.name}</CardTitle>
              <Badge className={currentPlan === 'pro'
                ? 'bg-primary text-primary-foreground'
                : 'bg-foreground text-background'
              }>
                {plan.name}
              </Badge>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">
              {subscription?.status === 'trialing' ? 'Trial' : subscription?.status === 'past_due' ? 'Pendente' : 'Ativo'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Valor</p>
                <p className="font-semibold">{plan.price}<span className="text-muted-foreground font-normal text-xs"> {plan.priceDetail}</span></p>
              </div>
              <div>
                <p className="text-muted-foreground">Próxima cobrança</p>
                <p className="font-semibold">{formatDatePtBR(subscription?.current_period_end ?? null)}</p>
              </div>
              {(subscription?.quantity ?? 0) > 1 && (
                <div>
                  <p className="text-muted-foreground">Seats</p>
                  <p className="font-semibold">{subscription?.quantity}</p>
                </div>
              )}
            </div>
            <Button onClick={handleManageSubscription} className="rounded-xl" disabled={portalLoading}>
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Gerenciar assinatura
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">O que está incluso no seu plano</h2>
          <div className="grid gap-2">
            {plan.features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleManageSubscription}
          className="text-sm text-muted-foreground hover:underline"
        >
          Cancelar assinatura
        </button>
      </div>
    );
  }

  // Pulse (free) — upgrade grid
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Seu plano</h1>
        <p className="text-muted-foreground mt-1">
          Você está no plano Starter (gratuito). Faça upgrade para desbloquear mais recursos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(Object.entries(PLANS) as [PlanKey, typeof PLANS.pulse][]).map(([key, plan]) => {
          const isCurrent = key === currentPlan;
          const isPro = key === 'pro';
          const isBusiness = key === 'business';

          return (
            <Card
              key={key}
              className={`rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border transition-all hover:-translate-y-1 ${
                isPro ? 'border-primary/40 ring-2 ring-primary/20' : ''
              }`}
            >
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold tracking-tight">{plan.name}</CardTitle>
                  {isPro && (
                    <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                      Recomendado
                    </Badge>
                  )}
                </div>
                <div>
                  <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-muted-foreground ml-1">{plan.priceDetail}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                  {plan.lockedFeatures.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {isCurrent && (
                  <Badge variant="outline" className="w-full justify-center py-2 rounded-xl">
                    Plano atual
                  </Badge>
                )}
                {isPro && (
                  <Button
                    onClick={() => handleUpgrade('pro')}
                    className="w-full rounded-xl"
                    disabled={upgradeLoading === 'pro'}
                  >
                    {upgradeLoading === 'pro' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Fazer upgrade para Pro
                  </Button>
                )}
                {isBusiness && (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    asChild
                  >
                    <a href="mailto:matheus@rhitmo.co?subject=Upgrade%20Business%20Rhitmo">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Falar com a equipe
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Billing;
