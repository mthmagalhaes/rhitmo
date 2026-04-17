import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DollarSign, TrendingUp, AlertCircle, ChevronDown, ChevronUp, Percent,
} from 'lucide-react';

interface RevenueMetrics {
  mrr_total: number;
  mrr_by_tier: { pulse: number; pro: number; business: number };
  mrr_trend_4w: { week_label: string; week_end: string; mrr: number }[];
  trial_expiring_7d: {
    workspace_id: string;
    workspace_name: string;
    plan_tier: string;
    trial_ends_at: string;
    days_left: number;
  }[];
  trial_to_paid_rate_90d: number;
  trials_started_90d: number;
  trials_converted_90d: number;
  subscriptions_by_tier: { pulse: number; pro: number; business: number };
  pricing: { pulse: number; pro: number; business: number; currency: string };
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

const Sparkline = ({ data, height = 40 }: { data: number[]; height?: number }) => {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 120;
  const step = width / Math.max(data.length - 1, 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPath = `M0,${height} L${points} L${width},${height} Z`.replace(' L', ' L');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="spark-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-gradient)" />
      <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
      {data.map((v, i) => (
        <circle
          key={i}
          cx={i * step}
          cy={height - ((v - min) / range) * height}
          r={i === data.length - 1 ? 3 : 2}
          fill="hsl(var(--primary))"
        />
      ))}
    </svg>
  );
};

export const RevenueOverview = () => {
  const [trialOpen, setTrialOpen] = useState(false);

  const { data, isLoading, error } = useQuery<RevenueMetrics>({
    queryKey: ['admin-revenue-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_revenue_metrics');
      if (error) throw error;
      return data as unknown as RevenueMetrics;
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="rounded-2xl border-destructive/30">
        <CardContent className="p-6 text-sm text-destructive">
          Erro ao carregar métricas de receita: {(error as Error)?.message ?? 'sem dados'}
        </CardContent>
      </Card>
    );
  }

  const trend = data.mrr_trend_4w?.map((w) => Number(w.mrr)) || [];
  const trendDelta =
    trend.length >= 2 && trend[trend.length - 2] > 0
      ? Math.round(((trend[trend.length - 1] - trend[trend.length - 2]) / trend[trend.length - 2]) * 100)
      : null;

  const trialList = data.trial_expiring_7d || [];

  const dayBadgeClass = (days: number) => {
    if (days <= 2) return 'bg-destructive/10 text-destructive border-destructive/30';
    if (days <= 5) return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* MRR Hero */}
      <Card className="rounded-2xl lg:col-span-2 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" /> MRR Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-4xl font-bold tracking-tight">{formatBRL(data.mrr_total)}</div>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>Pro {formatBRL(data.mrr_by_tier.pro)}</span>
                <span>·</span>
                <span>Business {formatBRL(data.mrr_by_tier.business)}</span>
                {trendDelta !== null && (
                  <>
                    <span>·</span>
                    <span className={trendDelta >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                      {trendDelta >= 0 ? '↗' : '↘'} {Math.abs(trendDelta)}% vs sem. anterior
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <Sparkline data={trend} />
              <span className="text-[10px] text-muted-foreground mt-1">últimas 4 semanas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trial Expiring */}
      <Card className={`rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] ${trialList.length > 0 ? 'border-amber-500/30' : ''}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" /> Trial Vencendo (7d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Collapsible open={trialOpen} onOpenChange={setTrialOpen}>
            <CollapsibleTrigger className="w-full text-left">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{trialList.length}</div>
                  <p className="text-xs text-muted-foreground">workspaces</p>
                </div>
                {trialList.length > 0 &&
                  (trialOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />)}
              </div>
            </CollapsibleTrigger>
            {trialList.length > 0 && (
              <CollapsibleContent className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {trialList.map((t) => (
                  <div key={t.workspace_id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium">{t.workspace_name}</span>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${dayBadgeClass(t.days_left)}`}>
                      {t.days_left}d · {t.plan_tier}
                    </Badge>
                  </div>
                ))}
              </CollapsibleContent>
            )}
          </Collapsible>
        </CardContent>
      </Card>

      {/* Conversion T→P */}
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Percent className="h-4 w-4" /> Conv. Trial → Pago (90d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.trial_to_paid_rate_90d}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.trials_converted_90d} de {data.trials_started_90d} trials
          </p>
        </CardContent>
      </Card>

      {/* Distribution by plan */}
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" /> Distribuição por Plano
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground mb-1">🎵 Pulse</div>
              <div className="text-xl font-bold">{data.subscriptions_by_tier.pulse}</div>
              <div className="text-[10px] text-muted-foreground">grátis</div>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground mb-1">💼 Pro</div>
              <div className="text-xl font-bold">{data.subscriptions_by_tier.pro}</div>
              <div className="text-[10px] text-muted-foreground">{formatBRL(data.mrr_by_tier.pro)}/mês</div>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground mb-1">🏢 Business</div>
              <div className="text-xl font-bold">{data.subscriptions_by_tier.business}</div>
              <div className="text-[10px] text-muted-foreground">{formatBRL(data.mrr_by_tier.business)}/mês</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
