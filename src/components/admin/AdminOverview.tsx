import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Building, MessageSquare, FileText, Power, PowerOff, Loader2, Mail, ClipboardList, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import type { PlanTier } from '@/types/team';

export const AdminOverview = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);
  const [invitingEmail, setInvitingEmail] = useState<string | null>(null);
  
  // Dialog state for invite with plan selection
  const [inviteDialog, setInviteDialog] = useState<{
    open: boolean;
    email: string;
    name: string | null;
    plan: PlanTier;
    isResend: boolean;
  }>({
    open: false,
    email: '',
    name: null,
    plan: 'pulse',
    isResend: false,
  });

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

  // Waitlist leads query
  const { data: leads, isLoading: leadsLoading, refetch: refetchLeads } = useQuery({
    queryKey: ['admin-waitlist-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waitlist_leads')
        .select('*')
        .order('created_at', { ascending: false });
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

  // Map workspace info by owner
  const workspaceInfoByOwner = useMemo(() => {
    const infoMap: Record<string, { is_active: boolean; workspace_id: string; plan_tier: PlanTier }> = {};
    workspaces?.forEach((ws: any) => {
      infoMap[ws.owner_id] = { 
        is_active: ws.is_active, 
        workspace_id: ws.id,
        plan_tier: ws.plan_tier || 'pulse'
      };
    });
    return infoMap;
  }, [workspaces]);

  const updateWorkspacePlan = async (workspaceId: string, newPlan: PlanTier) => {
    setUpdatingPlanId(workspaceId);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ plan_tier: newPlan })
        .eq('id', workspaceId);

      if (error) throw error;

      const planNames: Record<PlanTier, string> = {
        pulse: '🎵 Pulse',
        pro: '💼 Pro',
        business: '🏢 Business'
      };

      toast({
        title: "Plano atualizado!",
        description: `Workspace alterado para ${planNames[newPlan]}`,
      });

      refetch();
      // Invalidar caches globais
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-plan'] });
    } catch (error: any) {
      console.error('Error updating plan:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingPlanId(null);
    }
  };

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

  const openInviteDialog = (email: string, name: string | null, isResend: boolean) => {
    setInviteDialog({
      open: true,
      email,
      name,
      plan: 'pulse',
      isResend,
    });
  };

  const confirmInvite = async () => {
    const { email, name, plan } = inviteDialog;
    setInvitingEmail(email);
    setInviteDialog(prev => ({ ...prev, open: false }));
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-invite-user', {
        body: { email, name, assigned_plan: plan }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      const planNames: Record<PlanTier, string> = {
        pulse: 'Pulse',
        pro: 'Pro',
        business: 'Business'
      };
      
      toast({ 
        title: "Convite enviado!", 
        description: `${email} receberá o link de acesso com plano ${planNames[plan]}.` 
      });
      refetchLeads();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast({ 
        title: "Erro ao convidar", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setInvitingEmail(null);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
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

      {/* Waitlist Leads Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Lista de Espera
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : leads && leads.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Team Size</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead: any) => (
                  <TableRow key={lead.email}>
                    <TableCell className="font-medium">
                      {lead.name || <span className="text-muted-foreground italic">-</span>}
                    </TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>
                      {lead.phone || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {lead.team_size ? (
                        <Badge variant="outline">{lead.team_size}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(lead.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={lead.status === 'invited' ? 'default' : 'secondary'}>
                        {lead.status === 'invited' ? 'Convidado' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant={lead.status === 'invited' ? 'outline' : 'default'}
                        onClick={() => openInviteDialog(lead.email, lead.name, lead.status === 'invited')}
                        disabled={invitingEmail === lead.email}
                      >
                        {invitingEmail === lead.email ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : lead.status === 'invited' ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reenviar
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            Aprovar & Convidar
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lead na lista de espera
            </div>
          )}
        </CardContent>
      </Card>

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
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user: any) => {
                  const wsInfo = workspaceInfoByOwner[user.user_id];
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
                          <Select
                            value={wsInfo.plan_tier}
                            onValueChange={(value) => updateWorkspacePlan(wsInfo.workspace_id, value as PlanTier)}
                            disabled={updatingPlanId === wsInfo.workspace_id}
                          >
                            <SelectTrigger className="w-[130px]">
                              {updatingPlanId === wsInfo.workspace_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pulse">
                                <span className="flex items-center gap-2">🎵 Pulse</span>
                              </SelectItem>
                              <SelectItem value="pro">
                                <span className="flex items-center gap-2">💼 Pro</span>
                              </SelectItem>
                              <SelectItem value="business">
                                <span className="flex items-center gap-2">🏢 Business</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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

      {/* Invite Dialog with Plan Selection */}
      <Dialog open={inviteDialog.open} onOpenChange={(open) => setInviteDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {inviteDialog.isResend ? 'Reenviar Convite' : 'Aprovar Acesso'}
            </DialogTitle>
            <DialogDescription>
              {inviteDialog.isResend 
                ? `Reenviar convite para ${inviteDialog.email}`
                : 'Selecione o plano inicial para este usuário.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plano Inicial</Label>
              <Select
                value={inviteDialog.plan}
                onValueChange={(value) => setInviteDialog(prev => ({ ...prev, plan: value as PlanTier }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pulse">
                    <span className="flex items-center gap-2">🎵 Pulse (Gratuito)</span>
                  </SelectItem>
                  <SelectItem value="pro">
                    <span className="flex items-center gap-2">💼 Pro</span>
                  </SelectItem>
                  <SelectItem value="business">
                    <span className="flex items-center gap-2">🏢 Business</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog(prev => ({ ...prev, open: false }))}>
              Cancelar
            </Button>
            <Button onClick={confirmInvite}>
              <Mail className="h-4 w-4 mr-2" />
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
