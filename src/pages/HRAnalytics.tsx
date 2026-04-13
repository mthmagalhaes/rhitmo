import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHRAdmin } from '@/components/HRAdminGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { BarChart3, Users, MessageSquare, TrendingUp, Filter, Activity, AlertTriangle, Tag, Heart } from 'lucide-react';
import { RiskTable } from '@/components/hr/RiskTable';
import { EngagementHeatmap } from '@/components/hr/EngagementHeatmap';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Navigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

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

interface AdvancedAnalytics {
  weekly_trend: { week_start: string; week_label: string; count: number }[];
  tag_distribution: { tag: string; count: number }[];
  at_risk_members: {
    member_id: string;
    member_name: string;
    member_role: string;
    leader_name: string;
    days_since_feedback: number;
    has_pdi: boolean;
  }[];
  engagement_heatmap: {
    leader_id: string;
    leader_name: string;
    weeks: { week_start: string; week_label: string; count: number }[];
  }[];
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
  const { hasHrDashboard, isLoading: planLoading } = usePlanLimits();
  const [selectedLeader, setSelectedLeader] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');

  if (!planLoading && !hasHrDashboard) {
    return <Navigate to="/billing" replace />;
  }

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

  const { data: advancedData, isLoading: advancedLoading } = useQuery({
    queryKey: ['hr-analytics-advanced', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hr_analytics_advanced' as any, {
        _workspace_id: workspaceId,
      });
      if (error) throw error;
      return data as unknown as AdvancedAnalytics;
    },
    enabled: !!workspaceId,
  });

  const isLoading = metricsLoading || leadersLoading;
  const leaders = leadersData || [];

  const feedbackByLeader = leaders
    .filter(l => selectedLeader === 'all' || l.leader_id === selectedLeader)
    .map(l => ({
      name: l.leader_name?.split(' ')[0] || 'N/A',
      feedbacks: l.feedbacks_last_30d || 0,
      members: l.total_members || 0,
    }))
    .sort((a, b) => b.feedbacks - a.feedbacks);

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

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="rounded-xl bg-muted/60 p-1">
          <TabsTrigger value="overview" className="rounded-lg text-sm">Visão Geral</TabsTrigger>
          <TabsTrigger value="trends" className="rounded-lg text-sm">Tendências</TabsTrigger>
          <TabsTrigger value="risks" className="rounded-lg text-sm">Riscos</TabsTrigger>
          <TabsTrigger value="engagement" className="rounded-lg text-sm">Engajamento</TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral (existing content) */}
        <TabsContent value="overview" className="space-y-6">
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
        </TabsContent>

        {/* Tab: Tendências */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Weekly trend line chart */}
            <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Volume de Feedbacks (últimas 12 semanas)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {advancedLoading ? (
                  <Skeleton className="h-[280px] rounded-xl" />
                ) : !advancedData?.weekly_trend?.length ? (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                    Nenhum dado disponível
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={advancedData.weekly_trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorFeedbacks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week_label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        }}
                        formatter={(value: number) => [value, 'Feedbacks']}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorFeedbacks)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Tag distribution */}
            <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  Tags mais frequentes (30 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {advancedLoading ? (
                  <Skeleton className="h-[280px] rounded-xl" />
                ) : !advancedData?.tag_distribution?.length ? (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                    Nenhuma tag registrada
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={advancedData.tag_distribution} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="tag"
                        width={100}
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        }}
                        formatter={(value: number) => [value, 'Ocorrências']}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={24}>
                        {advancedData.tag_distribution.map((_, i) => (
                          <Cell key={i} fill="hsl(var(--primary))" fillOpacity={0.7} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Riscos */}
        <TabsContent value="risks">
          <RiskTable
            members={advancedData?.at_risk_members || []}
            isLoading={advancedLoading}
          />
        </TabsContent>

        {/* Tab: Engajamento */}
        <TabsContent value="engagement">
          <EngagementHeatmap
            data={advancedData?.engagement_heatmap || []}
            isLoading={advancedLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
