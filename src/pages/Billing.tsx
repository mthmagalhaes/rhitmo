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
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Check, Lock, CreditCard, Loader2, AlertTriangle, Download, RotateCcw, Users, Minus, Plus, Crown, ArrowUp, ArrowDown } from 'lucide-react';

const PLANS = {
  pulse: {
    name: 'Pulse',
    price: 'Grátis',
    priceDetail: 'para sempre',
    features: [
      'Até 3 liderados',
      '20 mensagens de Mentor Chat por mês',
      'Notas e anotações ilimitadas',
      '1 avaliação formal por mês',
      '1 time',
    ],
    lockedFeatures: [
      'Meu Rhitmo para liderados',
      'Gravação de reuniões',
      'Analytics completo',
    ],
  },
  pro: {
    name: 'Pro',
    price: 'R$49',
    priceDetail: '/mês por líder',
    features: [
      'Até 5 liderados',
      'Mentor Chat ilimitado',
      'Notas e anotações ilimitadas',
      'Avaliações formais ilimitadas',
      'Meu Rhitmo para seus liderados',
      'Gravação de reuniões (até 12h/mês)',
      'Analytics completo',
      'Até 3 times',
    ],
    lockedFeatures: [],
  },
  business: {
    name: 'Business',
    price: 'R$69',
    priceDetail: '/mês por líder',
    features: [
      'Até 8 liderados por líder',
      'Tudo do plano Pro',
      'Times ilimitados',
      'Gravação de reuniões (até 30h/mês)',
      'HR Dashboard com métricas agregadas',
      'Onboarding assistido',
      'Suporte prioritário',
    ],
    lockedFeatures: [],
  },
};

type PlanKey = 'pulse' | 'pro' | 'business';

const LAUNCH_PRICE_IDS = [
  'price_1TC52fIF4fHxJpjHPaJXH14r', // Pro launch
  'price_1TCPcjIF4fHxJpjHWtZucdwy', // Business launch
];

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
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTimestamp(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCentsBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
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
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <p className="text-base text-muted-foreground">Nenhuma fatura ainda.</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-4 rounded-xl border p-4 text-sm hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-muted-foreground shrink-0">
                  {formatTimestamp(inv.created)}
                </span>
                <span className="font-medium text-base">{formatCentsBRL(inv.amount)}</span>
                <InvoiceStatusBadge status={inv.status} />
              </div>
              {inv.invoice_pdf && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl"
                  asChild
                >
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

// --- Business Quantity Dialog ---

function BusinessQuantityDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (quantity: number) => void;
  loading: boolean;
}) {
  const [quantity, setQuantity] = useState(3);

  const total = quantity * 69;
  const isValid = quantity >= 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">Upgrade para Business</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Quantos líderes vão usar o Rhitmo?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl"
              onClick={() => setQuantity(Math.max(3, quantity - 1))}
              disabled={quantity <= 3}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={3}
                max={50}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) setQuantity(Math.max(1, Math.min(50, val)));
                }}
                className="w-20 text-center text-2xl font-bold rounded-xl h-14 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl"
              onClick={() => setQuantity(Math.min(50, quantity + 1))}
              disabled={quantity >= 50}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {!isValid && (
            <p className="text-sm text-destructive text-center">Mínimo de 3 líderes para o plano Business.</p>
          )}

          <div className="rounded-2xl bg-muted/50 p-5 text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              {quantity} {quantity === 1 ? 'líder' : 'líderes'} × R$69
            </p>
            <p className="text-3xl font-bold tracking-tight">
              R${total}<span className="text-base font-normal text-muted-foreground">/mês</span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline" className="rounded-xl h-11">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            className="rounded-xl h-11"
            onClick={() => onConfirm(quantity)}
            disabled={!isValid || loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Continuar para pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Component ---

const Billing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [businessDialogOpen, setBusinessDialogOpen] = useState(false);
  const [planChangeLoading, setPlanChangeLoading] = useState(false);
  const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false);

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  // URL param toasts
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({ title: 'Assinatura ativada! 🎉', description: 'Bem-vindo ao seu novo plano Rhitmo!' });
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

  const currentPlan: PlanKey = subscription ? (subscription.plan_tier as PlanKey) : 'pulse';
  const isCancelScheduled = !!(subscription as any)?.cancel_at_period_end;

  const handleUpgrade = async (plan: string, quantity: number = 1) => {
    if (plan === 'business' && quantity < 3) {
      toast({ title: 'Mínimo de 3 líderes', description: 'O plano Business requer no mínimo 3 líderes.', variant: 'destructive' });
      return;
    }
    setUpgradeLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', { body: { plan, quantity } });
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

  const handlePlanChange = async (newPlan: 'pro' | 'business', quantity: number = 1) => {
    setPlanChangeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-subscription', {
        body: { newPlan, quantity },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: newPlan === 'business' ? 'Upgrade realizado! 🎉' : 'Downgrade realizado',
        description: newPlan === 'business'
          ? 'Seu plano Business está ativo. Mudanças aplicadas imediatamente.'
          : 'Seu plano foi alterado para Pro. Créditos proporcionais serão aplicados.',
      });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-billing'] });
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar plano',
        description: err?.message || 'Tente novamente ou entre em contato: support@rhitmo.co',
        variant: 'destructive',
      });
    } finally {
      setPlanChangeLoading(false);
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

    const statusLabel = isCancelScheduled
      ? 'Cancelamento agendado'
      : subscription?.status === 'trialing'
        ? 'Trial'
        : subscription?.status === 'past_due'
          ? 'Pendente'
          : 'Ativo';

    const statusClass = isCancelScheduled
      ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-0'
      : subscription?.status === 'trialing'
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-0'
        : subscription?.status === 'past_due'
          ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-0'
          : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-0';

    return (
      <div className="px-4 sm:px-6 lg:px-10 py-8 md:py-10 max-w-4xl mx-auto space-y-8 pb-20">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seu plano</h1>
          <p className="text-base text-muted-foreground mt-2">Gerencie sua assinatura Rhitmo.</p>
        </div>

        {workspace?.is_beta_user && (
          <Alert className="mb-6 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/20 dark:border-purple-700/50">
            <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <AlertTitle className="text-lg font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
              ⭐ Early Adopter — Acesso Vitalício
            </AlertTitle>
            <AlertDescription className="text-purple-800 dark:text-purple-300">
              Obrigado por acreditar na Rhitmo desde o início! Seu acesso é ilimitado e gratuito para sempre como agradecimento por nos ajudar a construir o produto. 🎉
            </AlertDescription>
          </Alert>
        )}

        {subscription?.status === 'trialing' && subscription.trial_ends_at && (
          <TrialBanner trialEndsAt={subscription.trial_ends_at} onUpdateCard={handleUpdatePayment} />
        )}
        {subscription?.status === 'past_due' && (
          <PastDueBanner onUpdateCard={handleUpdatePayment} />
        )}

        <Card className="rounded-3xl shadow-lg border">
          <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-2xl font-bold tracking-tight">{plan.name}</CardTitle>
              {subscription?.stripe_price_id && LAUNCH_PRICE_IDS.includes(subscription.stripe_price_id) && (
                <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 rounded-full px-3 py-1 text-xs font-medium">
                  Preço de Lançamento
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
                <p className="text-xl font-bold">{plan.price}<span className="text-muted-foreground font-normal text-sm ml-1">{plan.priceDetail}</span></p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Próxima cobrança</p>
                <p className="text-xl font-bold">{formatDatePtBR(subscription?.current_period_end ?? null)}</p>
              </div>
              {(subscription?.quantity ?? 0) > 1 && (
                <div className="space-y-1">
                  <p className="text-muted-foreground">Seats</p>
                  <p className="text-xl font-bold">{subscription?.quantity}</p>
                </div>
              )}
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
              {isCancelScheduled ? (
                <Button className="rounded-xl h-11" onClick={handleReactivate} disabled={reactivateLoading}>
                  {reactivateLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                  Reativar assinatura
                </Button>
              ) : currentPlan === 'pro' ? (
                <Button className="rounded-xl h-11" onClick={() => setBusinessDialogOpen(true)} disabled={planChangeLoading}>
                  {planChangeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUp className="h-4 w-4 mr-2" />}
                  Fazer upgrade para Business
                </Button>
              ) : currentPlan === 'business' ? (
                <Button variant="outline" className="rounded-xl h-11" onClick={() => setDowngradeDialogOpen(true)} disabled={planChangeLoading}>
                  {planChangeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowDown className="h-4 w-4 mr-2" />}
                  Fazer downgrade para Pro
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <h2 className="text-xl font-semibold tracking-tight">O que está incluso no seu plano</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plan.features.map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-base">
                <Check className="h-5 w-5 text-primary shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <InvoicesSection invoices={invoicesData ?? []} isLoading={invoicesLoading} />

        {!isCancelScheduled && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-sm text-muted-foreground hover:underline">
                Cancelar assinatura
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  Seu plano {plan.name} continuará ativo até{' '}
                  {formatDatePtBR(subscription?.current_period_end ?? null)}.
                  Após essa data, você voltará automaticamente para o Pulse.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl h-11">Manter assinatura</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-xl h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleCancel}
                  disabled={cancelLoading}
                >
                  {cancelLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Confirmar cancelamento
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <BusinessQuantityDialog
          open={businessDialogOpen}
          onOpenChange={setBusinessDialogOpen}
          onConfirm={(qty) => {
            setBusinessDialogOpen(false);
            if (subscription) {
              handlePlanChange('business', qty);
            } else {
              handleUpgrade('business', qty);
            }
          }}
          loading={planChangeLoading || upgradeLoading === 'business'}
        />

        <AlertDialog open={downgradeDialogOpen} onOpenChange={setDowngradeDialogOpen}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Fazer downgrade para Pro?</AlertDialogTitle>
              <AlertDialogDescription className="text-base space-y-3">
                <span className="block">Ao mudar para o plano Pro, você perderá acesso a:</span>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>HR Dashboard com métricas agregadas</li>
                  <li>Mais de 5 liderados por líder</li>
                  <li>Times ilimitados (limite de 3 no Pro)</li>
                  <li>Gravação acima de 12h/mês</li>
                  <li>Onboarding assistido e suporte prioritário</li>
                </ul>
                <span className="block">Créditos proporcionais serão aplicados automaticamente.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl h-11">Manter Business</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl h-11"
                onClick={() => {
                  setDowngradeDialogOpen(false);
                  handlePlanChange('pro', 1);
                }}
                disabled={planChangeLoading}
              >
                {planChangeLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirmar downgrade
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Pulse (free) — upgrade grid
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 md:py-10 max-w-6xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Seu plano</h1>
        <p className="text-base text-muted-foreground mt-2">
          Você está no plano Pulse (gratuito). Faça upgrade para desbloquear mais recursos.
        </p>
      </div>

      {workspace?.is_beta_user && (
        <Alert className="mb-6 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/20 dark:border-purple-700/50">
          <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <AlertTitle className="text-lg font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
            ⭐ Early Adopter — Acesso Vitalício
          </AlertTitle>
          <AlertDescription className="text-purple-800 dark:text-purple-300">
            Obrigado por acreditar na Rhitmo desde o início! Seu acesso é ilimitado e gratuito para sempre como agradecimento por nos ajudar a construir o produto. 🎉
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(Object.entries(PLANS) as [PlanKey, typeof PLANS.pulse][]).map(([key, plan]) => {
          const isCurrent = key === currentPlan;
          const isPro = key === 'pro';
          const isBusiness = key === 'business';

          return (
            <Card
              key={key}
              className={`rounded-3xl shadow-lg border transition-all duration-300 hover:-translate-y-1 ${
                isPro ? 'border-2 border-primary/50 ring-2 ring-primary/10 md:-translate-y-2 hover:md:-translate-y-3' : ''
              }`}
            >
              <CardHeader className="p-8 pb-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-2xl font-bold tracking-tight">{plan.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {(isPro || isBusiness) && (
                      <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 rounded-full px-3 py-1 text-xs font-medium">
                        Lançamento
                      </span>
                    )}
                    {isPro && (
                      <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 rounded-full px-3 py-1 text-xs font-medium">
                        Recomendado
                      </span>
                    )}
                  </div>
                </div>
                <div className="pt-1">
                  <span className="text-5xl font-bold tracking-tight">{plan.price}</span>
                  <span className="text-base text-muted-foreground ml-1">{plan.priceDetail}</span>
                </div>
                {isBusiness && (
                  <p className="text-sm text-muted-foreground">Mínimo 3 líderes · R$207/mês</p>
                )}
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-5">
                <div className="space-y-3">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-base">
                      <Check className="h-5 w-5 text-primary shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                  {plan.lockedFeatures.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-base text-muted-foreground">
                      <Lock className="h-5 w-5 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {isCurrent && (
                  <Badge variant="outline" className="w-full justify-center py-2.5 rounded-xl text-sm">
                    Plano atual
                  </Badge>
                )}
                {isPro && (
                  <Button
                    onClick={() => handleUpgrade('pro')}
                    className="w-full rounded-xl h-11 text-base"
                    disabled={upgradeLoading === 'pro'}
                  >
                    {upgradeLoading === 'pro' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Fazer upgrade para Pro
                  </Button>
                )}
                {isBusiness && (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl h-11 text-base"
                    onClick={() => setBusinessDialogOpen(true)}
                    disabled={upgradeLoading === 'business'}
                  >
                    {upgradeLoading === 'business' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Fazer upgrade para Business
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <BusinessQuantityDialog
        open={businessDialogOpen}
        onOpenChange={setBusinessDialogOpen}
        onConfirm={(qty) => {
          setBusinessDialogOpen(false);
          handleUpgrade('business', qty);
        }}
        loading={upgradeLoading === 'business'}
      />
    </div>
  );
};

export default Billing;
