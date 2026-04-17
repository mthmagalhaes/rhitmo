import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Users, MessageSquare, FileText, CreditCard, ClipboardList } from 'lucide-react';

export const StatsGrid = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [workspacesRes, membersRes, feedbacksRes, reviewsRes] = await Promise.all([
        supabase.from('workspaces').select('*', { count: 'exact', head: true }),
        supabase.from('team_members').select('*', { count: 'exact', head: true }),
        supabase.from('feedbacks').select('*', { count: 'exact', head: true }),
        supabase.from('performance_reviews').select('*', { count: 'exact', head: true }),
      ]);
      return {
        workspaces: workspacesRes.count || 0,
        members: membersRes.count || 0,
        feedbacks: feedbacksRes.count || 0,
        reviews: reviewsRes.count || 0,
      };
    },
  });

  const { data: paidCount } = useQuery({
    queryKey: ['admin-paid-subs'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'trialing']);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: leadsCount, isLoading: leadsLoading } = useQuery({
    queryKey: ['admin-waitlist-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('waitlist_leads')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.workspaces}</div>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => window.dispatchEvent(new CustomEvent('admin-tab-change', { detail: 'users' }))}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Usuários Auth</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.members}</div>
          <p className="text-xs text-muted-foreground mt-1">Gerenciar →</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Feedbacks</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.feedbacks}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reviews</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.reviews}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Assinaturas</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{paidCount ?? '...'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Leads</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{leadsLoading ? '...' : leadsCount}</div>
        </CardContent>
      </Card>
    </div>
  );
};
