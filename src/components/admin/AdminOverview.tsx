import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Building, MessageSquare, FileText, Power, PowerOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';

export const AdminOverview = () => {
  const { toast } = useToast();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Stats query
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [workspacesRes, membersRes, feedbacksRes, reviewsRes] = await Promise.all([
        supabase.from('workspaces').select('*', { count: 'exact', head: true }),
        supabase.from('team_members').select('*', { count: 'exact', head: true }),
        supabase.from('feedbacks').select('*', { count: 'exact', head: true }),
        supabase.from('performance_reviews').select('*', { count: 'exact', head: true })
      ]);

      return {
        workspaces: workspacesRes.count || 0,
        members: membersRes.count || 0,
        feedbacks: feedbacksRes.count || 0,
        reviews: reviewsRes.count || 0,
      };
    },
  });

  // Users with metadata query
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-metadata'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users_with_metadata');
      if (error) throw error;
      return data;
    },
  });

  // Workspaces query
  const { data: workspaces, isLoading: workspacesLoading, refetch } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Member counts per owner
  const { data: memberCounts } = useQuery({
    queryKey: ['admin-member-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          owner_id,
          teams (
            team_members (id)
          )
        `);
      
      if (error) throw error;

      // Aggregate counts by owner_id
      const counts: Record<string, number> = {};
      data?.forEach((workspace: any) => {
        const ownerId = workspace.owner_id;
        const memberCount = workspace.teams?.reduce((acc: number, team: any) => {
          return acc + (team.team_members?.length || 0);
        }, 0) || 0;
        
        counts[ownerId] = (counts[ownerId] || 0) + memberCount;
      });

      return counts;
    },
  });

  // Map workspace status by owner
  const workspaceStatusByOwner = useMemo(() => {
    const statusMap: Record<string, { is_active: boolean; workspace_id: string }> = {};
    workspaces?.forEach((ws) => {
      statusMap[ws.owner_id] = { is_active: ws.is_active, workspace_id: ws.id };
    });
    return statusMap;
  }, [workspaces]);

  const toggleWorkspaceStatus = async (workspaceId: string, currentStatus: boolean) => {
    setTogglingId(workspaceId);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ is_active: !currentStatus })
        .eq('id', workspaceId);

      if (error) throw error;

      toast({
        title: currentStatus ? "Workspace Suspenso" : "Workspace Ativado",
        description: currentStatus 
          ? "O acesso foi bloqueado para este workspace."
          : "O acesso foi restaurado para este workspace.",
      });

      refetch();
    } catch (error: any) {
      console.error('Error toggling workspace:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Compare declared vs real team size
  const getTeamSizeComparison = (declared: string | null, real: number) => {
    if (!declared) return null;
    
    const declaredMap: Record<string, number> = {
      '1-5': 5,
      '6-10': 10,
      '11-30': 30,
      '30+': 100,
    };
    
    const maxDeclared = declaredMap[declared] || 0;
    
    if (real >= maxDeclared * 0.5) {
      return 'ok';
    }
    return 'warning';
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
        <p className="text-muted-foreground">Visão geral do sistema</p>
      </div>

      {/* Big Numbers - Clickable Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.workspaces}
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => window.dispatchEvent(new CustomEvent('admin-tab-change', { detail: 'users' }))}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.members}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Clique para gerenciar →</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feedbacks</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.feedbacks}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.reviews}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table with Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Time Declarado</TableHead>
                  <TableHead>Liderados Reais</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user: any) => {
                  const wsInfo = workspaceStatusByOwner[user.user_id];
                  const realCount = memberCounts?.[user.user_id] || 0;
                  const comparison = getTeamSizeComparison(user.team_size, realCount);
                  
                  return (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.full_name || <span className="text-muted-foreground italic">-</span>}
                      </TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>
                        {user.job_title || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {user.phone || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {user.team_size ? (
                          <Badge variant="outline">{user.team_size}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{realCount}</span>
                          {comparison === 'ok' && (
                            <Badge variant="default" className="text-xs">✓</Badge>
                          )}
                          {comparison === 'warning' && (
                            <Badge variant="secondary" className="text-xs">⚠️</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {wsInfo ? (
                          <Badge variant={wsInfo.is_active ? "default" : "destructive"}>
                            {wsInfo.is_active ? "Ativo" : "Suspenso"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Sem workspace</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {wsInfo && (
                          <Button
                            variant={wsInfo.is_active ? "destructive" : "default"}
                            size="sm"
                            onClick={() => toggleWorkspaceStatus(wsInfo.workspace_id, wsInfo.is_active)}
                            disabled={togglingId === wsInfo.workspace_id}
                          >
                            {togglingId === wsInfo.workspace_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : wsInfo.is_active ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                Suspender
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                Ativar
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
