import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  SEAT_PRICE_MONTHLY_BRL,
  SEAT_PRICE_ANNUAL_BRL,
  ANNUAL_DISCOUNT_PERCENT,
  FREE_SEATS,
  type SeatCycle,
} from '@/hooks/usePlanLimits';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Check, CreditCard, Loader2, AlertTriangle, Download, RotateCcw, Crown, Sparkles } from 'lucide-react';

// ============================================================================
// PRICING v3 — Modelo Windmill (single plan, per-seat)
// Líder + 3 liderados grátis. R$49,90/liderado a partir do 4º.
// Anual com 16% off (R$502,80/liderado/ano).
// ============================================================================

const FEATURE_GROUPS = [
  {
    label: 'Ciclo de Performance',
    items: [
      'Diário de bordo + resumo mensal automático',
      'Acompanhamento trimestral guiado por IA',
      'Avaliações formais com evidências citadas',
      'Pulse Surveys e leitura de pulso do time',
    ],
  },
  {
    label: 'Inteligência ao redor da liderança',
    items: [
      'Pre-meeting briefs com contexto histórico',
      'Detecção de viés em tempo real',
      'Mentor AI ilimitado',
      'Network signals e leitura da rede do time',
    ],
  },
  {
    label: 'Integrações & Recall',
    items: [
      'Slack bidirecional e DMs proativas da Rhy',
      'Recall.ai com transcrição e diarização (ilimitado em planos pagos)',
      'Google Calendar com bot automático em 1:1s',
      'Chrome Extension para captura de reuniões',
    ],
  },
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

function formatDatePtBR(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTimestamp(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatCentsBRL(cents: number) {
  return formatBRL(cents / 100);
}

// --- Sub-components ---

function GrandfatherBanner({ grandfatherUntil }: { grandfatherUntil: string }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(grandfatherUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  return (
    <Alert className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/20 dark:border-purple-700/50">
      <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
      <AlertTitle className="text-lg font-bold text-purple-900 dark:text-purple-200">
        Você é Early Adopter da Rhitmo
      </AlertTitle>
      <AlertDescription className="text-purple-800 dark:text-purple-300 mt-1">
        Todo o seu workspace está liberado <strong>sem cobrança até {formatDatePtBR(grandfatherUntil)}</strong>{' '}
        ({daysLeft} {daysLeft === 1 ? 'dia restante' : 'dias restantes'}). Liderados ilimitados e Recall ilimitado, sem
        cartão. Depois dessa data, o plano padrão é <strong>líder + 3 liderados grátis</strong> e R$ 49,90/liderado adicional —
        nada é cobrado retroativamente e seus dados continuam intocados.
      </AlertDescription>
    </Alert>
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
  if (status === 'paid')
    return <Badge className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-0 text-[10px] rounded-full px-2.5 py-0.5">Pago</Badge>;
  if (status === 'open')
    return <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-0 text-[10px] rounded-full px-2.5 py-0.5">Pendente</Badge>;
  return <Badge className="bg-muted text-muted-foreground border-0 text-[10px] rounded-full px-2.5 py-0.5">Cancelada</Badge>;
}

function InvoicesSection({ invoices, isLoading }: { invoices: Invoice[]; isLoading: boolean }) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold tracking-tight">Faturas</h2>
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
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

function priceDisplay(cycle: SeatCycle) {
  if (cycle === 'monthly') {
    return { headline: formatBRL(SEAT_PRICE_MONTHLY_BRL), suffix: '/liderado/mês', sub: 'Cobrado mensalmente. Cancele quando quiser.' };
  }
  return {
    headline: formatBRL(SEAT_PRICE_ANNUAL_BRL),
    suffix: '/liderado/ano',
    sub: `Equivale a ${formatBRL(SEAT_PRICE_ANNUAL_BRL / 12)} /liderado/mês • ${ANNUAL_DISCOUNT_PERCENT}% off`,
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const BillingContent = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [cycleLoading, setCycleLoading] = useState<SeatCycle | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<SeatCycle>('annual');

  useEffect(() => {
    if (!user && !loading) navigate('/auth', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({ title: 'Tudo certo! 🎉', description: 'Seus seats foram ativados. Bem-vindo ao Rhitmo.' });
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
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, plan_tier, is_beta_user, paid_seats, grandfather_until, seat_cycle')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: memberCount = 0 } = useQuery({
    queryKey: ['member-count-billing', workspace?.id],
    queryFn: async () => {
      const { count, error } = await supabase.from('team_members').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: !!workspace?.id,
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

  const grandfatherUntil = (workspace as any)?.grandfather_until as string | null;
  const isGrandfathered = !!grandfatherUntil && new Date(grandfatherUntil) >= new Date(new Date().toDateString());
  const paidSeats: number = (workspace as any)?.paid_seats ?? 0;
  const seatCycleOnFile: SeatCycle = ((workspace as any)?.seat_cycle as SeatCycle) || 'monthly';
  const isCancelScheduled = !!(subscription as any)?.cancel_at_period_end;
  const seatsBeyondFree = Math.max(0, memberCount - FREE_SEATS);
  const recommendedSeats = Math.max(1, seatsBeyondFree);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { seatCycle: selectedCycle, seats: recommendedSeats },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('Sem URL de checkout');
    } catch (err: any) {
      toast({
        title: 'Erro ao iniciar checkout',
        description: err?.message || 'Tente novamente ou fale com support@rhitmo.co',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleUpdatePayment = async () => {
    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-payment-method');
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
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
        description: `Você mantém os seats pagos até ${formatDatePtBR(data?.cancel_at ?? subscription?.current_period_end ?? null)}.`,
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

  const handleSwitchCycle = async (newCycle: SeatCycle) => {
    if (newCycle === seatCycleOnFile) return;
    setCycleLoading(newCycle);
    try {
      const { data, error } = await supabase.functions.invoke('update-subscription', {
        body: { seatCycle: newCycle },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Ciclo atualizado!', description: 'Mudança aplicada com proratação automática.' });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-billing'] });
    } catch (err: any) {
      toast({ title: 'Erro ao alterar ciclo', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setCycleLoading(null);
    }
  };

  if (!user || loading || workspaceLoading || subLoading) {
    return (
      <div className="p-6 md:p-8 min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const display = priceDisplay(selectedCycle);
  const hasPaidSubscription = !!subscription && paidSeats > 0;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 md:py-10 max-w-3xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plano da sua organização</h1>
        <p className="text-base text-muted-foreground mt-2">
          Um plano só. Líder + 3 liderados grátis para sempre. A partir do 4º liderado, R$ 49,90/mês cada.
        </p>
      </div>

      {workspace?.is_beta_user && (
        <Alert className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 dark:border-amber-700/50">
          <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-lg font-bold text-amber-900 dark:text-amber-200">Acesso vitalício de fundador</AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            Obrigado por acreditar na Rhitmo desde o início. Seu workspace é ilimitado e gratuito para sempre.
          </AlertDescription>
        </Alert>
      )}

      {!workspace?.is_beta_user && isGrandfathered && grandfatherUntil && (
        <GrandfatherBanner grandfatherUntil={grandfatherUntil} />
      )}

      {subscription?.status === 'past_due' && <PastDueBanner onUpdateCard={handleUpdatePayment} />}

      {/* Single pricing card — Windmill style */}
      <Card className="rounded-3xl shadow-[0_2px_30px_rgba(0,0,0,0.05)] border bg-card">
        <CardHeader className="p-8 pb-2 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plano Rhitmo</p>
              <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight mt-1">
                Líder + 3 liderados grátis
              </CardTitle>
            </div>
            {hasPaidSubscription && (
              <Badge className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-0 rounded-full px-3 py-1">
                Ativo · {paidSeats} {paidSeats === 1 ? 'seat pago' : 'seats pagos'}
              </Badge>
            )}
          </div>
          <p className="text-base text-muted-foreground">Tente o Rhitmo sem risco.</p>
        </CardHeader>

        <CardContent className="p-8 pt-4 space-y-7">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-5xl md:text-6xl font-bold tracking-tight">{display.headline}</span>
            <span className="text-base text-muted-foreground">{display.suffix}</span>
          </div>
          <p className="text-sm text-muted-foreground -mt-4">{display.sub} · A partir do 4º liderado.</p>

          {/* Cycle toggle */}
          <Tabs value={selectedCycle} onValueChange={(v) => setSelectedCycle(v as SeatCycle)}>
            <TabsList className="h-11 rounded-full p-1 bg-muted">
              <TabsTrigger value="monthly" className="rounded-full px-5 h-9 data-[state=active]:bg-background">
                Mensal
              </TabsTrigger>
              <TabsTrigger value="annual" className="rounded-full px-5 h-9 data-[state=active]:bg-background gap-2">
                Anual
                <span className="bg-primary/15 text-primary text-[10px] font-semibold rounded-full px-2 py-0.5">
                  −{ANNUAL_DISCOUNT_PERCENT}%
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* CTA */}
          {!hasPaidSubscription ? (
            <div className="space-y-3">
              <Button
                className="w-full rounded-2xl h-14 text-base font-semibold bg-foreground text-background hover:bg-foreground/90"
                onClick={handleCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {seatsBeyondFree > 0
                  ? `Ativar ${seatsBeyondFree} ${seatsBeyondFree === 1 ? 'seat pago' : 'seats pagos'} →`
                  : 'Adicionar seats pagos →'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Você tem {memberCount} liderado{memberCount === 1 ? '' : 's'} hoje. Os 3 primeiros são sempre grátis.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-muted-foreground">Próxima cobrança</p>
                  <p className="font-semibold mt-1">{formatDatePtBR(subscription?.current_period_end ?? null)}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-muted-foreground">Ciclo atual</p>
                  <p className="font-semibold mt-1 capitalize">{seatCycleOnFile === 'annual' ? 'Anual' : 'Mensal'}</p>
                </div>
              </div>
              {seatCycleOnFile !== selectedCycle && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl h-11"
                  onClick={() => handleSwitchCycle(selectedCycle)}
                  disabled={cycleLoading !== null}
                >
                  {cycleLoading === selectedCycle && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Trocar para ciclo {selectedCycle === 'annual' ? 'anual' : 'mensal'}
                </Button>
              )}
              <Button variant="outline" className="w-full rounded-xl h-11" onClick={handleUpdatePayment} disabled={paymentLoading}>
                {paymentLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Trocar cartão
              </Button>
              {isCancelScheduled && (
                <Button className="w-full rounded-xl h-11" onClick={handleReactivate} disabled={reactivateLoading}>
                  {reactivateLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                  Reativar assinatura
                </Button>
              )}
            </div>
          )}

          {isCancelScheduled && (
            <div className="rounded-2xl border border-amber-200/50 bg-amber-50/60 dark:bg-amber-900/10 dark:border-amber-700/30 p-4 text-sm text-amber-800 dark:text-amber-200">
              Cancelamento agendado para {formatDatePtBR(subscription?.current_period_end ?? null)}. Após essa data, seu workspace
              volta ao tier gratuito (líder + 3 liderados).
            </div>
          )}

          {/* Features */}
          <div className="pt-5 border-t border-border/50 space-y-6">
            {FEATURE_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  {group.label}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {group.items.map((item) => (
                    <div key={item} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {hasPaidSubscription && <InvoicesSection invoices={invoicesData ?? []} isLoading={invoicesLoading} />}

      {hasPaidSubscription && !isCancelScheduled && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="text-sm text-muted-foreground hover:underline">Cancelar assinatura</button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Seus seats pagos continuam ativos até {formatDatePtBR(subscription?.current_period_end ?? null)}. Após essa data,
                seu workspace volta ao tier gratuito (líder + 3 liderados). Liderados além de 3 ficam visíveis em modo somente
                leitura até você reativar o plano.
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
    </div>
  );
};

const Billing = BillingContent;
export default Billing;
