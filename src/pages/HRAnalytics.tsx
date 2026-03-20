import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHRAdmin } from '@/components/HRAdminGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3, Users, MessageSquare, TrendingUp, Filter } from 'lucide-react';

interface Metrics {
  total_leaders: number;
  total_members: number;
  members_without_recent_feedback: number;
  pdi_coverage_percentage: number;
  bias_detected_last_7d: number;
  sentiment_distribution: Record<string, number>;
  notes_per_leader_last_30d: { manager_id: string; note_count: number; member_count: number }[];
}

interface LeaderOverview {
  leader_id: string;
  leader_name: string;
  leader_email: string;
  total_members: number;
  feedbacks_last_30d: number;
  days_since_last_feedback: number;
}

const SENTIMENT_LABELS: Record<string, string> = {
  muito_positivo: 'Muito Positivo',
  positivo: 'Positivo',
  neutro: 'Neutro',
  construtivo: 'Construtivo',
  critico: 'Crítico',
};

const SENTIMENT_COLORS: Record<string, string> = {
  muito_positivo: 'hsl(160, 84%, 39%)',
  positivo: 'hsl(142, 71%, 45%)',
  neutro: 'hsl(220, 9%, 46%)',
  construtivo: 'hsl(38, 92%, 50%)',
  critico: 'hsl(0, 84%, 60%)',
};

export default function HRAnalytics() {
  const { workspaceId } = useHRAdmin();
  const [selectedLeader, setSelectedLeader] = useState('all');

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['hr-analytics-metrics', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hr_dashboard_metrics', {
        _workspace_id: workspaceId,
      });
      if (error) throw error;
      return data as unknown as Metrics;
    },
    enabled: !!workspaceId,
  });

  const { data: leadersData, isLoading: leadersLoading } = useQuery({
    queryKey: ['hr-analytics-leaders', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hr_leaders_overview', {
        _workspace_id: workspaceId,
      });
      if (error) throw error;
      return (data as any)?.leaders as LeaderOverview[] || [];
    },
    enabled: !!workspaceId,
  });

  const isLoading = metricsLoading || leadersLoading;
  const leaders = leadersData || [];

  // Chart data: feedback frequency per leader
  const feedbackByLeader = leaders
    .filter(l => selectedLeader === 'all' || l.leader_id === selectedLeader)
    .map(l => ({
      name: l.leader_name?.split(' ')[0] || 'N/A',
      feedbacks: l.feedbacks_last_30d || 0,
      members: l.total_members || 0,
    }))
    .sort((a, b) => b.feedbacks - a.feedbacks);

  // Chart data: sentiment distribution
  const sentimentData = metrics?.sentiment_distribution
    ? Object.entries(metrics.sentiment_distribution)
        .filter(([_, v]) => v > 0)
        .map(([key, value]) => ({
          name: SENTIMENT_LABELS[key] || key,
          value,
          color: SENTIMENT_COLORS[key] || 'hsl(220, 9%, 46%)',
        }))
    : [];

  const totalFeedbacks = sentimentData.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Analytics RH
        </h1>
        <p className="text-muted-foreground mt-1">
          Análise detalhada da gestão de performance na organização
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedLeader} onValueChange={setSelectedLeader}>
          <SelectTrigger className="w-[220px] rounded-xl">
            <SelectValue placeholder="Filtrar por líder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os líderes</SelectItem>
            {leaders.map((l) => (
              <SelectItem key={l.leader_id} value={l.leader_id}>
                {l.leader_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Summary */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-0">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">{metrics?.total_members ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Liderados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-0">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">{metrics?.total_leaders ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Líderes Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-0">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">{totalFeedbacks}</p>
                  <p className="text-xs text-muted-foreground">Feedbacks (30d)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-0">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">{metrics?.pdi_coverage_percentage ?? 0}%</p>
                  <p className="text-xs text-muted-foreground">Cobertura PDI</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Feedback frequency per leader */}
        <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold tracking-tight">
              Feedbacks por Líder (últimos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] rounded-xl" />
            ) : feedbackByLeader.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={feedbackByLeader} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    }}
                    formatter={(value: number, name: string) => [
                      value,
                      name === 'feedbacks' ? 'Feedbacks' : name,
                    ]}
                  />
                  <Bar dataKey="feedbacks" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {feedbackByLeader.map((_, i) => (
                      <Cell key={i} fill="hsl(var(--primary))" fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sentiment distribution */}
        <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold tracking-tight">
              Distribuição de Sentimento (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] rounded-xl" />
            ) : sentimentData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {sentimentData.map((item) => {
                  const pct = totalFeedbacks > 0 ? Math.round((item.value / totalFeedbacks) * 100) : 0;
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-foreground">{item.name}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {item.value} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}