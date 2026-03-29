import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, TrendingDown, FileText, Users, Music, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';

type PeriodType = '30d' | '90d' | '365d';

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const { hasAnalytics, limits, isLoading: limitsLoading } = usePlanLimits();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodType>('30d');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Queries
  const { data: feedbacks, isLoading: loadingFeedbacks } = useQuery({
    queryKey: ['analytics-feedbacks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('id, created_at, sentiment, member_id, type')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: reviews, isLoading: loadingReviews } = useQuery({
    queryKey: ['analytics-reviews', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select('id, created_at, member_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ['analytics-members', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, team_id, work_style_data, teams(id, name)')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Helper: Get date range
  const getStartDate = (periodType: PeriodType) => {
    const now = new Date();
    const days = periodType === '30d' ? 30 : periodType === '90d' ? 90 : 365;
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  };

  const getPreviousStartDate = (periodType: PeriodType) => {
    const now = new Date();
    const days = periodType === '30d' ? 30 : periodType === '90d' ? 90 : 365;
    return new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);
  };

  // Filtered data by period and team
  const filteredFeedbacks = useMemo(() => {
    if (!feedbacks || !members) return [];
    const startDate = getStartDate(period);
    return feedbacks.filter(f => {
      const inPeriod = new Date(f.created_at) >= startDate;
      const member = members.find(m => m.id === f.member_id);
      const inTeam = teamFilter === 'all' || member?.team_id === teamFilter;
      return inPeriod && inTeam;
    });
  }, [feedbacks, members, period, teamFilter]);

  const previousFeedbacks = useMemo(() => {
    if (!feedbacks || !members) return [];
    const startDate = getPreviousStartDate(period);
    const endDate = getStartDate(period);
    return feedbacks.filter(f => {
      const date = new Date(f.created_at);
      const inPeriod = date >= startDate && date < endDate;
      const member = members.find(m => m.id === f.member_id);
      const inTeam = teamFilter === 'all' || member?.team_id === teamFilter;
      return inPeriod && inTeam;
    });
  }, [feedbacks, members, period, teamFilter]);

  const filteredReviews = useMemo(() => {
    if (!reviews || !members) return [];
    const startDate = getStartDate(period);
    return reviews.filter(r => {
      const inPeriod = new Date(r.created_at) >= startDate;
      const member = members.find(m => m.id === r.member_id);
      const inTeam = teamFilter === 'all' || member?.team_id === teamFilter;
      return inPeriod && inTeam;
    });
  }, [reviews, members, period, teamFilter]);

  const previousReviews = useMemo(() => {
    if (!reviews || !members) return [];
    const startDate = getPreviousStartDate(period);
    const endDate = getStartDate(period);
    return reviews.filter(r => {
      const date = new Date(r.created_at);
      const inPeriod = date >= startDate && date < endDate;
      const member = members.find(m => m.id === r.member_id);
      const inTeam = teamFilter === 'all' || member?.team_id === teamFilter;
      return inPeriod && inTeam;
    });
  }, [reviews, members, period, teamFilter]);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members.filter(m => teamFilter === 'all' || m.team_id === teamFilter);
  }, [members, teamFilter]);

  // Big numbers calculations
  const totalNotes = filteredFeedbacks.length;
  const previousNotes = previousFeedbacks.length;
  const notesChange = previousNotes > 0 ? ((totalNotes - previousNotes) / previousNotes) * 100 : 0;

  const totalReviews = filteredReviews.length;
  const previousReviewsCount = previousReviews.length;
  const reviewsChange = previousReviewsCount > 0 ? ((totalReviews - previousReviewsCount) / previousReviewsCount) * 100 : 0;

  const activeMembersIds = useMemo(() => {
    const ids = new Set<string>();
    filteredFeedbacks.forEach(f => ids.add(f.member_id));
    return ids;
  }, [filteredFeedbacks]);

  const previousActiveMembersIds = useMemo(() => {
    const ids = new Set<string>();
    previousFeedbacks.forEach(f => ids.add(f.member_id));
    return ids;
  }, [previousFeedbacks]);

  const activeMembers = activeMembersIds.size;
  const previousActiveMembers = previousActiveMembersIds.size;
  const activeMembersChange = previousActiveMembers > 0 ? ((activeMembers - previousActiveMembers) / previousActiveMembers) * 100 : 0;

  // Chart A: Coverage (Bar Chart)
  const coverageData = useMemo(() => {
    if (!filteredMembers) return [];
    return filteredMembers.map(member => ({
      name: member.name.split(' ')[0], // First name only
      feedbackCount: filteredFeedbacks.filter(f => f.member_id === member.id).length,
      fullName: member.name,
    })).sort((a, b) => b.feedbackCount - a.feedbackCount);
  }, [filteredMembers, filteredFeedbacks]);

  // Chart B: Sentiment (Pie Chart)
  const sentimentData = useMemo(() => {
    const counts = { positivo: 0, neutro: 0, construtivo: 0 };
    filteredFeedbacks.forEach(f => {
      const sentiment = f.sentiment?.toLowerCase() || 'neutro';
      if (sentiment.includes('positivo')) counts.positivo++;
      else if (sentiment.includes('construtivo')) counts.construtivo++;
      else counts.neutro++;
    });
    return [
      { name: 'Positivo', value: counts.positivo, fill: 'hsl(160 84% 39%)' },
      { name: 'Neutro', value: counts.neutro, fill: 'hsl(215 20% 65%)' },
      { name: 'Construtivo', value: counts.construtivo, fill: 'hsl(263 84% 57%)' },
    ];
  }, [filteredFeedbacks]);

  // Chart C: Rhitmo Sync Adoption
  const syncAdoption = useMemo(() => {
    if (!filteredMembers || filteredMembers.length === 0) return 0;
    const withSync = filteredMembers.filter(m => m.work_style_data !== null).length;
    return Math.round((withSync / filteredMembers.length) * 100);
  }, [filteredMembers]);

  // Get unique teams for filter
  const teams = useMemo(() => {
    if (!members) return [];
    const teamMap = new Map();
    members.forEach(m => {
      if (m.teams && !teamMap.has(m.team_id)) {
        teamMap.set(m.team_id, m.teams);
      }
    });
    return Array.from(teamMap.values());
  }, [members]);

  const isLoading = loadingFeedbacks || loadingReviews || loadingMembers;

  if (!user) return null;

  // Upsell screen for non-Pro/Business plans
  if (!limitsLoading && !hasAnalytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8">
        <div className="text-center max-w-md space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground">Analytics Premium</h1>
          
          <p className="text-muted-foreground text-lg">
            O painel de Analytics está disponível a partir do plano <strong>Pro</strong>. 
            Faça upgrade para desbloquear insights avançados sobre seu time.
          </p>
          </p>
          
          <div className="pt-4">
            <Button 
              size="lg" 
              className="gap-2"
              onClick={() => navigate('/billing')}
            >
              <Sparkles className="h-5 w-5" />
              Ver Planos
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Plano atual: <Badge variant="outline">{limits.planName}</Badge>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Transforme dados em insights de gestão</p>
        </div>
        
        <div className="flex gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Último Trimestre</SelectItem>
              <SelectItem value="365d">Último Ano</SelectItem>
            </SelectContent>
          </Select>

          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Times</SelectItem>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Big Numbers */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Notas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <>
                <div className="text-4xl font-bold text-foreground">{totalNotes}</div>
                <div className="flex items-center gap-1 mt-1">
                  {notesChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <p className={`text-xs font-medium ${notesChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {notesChange >= 0 ? '+' : ''}{notesChange.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">vs período anterior</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avaliações Geradas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <>
                <div className="text-4xl font-bold text-foreground">{totalReviews}</div>
                <div className="flex items-center gap-1 mt-1">
                  {reviewsChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <p className={`text-xs font-medium ${reviewsChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {reviewsChange >= 0 ? '+' : ''}{reviewsChange.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">vs período anterior</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Membros Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <>
                <div className="text-4xl font-bold text-foreground">{activeMembers}</div>
                <div className="flex items-center gap-1 mt-1">
                  {activeMembersChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <p className={`text-xs font-medium ${activeMembersChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {activeMembersChange >= 0 ? '+' : ''}{activeMembersChange.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">vs período anterior</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Chart A: Coverage */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Cobertura de Atenção</CardTitle>
            <CardDescription>Quantidade de notas por membro no período</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : coverageData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível para o período selecionado
              </div>
            ) : (
              <ChartContainer
                config={{
                  feedbackCount: {
                    label: "Notas",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coverageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
                    />
                    <ReferenceLine 
                      y={2} 
                      stroke="hsl(var(--destructive))" 
                      strokeDasharray="3 3"
                      label={{ value: 'Meta: 2', position: 'right', fill: 'hsl(var(--destructive))', fontSize: 12 }}
                    />
                    <Bar 
                      dataKey="feedbackCount" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart B: Sentiment */}
        <Card>
          <CardHeader>
            <CardTitle>Termômetro de Sentimento</CardTitle>
            <CardDescription>Distribuição das notas por tipo</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : sentimentData.every(d => d.value === 0) ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            ) : (
              <ChartContainer
                config={{
                  positivo: { label: "Positivo", color: "hsl(160 84% 39%)" },
                  neutro: { label: "Neutro", color: "hsl(215 20% 65%)" },
                  construtivo: { label: "Construtivo", color: "hsl(263 84% 57%)" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart C: Rhitmo Sync Adoption */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              Conhecimento do Time
            </CardTitle>
            <CardDescription>Adoção do Rhitmo Sync</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="hsl(var(--muted))"
                      strokeWidth="16"
                      fill="none"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="hsl(160 84% 39%)"
                      strokeWidth="16"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 80}`}
                      strokeDashoffset={`${2 * Math.PI * 80 * (1 - syncAdoption / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-foreground">{syncAdoption}%</div>
                      <div className="text-sm text-muted-foreground mt-1">Preenchido</div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  {filteredMembers.filter(m => m.work_style_data !== null).length} de {filteredMembers.length} membros
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
