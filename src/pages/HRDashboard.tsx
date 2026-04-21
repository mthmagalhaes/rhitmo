import { useQuery } from '@tanstack/react-query';
import { RhythmWave } from '@/components/RhythmWave';
import { supabase } from '@/integrations/supabase/client';
import { useHRAdmin } from '@/components/HRAdminGuard';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Navigate, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users, AlertCircle, CheckCircle, Bell, Target, ShieldAlert,
  ShieldCheck, Activity
} from 'lucide-react';

interface LeaderActivity {
  manager_id: string;
  manager_name: string;
  manager_email?: string | null;
  note_count: number;
  member_count: number;
}

interface Metrics {
  total_leaders: number;
  total_members: number;
  members_without_recent_feedback: number;
  members_without_recent_review: number;
  sync_completed_count: number;
  reviews_last_90_days: number;
  pdi_coverage_percentage: number;
  bias_detected_last_7d: number;
  members_at_risk?: number;
  coverage_percentage?: number;
  notes_per_leader_last_30d: LeaderActivity[];
  sentiment_distribution: Record<string, number>;
}

const getInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const HRDashboard = () => {
  const navigate = useNavigate();
  const { workspaceId, workspaceName } = useHRAdmin();
  const { hasHrDashboard, isLoading: planLoading } = usePlanLimits();

  const { data: metrics, isLoading } = useQuery<Metrics>({
    queryKey: ['hr-dashboard', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hr_dashboard_metrics', { _workspace_id: workspaceId });
      if (error) throw error;
      return data as unknown as Metrics;
    },
    enabled: !!workspaceId && !planLoading && hasHrDashboard,
  });

  if (!planLoading && !hasHrDashboard) {
    return <Navigate to="/billing" replace />;
  }

  const noFeedback = metrics?.members_without_recent_feedback ?? 0;
  const noReview = metrics?.members_without_recent_review ?? 0;
  const totalMembers = metrics?.total_members ?? 0;
  const pdiPct = metrics?.pdi_coverage_percentage ?? 0;
  const biasCount = metrics?.bias_detected_last_7d ?? 0;
  const membersAtRisk = metrics?.members_at_risk ?? noFeedback;
  const coveragePct = metrics?.coverage_percentage
    ?? (totalMembers > 0 ? Math.round(((totalMembers - noFeedback) / totalMembers) * 100) : 0);
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
        {/* ═══ MÉTRICAS — Sprint 1.6: 5 → 3 KPIs (Cobertura, Maturidade, Risco) ═══ */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">Métricas-chave</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              icon={<Activity className={`h-5 w-5 ${coveragePct >= 70 ? 'text-emerald-500' : coveragePct >= 40 ? 'text-amber-500' : 'text-destructive'}`} />}
              label="Cobertura (notas 30d)"
              value={coveragePct}
              loading={isLoading}
              suffix="%"
              valueClass={coveragePct >= 70 ? 'text-emerald-600' : coveragePct >= 40 ? 'text-amber-600' : 'text-destructive'}
              hint={`${totalMembers - noFeedback} de ${totalMembers} liderados com nota recente`}
              onClick={() => navigate('/hr/members?filter=no_recent_feedback')}
            />
            <MetricCard
              icon={<Target className={`h-5 w-5 ${pdiPct >= 50 ? 'text-emerald-500' : 'text-amber-500'}`} />}
              label="Maturidade (PDI ativo)"
              value={pdiPct}
              loading={isLoading}
              suffix="%"
              valueClass={pdiPct >= 50 ? 'text-emerald-600' : 'text-amber-600'}
              hint="Liderados com PDI definido"
              onClick={() => navigate('/hr/members?filter=no_pdi')}
            />
            <MetricCard
              icon={membersAtRisk > 0
                ? <ShieldAlert className="h-5 w-5 text-destructive" />
                : <ShieldCheck className="h-5 w-5 text-emerald-500" />}
              label="Risco (zona vermelha)"
              value={membersAtRisk}
              loading={isLoading}
              valueClass={membersAtRisk > 0 ? 'text-destructive' : 'text-emerald-600'}
              hint={membersAtRisk > 0 ? 'Sem nota há 30+ dias' : 'Nenhum liderado em risco'}
              onClick={() => navigate('/hr/members?filter=at_risk')}
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

        {/* ═══ ATIVIDADE DOS LÍDERES — Sprint 1.5: nomes + avatares (sem UUIDs) ═══ */}
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
                      <th className="pb-3 font-medium">Líder</th>
                      <th className="pb-3 font-medium text-center">Notas registradas</th>
                      <th className="pb-3 font-medium text-center">Liderados cobertos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.notes_per_leader_last_30d.map((row) => (
                      <tr key={row.manager_id} className="border-b border-border/50 last:border-0">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {getInitials(row.manager_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-foreground font-medium">{row.manager_name}</span>
                              {row.manager_email && (
                                <span className="text-xs text-muted-foreground">{row.manager_email}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-center text-foreground font-medium">{row.note_count}</td>
                        <td className="py-3 text-center text-foreground font-medium">{row.member_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const MetricCard = ({
  icon, label, value, loading, valueClass, suffix, hint, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  loading: boolean;
  valueClass?: string;
  suffix?: string;
  hint?: string;
  onClick?: () => void;
}) => {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`bg-card rounded-2xl border border-border shadow-sm p-6 hover:-translate-y-0.5 hover:shadow-md transition-all text-left ${onClick ? 'cursor-pointer w-full' : ''}`}
    >
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      {loading ? <Skeleton className="h-8 w-16" /> : (
        <>
          <p className={`text-3xl font-bold tracking-tight ${valueClass || 'text-foreground'}`}>{value ?? 0}{suffix || ''}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </>
      )}
    </Wrapper>
  );
};

export default HRDashboard;
