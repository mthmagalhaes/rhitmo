import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Check, Lock, CreditCard, Loader2, AlertTriangle, Download, RotateCcw, Crown, Info, Building } from 'lucide-react';
import { Link } from 'react-router-dom';

// ============================================================================
// PRICING (atualizado em 18/04/2026)
// Removido: plano mensal e plano Business. Pro agora oferece 3 ciclos de
// faturamento (Trimestral / Semestral / Anual) com liderados ilimitados.
// Workspaces legados em "business" são apresentados como Pro automaticamente.
// ============================================================================

type BillingCycle = 'quarterly' | 'semiannual' | 'annual';
type PlanKey = 'pulse' | 'pro' | 'business';

const CYCLE_PRICING: Record<BillingCycle, { total: number; perMonth: number; periodLabel: string }> = {
  quarterly: { total: 267, perMonth: 89, periodLabel: '/trimestre' },
  semiannual: { total: 504, perMonth: 84, periodLabel: '/semestre' },
  annual: { total: 948, perMonth: 79, periodLabel: '/ano' },
};

const STRIPE_PRICE_TO_CYCLE: Record<string, BillingCycle> = {
  price_1TNNnEIF4fHxJpjHA4cMp1tm: 'quarterly',
  price_1TNNnXIF4fHxJpjH6uHkOIIJ: 'semiannual',
  price_1TNNnlIF4fHxJpjHfVwPUqAb: 'annual',
};

// Estrutura alinhada com src/pages/Landing.tsx (pulseFeatures / proFeatures / enterpriseImpact)
// para garantir que a promessa de valor mostrada na landing seja a MESMA exibida em /billing.
const PLAN_FEATURES = {
  pulse: {
    name: 'Pulse',
    features: [
      'Diário de bordo ilimitado',
      'Mentor AI — até 20 conversas por mês',
      '1 avaliação com IA por mês',
      'Notas e registros ilimitados',
      'Até 2 liderados diretos',
    ],
    lockedFeatures: [
      'Transcrição automática de reuniões (30h/mês)',
      'Pre-meeting Briefs com contexto histórico',
      'Detecção de viés em tempo real',
      'Avaliações com IA ilimitadas',
    ],
  },
  pro: {
    name: 'Pro',
    // Agrupado em "Ciclo de Performance" + "Ferramentas de Apoio" — mesma hierarquia visual da landing.
    groups: [
      {
        groupLabel: 'Ciclo de Performance',
        items: [
          'Diário de bordo + resumo mensal automático',
          'Acompanhamento trimestral guiado por IA',
          'Avaliações formais com evidências citadas',
        ],
      },
      {
        groupLabel: 'Ferramentas de Apoio',
        items: [
          'Transcrição automática de reuniões — 30h/mês',
          'Pre-meeting briefs com contexto histórico',
          'Detecção de viés em tempo real',
          'Mentor AI ilimitado',
          'Time acessa feedbacks e metas em tempo real',
          'Analytics completo · Times ilimitados',
          'Liderados ilimitados',
        ],
      },
    ],
  },
  enterprise: {
    impact:
      'Ciclo completo de performance para toda a organização — calibração entre gestores, blindagem jurídica e visibilidade do RH em tempo real.',
  },
};

interface Invoice {
  id: string;
  amount: number;
  status: string;
  created: number;
  invoice_pdf: string | null;
  period_start: number;
  period_end: number;
}

// --- Helpers ---

function formatDatePtBR(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTimestamp(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCentsBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

// --- Sub-components ---

function TrialBanner({ trialEndsAt, onUpdateCard }: { trialEndsAt: string; onUpdateCard: () => void }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  return (
    <div className="rounded-2xl border border-amber-200/60 bg-amber-50/80 dark:bg-amber-900/20 dark:border-amber-700/40 p-5 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2.5 text-sm font-medium text-amber-800 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4" />
        Trial ativo — {daysLeft} {daysLeft === 1 ? 'dia restante' : 'dias restantes'}
      </div>
      <Button size="sm" variant="outline" className="rounded-xl h-9" onClick={onUpdateCard}>
        Adicionar cartão
      </Button>
    </div>
  );
}

function PastDueBanner({ onUpdateCard }: { onUpdateCard: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2.5 text-sm font-medium text-destructive">
        <AlertTriangle className="h-4 w-4" />
        Pagamento pendente. Atualize seu cartão para continuar.
      </div>
      <Button size="sm" variant="destructive" className="rounded-xl h-9" onClick={onUpdateCard}>
        Atualizar cartão
      </Button>
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  if (status === 'paid') {
    return <Badge className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-0 text-[10px] rounded-full px-2.5 py-0.5">Pago</Badge>;
  }
  if (status === 'open') {
    return <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-0 text-[10px] rounded-full px-2.5 py-0.5">Pendente</Badge>;
  }
  return <Badge className="bg-muted text-muted-foreground border-0 text-[10px] rounded-full px-2.5 py-0.5">Cancelada</Badge>;
}

function InvoicesSection({ invoices, isLoading }: { invoices: Invoice[]; isLoading: boolean }) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold tracking-tight">Faturas</h2>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : invoices.length === 0 ? (
        <p className="text-base text-muted-foreground">Nenhuma fatura ainda.</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-4 rounded-xl border p-4 text-sm hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-muted-foreground shrink-0">{formatTimestamp(inv.created)}</span>
                <span className="font-medium text-base">{formatCentsBRL(inv.amount)}</span>
                <InvoiceStatusBadge status={inv.status} />
              </div>
              {inv.invoice_pdf && (
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl" asChild>
                  <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Billing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [upgradeLoading, setUpgradeLoading] = useState<BillingCycle | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [planChangeLoading, setPlanChangeLoading] = useState<BillingCycle | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('annual');

  useEffect(() => {
    if (!user && !loading) navigate('/auth', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({ title: 'Assinatura ativada! 🎉', description: 'Bem-vindo ao Rhitmo Pro!' });
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get('payment_updated') === 'true') {
      toast({ title: 'Cartão atualizado com sucesso!' });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, toast, setSearchParams]);

  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ['workspace-billing', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('workspaces').select('id, plan_tier, is_beta_user').maybeSingle();
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
        .in('status', ['trialing', 'active', 'past_due'])
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspace?.id,
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-invoices');
      if (error) throw error;
      return (data?.invoices ?? []) as Invoice[];
    },
    enabled: !!subscription,
  });

  // Tier semântico do workspace. 'business' (legado) é tratado como 'pro'.
  const rawTier: PlanKey = subscription ? (subscription.plan_tier as PlanKey) : 'pulse';
  const currentPlan: 'pulse' | 'pro' = rawTier === 'pulse' ? 'pulse' : 'pro';
  const isCancelScheduled = !!(subscription as any)?.cancel_at_period_end;
  const currentCycle: BillingCycle | null = subscription?.stripe_price_id
    ? STRIPE_PRICE_TO_CYCLE[subscription.stripe_price_id] ?? null
    : null;

  const handleUpgrade = async (billingCycle: BillingCycle) => {
    setUpgradeLoading(billingCycle);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan: 'pro', billingCycle },
      });
      if (error) throw error;
      if (data?.url) { window.location.href = data.url; return; }
      throw new Error('No checkout URL returned');
    } catch (err: any) {
      toast({ title: 'Erro ao iniciar checkout', description: err?.message || 'Tente novamente ou entre em contato: support@rhitmo.co', variant: 'destructive' });
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleUpdatePayment = async () => {
    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-payment-method');
      if (error) throw error;
      if (data?.url) { window.location.href = data.url; return; }
      throw new Error('No session URL');
    } catch {
      toast({ title: 'Erro ao atualizar cartão', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription');
      if (error) throw error;
      toast({
        title: 'Cancelamento agendado',
        description: `Você mantém acesso até ${formatDatePtBR(data?.cancel_at ?? subscription?.current_period_end ?? null)}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } catch {
      toast({ title: 'Erro ao cancelar', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReactivate = async () => {
    setReactivateLoading(true);
    try {
      const { error } = await supabase.functions.invoke('reactivate-subscription');
      if (error) throw error;
      toast({ title: 'Assinatura reativada!' });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } catch {
      toast({ title: 'Erro ao reativar', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setReactivateLoading(false);
    }
  };

  const handleChangeCycle = async (newCycle: BillingCycle) => {
    setPlanChangeLoading(newCycle);
    try {
      const { data, error } = await supabase.functions.invoke('update-subscription', {
        body: { newPlan: 'pro', billingCycle: newCycle },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: 'Ciclo atualizado!',
        description: 'Mudança aplicada com proratação automática.',
      });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-billing'] });
    } catch (err: any) {
      toast({ title: 'Erro ao alterar ciclo', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setPlanChangeLoading(null);
    }
  };

  if (!user || loading || workspaceLoading || subLoading) {
    return (
      <div className="p-6 md:p-8 min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ===== ASSINATURA ATIVA (Pro) =====
  if (currentPlan === 'pro') {
    const statusLabel = isCancelScheduled
      ? 'Cancelamento agendado'
      : subscription?.status === 'trialing' ? 'Trial'
      : subscription?.status === 'past_due' ? 'Pendente'
      : 'Ativo';

    const statusClass = isCancelScheduled
      ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-0'
      : subscription?.status === 'trialing'
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-0'
        : subscription?.status === 'past_due'
          ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-0'
          : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-0';

    const cyclePricing = currentCycle ? CYCLE_PRICING[currentCycle] : null;
    const cycleNameMap: Record<BillingCycle, string> = { quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual' };

    return (
      <div className="px-4 sm:px-6 lg:px-10 py-8 md:py-10 max-w-4xl mx-auto space-y-8 pb-20">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seu plano</h1>
          <p className="text-base text-muted-foreground mt-2">Gerencie sua assinatura Rhitmo Pro.</p>
        </div>

        {workspace?.is_beta_user && (
          <Alert className="mb-6 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/20 dark:border-purple-700/50">
            <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <AlertTitle className="text-lg font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
              ⭐ Early Adopter — Acesso Vitalício
            </AlertTitle>
            <AlertDescription className="text-purple-800 dark:text-purple-300">
              Obrigado por acreditar na Rhitmo desde o início! Seu acesso é ilimitado e gratuito para sempre. 🎉
            </AlertDescription>
          </Alert>
        )}

        {rawTier === 'business' && !workspace?.is_beta_user && (
          <Alert className="mb-6 border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 dark:border-amber-700/50">
            <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-lg font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              👑 Cliente Fundador — Plano Business
            </AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              Você é cliente fundador do plano Business. Mantemos todas as suas capacidades originais (HR Dashboard, onboarding assistido, liderados ilimitados) + os novos recursos do Pro, sem alteração na sua cobrança atual.
            </AlertDescription>
          </Alert>
        )}

        {subscription?.status === 'trialing' && subscription.trial_ends_at && (
          <TrialBanner trialEndsAt={subscription.trial_ends_at} onUpdateCard={handleUpdatePayment} />
        )}
        {subscription?.status === 'past_due' && <PastDueBanner onUpdateCard={handleUpdatePayment} />}

        <Card className="rounded-3xl shadow-lg border">
          <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-2xl font-bold tracking-tight">Pro</CardTitle>
              {currentCycle && (
                <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                  {cycleNameMap[currentCycle]}
                </span>
              )}
            </div>
            <Badge variant="outline" className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}>
              {statusLabel}
            </Badge>
          </CardHeader>
          <CardContent className="p-8 pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Valor</p>
                {cyclePricing ? (
                  <>
                    <p className="text-xl font-bold">R$ {cyclePricing.total}<span className="text-muted-foreground font-normal text-sm ml-1">{cyclePricing.periodLabel}</span></p>
                    <p className="text-xs text-muted-foreground">Equivale a R$ {cyclePricing.perMonth}/mês</p>
                  </>
                ) : (
                  <p className="text-xl font-bold">—</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Próxima cobrança</p>
                <p className="text-xl font-bold">{formatDatePtBR(subscription?.current_period_end ?? null)}</p>
              </div>
            </div>

            {isCancelScheduled && (
              <div className="rounded-2xl border border-amber-200/50 bg-amber-50/60 dark:bg-amber-900/10 dark:border-amber-700/30 p-4 text-sm text-amber-800 dark:text-amber-200">
                Seu acesso termina em {formatDatePtBR(subscription?.current_period_end ?? null)}. Após essa data, você voltará para o Pulse.
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap pt-2">
              <Button variant="outline" className="rounded-xl h-11" onClick={handleUpdatePayment} disabled={paymentLoading}>
                {paymentLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Trocar cartão
              </Button>
              {isCancelScheduled && (
                <Button className="rounded-xl h-11" onClick={handleReactivate} disabled={reactivateLoading}>
                  {reactivateLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                  Reativar assinatura
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cycle switcher — escondido para Business legado (já no máximo) */}
        {!isCancelScheduled && rawTier !== 'business' && (
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="p-8 pb-3">
              <CardTitle className="text-lg font-semibold tracking-tight">Trocar ciclo de faturamento</CardTitle>
              <p className="text-sm text-muted-foreground">Cobrança recorrente. Mudanças aplicam proratação automática.</p>
            </CardHeader>
            <CardContent className="p-8 pt-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['quarterly', 'semiannual', 'annual'] as BillingCycle[]).map((c) => {
                  const p = CYCLE_PRICING[c];
                  const isCurrent = c === currentCycle;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => !isCurrent && handleChangeCycle(c)}
                      disabled={isCurrent || planChangeLoading !== null}
                      className={`text-left rounded-2xl border p-4 transition-all ${isCurrent ? 'border-primary bg-primary/5 cursor-default' : 'hover:border-primary/50 hover:bg-muted/30'} ${planChangeLoading && !isCurrent ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">{cycleNameMap[c]}</span>
                        {c === 'annual' && (
                          <span className="bg-primary/15 text-primary text-[10px] font-semibold rounded-full px-2 py-0.5">
                            Melhor valor
                          </span>
                        )}
                        {isCurrent && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xl font-bold">R$ {p.total}<span className="text-xs font-normal text-muted-foreground ml-1">{p.periodLabel}</span></p>
                      <p className="text-xs text-muted-foreground mt-1">≈ R$ {p.perMonth}/mês</p>
                      {planChangeLoading === c && <Loader2 className="h-3 w-3 animate-spin mt-2" />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-5">
          <h2 className="text-xl font-semibold tracking-tight">O que está incluso no seu plano</h2>
          <div className="space-y-5">
            {PLAN_FEATURES.pro.groups.map((group, gIdx) => (
              <div key={group.groupLabel} className={gIdx > 0 ? 'pt-5 border-t border-border/40' : ''}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  {group.groupLabel}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.items.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-base">
                      <Check className="h-5 w-5 text-primary shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <InvoicesSection invoices={invoicesData ?? []} isLoading={invoicesLoading} />

        {!isCancelScheduled && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-sm text-muted-foreground hover:underline">Cancelar assinatura</button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  Seu plano Pro continuará ativo até {formatDatePtBR(subscription?.current_period_end ?? null)}. Após essa data, você voltará automaticamente para o Pulse.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl h-11">Manter assinatura</AlertDialogCancel>
                <AlertDialogAction className="rounded-xl h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleCancel} disabled={cancelLoading}>
                  {cancelLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Confirmar cancelamento
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    );
  }

  // ===== PULSE (free) → grade de upgrade =====
  const cyclePricing = CYCLE_PRICING[selectedCycle];

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 md:py-10 max-w-6xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Seu plano</h1>
        <p className="text-base text-muted-foreground mt-2">
          Você está no plano Pulse (gratuito). Faça upgrade para desbloquear todos os recursos do Rhitmo.
        </p>
      </div>

      {workspace?.is_beta_user && (
        <Alert className="mb-6 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/20 dark:border-purple-700/50">
          <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <AlertTitle className="text-lg font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
            ⭐ Early Adopter — Acesso Vitalício
          </AlertTitle>
          <AlertDescription className="text-purple-800 dark:text-purple-300">
            Obrigado por acreditar na Rhitmo desde o início! Seu acesso é ilimitado e gratuito para sempre. 🎉
          </AlertDescription>
        </Alert>
      )}

      {/* Cycle selector + tooltip */}
      <div className="flex flex-col items-center gap-3">
        <Tabs value={selectedCycle} onValueChange={(v) => setSelectedCycle(v as BillingCycle)}>
          <TabsList className="h-11 rounded-full p-1 bg-muted">
            <TabsTrigger value="quarterly" className="rounded-full px-5 h-9 data-[state=active]:bg-background">Trimestral</TabsTrigger>
            <TabsTrigger value="semiannual" className="rounded-full px-5 h-9 data-[state=active]:bg-background">Semestral</TabsTrigger>
            <TabsTrigger value="annual" className="rounded-full px-5 h-9 data-[state=active]:bg-background gap-2">
              Anual
              <span className="bg-primary/15 text-primary text-[10px] font-semibold rounded-full px-2 py-0.5">Melhor valor</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-3.5 w-3.5" />
                Por que sem plano mensal?
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm text-sm leading-relaxed">
              A ciência comportamental mostra que cultura de feedback só se firma após 90 dias de prática consistente. Cobramos pelo ciclo de valor — não pelo mês.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pulse */}
        <Card className="rounded-3xl shadow-lg border transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="p-8 pb-4 space-y-3">
            <CardTitle className="text-2xl font-bold tracking-tight">Pulse</CardTitle>
            <div className="pt-1">
              <span className="text-5xl font-bold tracking-tight">Grátis</span>
              <span className="text-base text-muted-foreground ml-1">para sempre</span>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-5">
            <div className="space-y-3">
              {PLAN_FEATURES.pulse.features.map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-base">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
              {PLAN_FEATURES.pulse.lockedFeatures.map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-base text-muted-foreground">
                  <Lock className="h-5 w-5 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <Badge variant="outline" className="w-full justify-center py-2.5 rounded-xl text-sm">
              Plano atual
            </Badge>
          </CardContent>
        </Card>

        {/* Pro (highlighted) */}
        <Card className="rounded-3xl shadow-lg border-2 border-primary/50 ring-2 ring-primary/10 transition-all duration-300 md:-translate-y-2 hover:md:-translate-y-3">
          <CardHeader className="p-8 pb-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-2xl font-bold tracking-tight">Pro</CardTitle>
              <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 rounded-full px-3 py-1 text-xs font-medium">
                Recomendado
              </span>
            </div>
            <div className="pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight">R$ {cyclePricing.total}</span>
                <span className="text-base text-muted-foreground">{cyclePricing.periodLabel}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Equivale a <span className="font-semibold text-foreground">R$ {cyclePricing.perMonth}/mês</span>
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-5">
            <div className="space-y-5">
              {PLAN_FEATURES.pro.groups.map((group, gIdx) => (
                <div key={group.groupLabel} className={gIdx > 0 ? 'pt-4 border-t border-border/40' : ''}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    {group.groupLabel}
                  </p>
                  <div className="space-y-3">
                    {group.items.map((f) => (
                      <div key={f} className="flex items-center gap-2.5 text-base">
                        <Check className="h-5 w-5 text-primary shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={() => handleUpgrade(selectedCycle)}
              className="w-full rounded-xl h-11 text-base"
              disabled={upgradeLoading !== null}
            >
              {upgradeLoading === selectedCycle && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Fazer upgrade para Pro
            </Button>
          </CardContent>
        </Card>

        {/* Enterprise */}
        <Card className="rounded-3xl shadow-lg border transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="p-8 pb-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-2xl font-bold tracking-tight">Enterprise</CardTitle>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                <Building className="h-3 w-3" />
                Corporate
              </span>
            </div>
            <div className="pt-1">
              <p className="text-sm italic text-muted-foreground mb-3">{PLAN_FEATURES.enterprise.impact}</p>
              <span className="text-3xl font-bold tracking-tight">Sob consulta</span>
              <p className="text-sm text-muted-foreground mt-1">Cobrança exclusivamente anual</p>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-5">
            <div className="space-y-3 text-base">
              <div className="flex items-center gap-2.5"><Check className="h-5 w-5 text-primary shrink-0" /><span>Tudo do Pro, organização inteira</span></div>
              <div className="flex items-center gap-2.5"><Check className="h-5 w-5 text-primary shrink-0" /><span>HR Dashboard (Radar de Risco)</span></div>
              <div className="flex items-center gap-2.5"><Check className="h-5 w-5 text-primary shrink-0" /><span>Dossiê de Blindagem Jurídica</span></div>
              <div className="flex items-center gap-2.5"><Check className="h-5 w-5 text-primary shrink-0" /><span>Integração HRIS + SSO</span></div>
              <div className="flex items-center gap-2.5"><Check className="h-5 w-5 text-primary shrink-0" /><span>CSM dedicado e SLA garantido</span></div>
            </div>
            <Button variant="outline" className="w-full rounded-xl h-11 text-base" asChild>
              <Link to="/enterprise">Fale com Vendas</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Billing;
