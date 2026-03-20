import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHRAdmin } from '@/components/HRAdminGuard';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, UserCheck, AlertCircle, CheckCircle, FileText,
  Bell, LogOut, Activity, BookOpen, Target, ShieldAlert
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
  neutro: 'bg-gray-300',
  construtivo: 'bg-amber-400',
  critico: 'bg-red-400',
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
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const { data: metrics, isLoading } = useQuery<Metrics>({
    queryKey: ['hr-dashboard', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hr_dashboard_metrics', {
        _workspace_id: workspaceId,
      });
      if (error) throw error;
      return data as unknown as Metrics;
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

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
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <RhitmoLogo size="sm" />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900">Painel de Liderança</h1>
              <p className="text-sm text-gray-500">{workspaceName}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="gap-2 text-gray-600">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Quick Links */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => navigate('/hr/competency-framework')}
          >
            <BookOpen className="h-4 w-4" /> Framework de Competências
          </Button>
        </div>

        {/* Seção 1 — Grid 5 cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard icon={<Users className="h-5 w-5 text-violet-500" />} label="Líderes Ativos" value={metrics?.total_leaders} loading={isLoading} />
          <MetricCard icon={<UserCheck className="h-5 w-5 text-blue-500" />} label="Liderados" value={metrics?.total_members} loading={isLoading} />
          <MetricCard
            icon={noFeedback > 0 ? <AlertCircle className="h-5 w-5 text-amber-500" /> : <CheckCircle className="h-5 w-5 text-emerald-500" />}
            label="Sem Nota (30d)"
            value={noFeedback}
            loading={isLoading}
            valueClass={noFeedback > 0 ? 'text-red-600' : 'text-emerald-600'}
          />
          <MetricCard icon={<FileText className="h-5 w-5 text-emerald-500" />} label="Avaliações (90d)" value={metrics?.reviews_last_90_days} loading={isLoading} />
          <MetricCard
            icon={<Target className="h-5 w-5 text-violet-500" />}
            label="Cobertura PDI"
            value={pdiPct}
            loading={isLoading}
            suffix="%"
            valueClass={pdiPct < 50 ? 'text-amber-600' : 'text-emerald-600'}
          />
        </div>

        {/* Seção 2 — Alertas de Atenção */}
        <div className="bg-white/80 rounded-3xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Pontos de Atenção</h2>
          </div>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="space-y-2">
              {noFeedback > 0 && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-xl px-4 py-2 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {noFeedback} liderado{noFeedback > 1 ? 's' : ''} sem registro nos últimos 30 dias
                </div>
              )}
              {noReview > 0 && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-xl px-4 py-2 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {noReview} liderado{noReview > 1 ? 's' : ''} elegíve{noReview > 1 ? 'is' : 'l'} sem avaliação recente
                </div>
              )}
              {pdiPct < 50 && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-xl px-4 py-2 text-sm">
                  <Target className="h-4 w-4 flex-shrink-0" />
                  Apenas {pdiPct}% dos liderados têm PDI definido
                </div>
              )}
              {biasCount > 0 && (
                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 rounded-xl px-4 py-2 text-sm">
                  <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                  {biasCount} detecção{biasCount > 1 ? 'ões' : ''} de viés nos últimos 7 dias
                </div>
              )}
              {hasNoAlerts && (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2 text-sm">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  Processo de acompanhamento em dia
                </div>
              )}
            </div>
          )}
        </div>

        {/* Seção 3 — Atividade por Líder */}
        <div className="bg-white/80 rounded-3xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Atividade dos Líderes</h2>
            <span className="text-xs text-gray-400 ml-1">(últimos 30d)</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !metrics?.notes_per_leader_last_30d?.length ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma atividade no período</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-2 font-medium">Líder</th>
                    <th className="pb-2 font-medium text-center">Notas registradas</th>
                    <th className="pb-2 font-medium text-center">Liderados cobertos</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.notes_per_leader_last_30d.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 text-gray-700 font-mono text-xs">{row.manager_id.slice(0, 8)}…</td>
                      <td className="py-2 text-center text-gray-900 font-medium">{row.note_count}</td>
                      <td className="py-2 text-center text-gray-900 font-medium">{row.member_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Seção 4 — Maturidade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rhitmo Sync */}
          <div className="bg-white/80 rounded-3xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Liderados com Sync completo</h3>
            {isLoading ? (
              <Skeleton className="h-6 w-full" />
            ) : (
              <>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div
                    className="bg-violet-400 h-2 rounded-full transition-all"
                    style={{ width: `${syncPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{syncCount} de {totalMembers}</p>
              </>
            )}
          </div>

          {/* Sentimento */}
          <div className="bg-white/80 rounded-3xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição de Sentimento</h3>
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-2">
                {Object.entries(SENTIMENT_LABELS).map(([key, label]) => {
                  const count = metrics?.sentiment_distribution?.[key] ?? 0;
                  const pct = sentimentTotal > 0 ? Math.round((count / sentimentTotal) * 100) : 0;
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-28 truncate">{label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className={`${SENTIMENT_COLORS[key]} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
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
  <div className="bg-white/80 rounded-3xl shadow-sm p-6">
    <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-500">{label}</span></div>
    {loading ? <Skeleton className="h-8 w-16" /> : (
      <p className={`text-3xl font-bold tracking-tight ${valueClass || 'text-gray-900'}`}>{value ?? 0}{suffix || ''}</p>
    )}
  </div>
);

export default HRDashboard;
