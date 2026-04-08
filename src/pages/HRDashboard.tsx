import { useQuery } from '@tanstack/react-query';
import { RhythmWave } from '@/components/RhythmWave';
import { supabase } from '@/integrations/supabase/client';
import { useHRAdmin } from '@/components/HRAdminGuard';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, UserCheck, AlertCircle, CheckCircle, FileText,
  Bell, Activity, Target, ShieldAlert
} from 'lucide-react';

interface Metrics {
  total_leaders: number;
  total_members: number;
  members_without_recent_feedback: number;
  members_without_recent_review: number;
  sync_completed_count: number;
  reviews_last_90_days: number;
  pdi_coverage_percentage: number;
  bias_detected_last_7d: number;
  notes_per_leader_last_30d: { manager_id: string; note_count: number; member_count: number }[];
  sentiment_distribution: Record<string, number>;
}

const SENTIMENT_COLORS: Record<string, string> = {
  muito_positivo: 'bg-emerald-400',
  positivo: 'bg-green-400',
  neutro: 'bg-muted-foreground/30',
  construtivo: 'bg-amber-400',
  critico: 'bg-destructive',
};

const SENTIMENT_LABELS: Record<string, string> = {
  muito_positivo: 'Muito Positivo',
  positivo: 'Positivo',
  neutro: 'Neutro',
  construtivo: 'Construtivo',
  critico: 'Crítico',
};

const HRDashboard = () => {
  const { workspaceId, workspaceName } = useHRAdmin();

  const { data: metrics, isLoading } = useQuery<Metrics>({
    queryKey: ['hr-dashboard', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hr_dashboard_metrics', { _workspace_id: workspaceId });
      if (error) throw error;
      return data as unknown as Metrics;
    },
  });

  const noFeedback = metrics?.members_without_recent_feedback ?? 0;
  const noReview = metrics?.members_without_recent_review ?? 0;
  const totalMembers = metrics?.total_members ?? 0;
  const syncCount = metrics?.sync_completed_count ?? 0;
  const syncPct = totalMembers > 0 ? Math.round((syncCount / totalMembers) * 100) : 0;
  const pdiPct = metrics?.pdi_coverage_percentage ?? 0;
  const biasCount = metrics?.bias_detected_last_7d ?? 0;
  const sentimentTotal = metrics ? Object.values(metrics.sentiment_distribution).reduce((a, b) => a + b, 0) : 0;
  const hasNoAlerts = noFeedback === 0 && noReview === 0 && pdiPct >= 50 && biasCount === 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ═══ HERO STRIP ═══ */}
      <div className="relative bg-primary/5 border-b border-border/50 overflow-hidden">
        <div className="absolute inset-0 flex items-end">
          <RhythmWave variant="hero" className="opacity-60" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-10 sm:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">Painel de Liderança</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-serif">Visão Geral</h1>
          <p className="text-sm text-muted-foreground mt-2">{workspaceName}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-8 space-y-12">
        {/* ═══ MÉTRICAS ═══ */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">Métricas</p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard icon={<Users className="h-5 w-5 text-primary" />} label="Líderes Ativos" value={metrics?.total_leaders} loading={isLoading} />
            <MetricCard icon={<UserCheck className="h-5 w-5 text-primary/70" />} label="Liderados" value={metrics?.total_members} loading={isLoading} />
            <MetricCard
              icon={noFeedback > 0 ? <AlertCircle className="h-5 w-5 text-amber-500" /> : <CheckCircle className="h-5 w-5 text-emerald-500" />}
              label="Sem Nota (30d)"
              value={noFeedback}
              loading={isLoading}
              valueClass={noFeedback > 0 ? 'text-destructive' : 'text-emerald-600'}
            />
            <MetricCard icon={<FileText className="h-5 w-5 text-emerald-500" />} label="Avaliações (90d)" value={metrics?.reviews_last_90_days} loading={isLoading} />
            <MetricCard
              icon={<Target className="h-5 w-5 text-primary" />}
              label="Cobertura PDI"
              value={pdiPct}
              loading={isLoading}
              suffix="%"
              valueClass={pdiPct < 50 ? 'text-amber-600' : 'text-emerald-600'}
            />
          </div>
        </section>

        {/* ═══ PONTOS DE ATENÇÃO ═══ */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">Pontos de Atenção</p>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="space-y-2">
                {noFeedback > 0 && (
                  <div className="flex items-center gap-2 text-amber-700 bg-amber-50 dark:bg-amber-950/20 rounded-xl px-4 py-2 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {noFeedback} liderado{noFeedback > 1 ? 's' : ''} sem registro nos últimos 30 dias
                  </div>
                )}
                {noReview > 0 && (
                  <div className="flex items-center gap-2 text-amber-700 bg-amber-50 dark:bg-amber-950/20 rounded-xl px-4 py-2 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {noReview} liderado{noReview > 1 ? 's' : ''} elegíve{noReview > 1 ? 'is' : 'l'} sem avaliação recente
                  </div>
                )}
                {pdiPct < 50 && (
                  <div className="flex items-center gap-2 text-amber-700 bg-amber-50 dark:bg-amber-950/20 rounded-xl px-4 py-2 text-sm">
                    <Target className="h-4 w-4 flex-shrink-0" />
                    Apenas {pdiPct}% dos liderados têm PDI definido
                  </div>
                )}
                {biasCount > 0 && (
                  <div className="flex items-center gap-2 text-primary bg-primary/5 rounded-xl px-4 py-2 text-sm">
                    <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                    {biasCount} detecção{biasCount > 1 ? 'ões' : ''} de viés nos últimos 7 dias
                  </div>
                )}
                {hasNoAlerts && (
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl px-4 py-2 text-sm">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    Processo de acompanhamento em dia
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ═══ ATIVIDADE DOS LÍDERES ═══ */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Atividade dos Líderes <span className="text-muted-foreground/50 ml-1">(últimos 30d)</span>
          </p>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : !metrics?.notes_per_leader_last_30d?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade no período</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Líder</th>
                      <th className="pb-2 font-medium text-center">Notas registradas</th>
                      <th className="pb-2 font-medium text-center">Liderados cobertos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.notes_per_leader_last_30d.map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-2 text-foreground font-mono text-xs">{row.manager_id.slice(0, 8)}…</td>
                        <td className="py-2 text-center text-foreground font-medium">{row.note_count}</td>
                        <td className="py-2 text-center text-foreground font-medium">{row.member_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ═══ MATURIDADE ═══ */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">Maturidade</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Liderados com Sync completo</h3>
              {isLoading ? (
                <Skeleton className="h-6 w-full" />
              ) : (
                <>
                  <div className="w-full bg-muted rounded-full h-2 mb-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${syncPct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{syncCount} de {totalMembers}</p>
                </>
              )}
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Distribuição de Sentimento</h3>
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="space-y-2">
                  {Object.entries(SENTIMENT_LABELS).map(([key, label]) => {
                    const count = metrics?.sentiment_distribution?.[key] ?? 0;
                    const pct = sentimentTotal > 0 ? Math.round((count / sentimentTotal) * 100) : 0;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-28 truncate">{label}</span>
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div className={`${SENTIMENT_COLORS[key]} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const MetricCard = ({
  icon, label, value, loading, valueClass, suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  loading: boolean;
  valueClass?: string;
  suffix?: string;
}) => (
  <div className="bg-card rounded-2xl border border-border shadow-sm p-6 hover:-translate-y-0.5 hover:shadow-md transition-all">
    <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
    {loading ? <Skeleton className="h-8 w-16" /> : (
      <p className={`text-3xl font-bold tracking-tight ${valueClass || 'text-foreground'}`}>{value ?? 0}{suffix || ''}</p>
    )}
  </div>
);

export default HRDashboard;
