import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Brain, AlertTriangle, TrendingUp, CreditCard, Loader2, Activity,
} from 'lucide-react';
import { RevenueOverview } from './RevenueOverview';

interface WorkspaceHealth {
  id: string;
  name: string;
  owner_id: string;
  memberCount: number;
  feedbackCount: number;
  reviewCount: number;
  lastFeedbackDate: string | null;
  healthScore: number;
  status: 'healthy' | 'warning' | 'critical';
  plan_tier: string;
}

export const AdminIntelligence = () => {
  // All workspaces with related data
  const { data: workspaceHealth, isLoading } = useQuery({
    queryKey: ['admin-workspace-health'],
    queryFn: async () => {
      const { data: workspaces, error } = await supabase
        .from('workspaces')
        .select(`
          id, name, owner_id, plan_tier, is_active,
          teams ( id, team_members ( id ) )
        `)
        .eq('is_active', true);

      if (error) {
        console.error('[AdminIntelligence] workspaces query error:', error);
        throw error;
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch all feedbacks and reviews counts per workspace
      const results: WorkspaceHealth[] = [];

      for (const ws of workspaces || []) {
        try {
          const memberCount = ws.teams?.reduce((acc: number, t: any) => acc + (t.team_members?.length || 0), 0) || 0;

          // Get member IDs for this workspace
          const memberIds: string[] = [];
          ws.teams?.forEach((t: any) => {
            t.team_members?.forEach((m: any) => memberIds.push(m.id));
          });

          let feedbackCount = 0;
          let reviewCount = 0;
          let lastFeedbackDate: string | null = null;

          if (memberIds.length > 0) {
            const [fbRes, rvRes, lastFbRes] = await Promise.all([
              supabase.from('feedbacks').select('*', { count: 'exact', head: true })
                .in('member_id', memberIds).gte('created_at', thirtyDaysAgo),
              supabase.from('performance_reviews').select('*', { count: 'exact', head: true })
                .in('member_id', memberIds),
              supabase.from('feedbacks').select('created_at')
                .in('member_id', memberIds).order('created_at', { ascending: false }).limit(1),
            ]);

            feedbackCount = fbRes.count || 0;
            reviewCount = rvRes.count || 0;
            lastFeedbackDate = lastFbRes.data?.[0]?.created_at || null;
          }

          // Health score: 0-100
          // 40% feedback coverage (at least 1 feedback per member in 30 days)
          // 30% review coverage (at least 1 review per member)
          // 30% recency (last feedback within 7 days = full score)
          const fbCoverage = memberCount > 0 ? Math.min(feedbackCount / memberCount, 1) : 0;
          const rvCoverage = memberCount > 0 ? Math.min(reviewCount / memberCount, 1) : 0;

          let recencyScore = 0;
          if (lastFeedbackDate) {
            const daysSince = (Date.now() - new Date(lastFeedbackDate).getTime()) / (1000 * 60 * 60 * 24);
            recencyScore = daysSince <= 7 ? 1 : daysSince <= 14 ? 0.7 : daysSince <= 30 ? 0.4 : 0.1;
          }

          const healthScore = Math.round((fbCoverage * 40 + rvCoverage * 30 + recencyScore * 30));
          const status: 'healthy' | 'warning' | 'critical' =
            healthScore >= 60 ? 'healthy' : healthScore >= 30 ? 'warning' : 'critical';

          results.push({
            id: ws.id, name: ws.name, owner_id: ws.owner_id, memberCount,
            feedbackCount, reviewCount, lastFeedbackDate, healthScore, status,
            plan_tier: ws.plan_tier,
          });
        } catch (err) {
          console.error(`[AdminIntelligence] failed to compute health for workspace ${ws.id}:`, err);
        }
      }

      return results.sort((a, b) => a.healthScore - b.healthScore);
    },
  });

  // Billing summary
  const { data: billingSummary } = useQuery({
    queryKey: ['admin-billing-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_tier, status')
        .in('status', ['active', 'trialing']);
      if (error) throw error;

      const tiers: Record<string, number> = { pulse: 0, pro: 0, business: 0 };
      data?.forEach(s => { tiers[s.plan_tier] = (tiers[s.plan_tier] || 0) + 1; });
      return tiers;
    },
  });

  // Engagement: feedbacks per week (last 4 weeks)
  const { data: weeklyEngagement } = useQuery({
    queryKey: ['admin-weekly-engagement'],
    queryFn: async () => {
      const weeks: { label: string; count: number }[] = [];
      for (let i = 3; i >= 0; i--) {
        const start = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString();
        const end = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from('feedbacks')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', start)
          .lt('created_at', end);
        const weekLabel = `Sem ${4 - i}`;
        weeks.push({ label: weekLabel, count: count || 0 });
      }
      return weeks;
    },
  });

  const atRisk = workspaceHealth?.filter(w => w.status === 'critical') || [];
  const avgHealth = workspaceHealth && workspaceHealth.length > 0
    ? Math.round(workspaceHealth.reduce((a, w) => a + w.healthScore, 0) / workspaceHealth.length)
    : 0;

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30';
    if (status === 'warning') return 'text-amber-600 bg-amber-500/10 border-amber-500/30';
    return 'text-red-600 bg-red-500/10 border-red-500/30';
  };

  const getProgressColor = (score: number) => {
    if (score >= 60) return 'bg-emerald-500';
    if (score >= 30) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          Inteligência
        </h1>
        <p className="text-muted-foreground">Health scores, engajamento e métricas de negócio</p>
      </div>

      {/* Revenue overview (Entrega 2 P0) */}
      <RevenueOverview />

      {/* Top cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saúde Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgHealth}<span className="text-lg text-muted-foreground">/100</span></div>
            <Progress value={avgHealth} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className={atRisk.length > 0 ? 'border-red-500/30' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Em Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{atRisk.length}</div>
            <p className="text-xs text-muted-foreground">workspaces críticos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Assinaturas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <div className="text-sm space-y-1">
                <div>🎵 Pulse: <span className="font-bold">{billingSummary?.pulse || 0}</span></div>
                <div>💼 Pro: <span className="font-bold">{billingSummary?.pro || 0}</span></div>
                <div>🏢 Business: <span className="font-bold">{billingSummary?.business || 0}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Feedbacks / Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyEngagement ? (
              <div className="flex items-end gap-2 h-16">
                {weeklyEngagement.map((w, i) => {
                  const max = Math.max(...weeklyEngagement.map(x => x.count), 1);
                  const h = Math.max((w.count / max) * 100, 8);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-medium">{w.count}</span>
                      <div className="w-full bg-primary/80 rounded-t" style={{ height: `${h}%` }} />
                      <span className="text-[9px] text-muted-foreground">{w.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workspace Health Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Health Score por Workspace
          </CardTitle>
          <CardDescription>Baseado em: feedbacks/membro (30d), reviews/membro, recência do último feedback</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Membros</TableHead>
                <TableHead>FB (30d)</TableHead>
                <TableHead>Reviews</TableHead>
                <TableHead>Último FB</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspaceHealth?.map(ws => (
                <TableRow key={ws.id}>
                  <TableCell className="font-medium">{ws.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {ws.plan_tier === 'pulse' ? '🎵' : ws.plan_tier === 'pro' ? '💼' : '🏢'} {ws.plan_tier}
                    </Badge>
                  </TableCell>
                  <TableCell>{ws.memberCount}</TableCell>
                  <TableCell>{ws.feedbackCount}</TableCell>
                  <TableCell>{ws.reviewCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(ws.lastFeedbackDate)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 w-24">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${getProgressColor(ws.healthScore)}`} style={{ width: `${ws.healthScore}%` }} />
                      </div>
                      <span className="text-xs font-medium w-8">{ws.healthScore}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${getStatusColor(ws.status)}`}>
                      {ws.status === 'healthy' ? '✓ Saudável' : ws.status === 'warning' ? '⚠ Atenção' : '🔴 Crítico'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
