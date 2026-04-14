import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Users, Building, MessageSquare, FileText, Loader2, Mail, ClipboardList,
  RefreshCw, AlertTriangle, Activity, CreditCard,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import type { PlanTier } from '@/types/team';

export const AdminOverview = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [invitingEmail, setInvitingEmail] = useState<string | null>(null);
  const [inviteDialog, setInviteDialog] = useState<{
    open: boolean; email: string; name: string | null; plan: PlanTier; isResend: boolean;
  }>({ open: false, email: '', name: null, plan: 'pulse', isResend: false });

  // Stats query
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

  // Paid subscriptions count
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

  // Waitlist leads
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

  // Recent activity — last 10 feedbacks
  const { data: recentFeedbacks } = useQuery({
    queryKey: ['admin-recent-feedbacks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('id, created_at, type, member_id, team_members(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Alerts — workspaces with no feedbacks in 30 days
  const { data: alerts } = useQuery({
    queryKey: ['admin-alerts'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // Get all active workspaces
      const { data: allWs } = await supabase
        .from('workspaces')
        .select('id, name, owner_id')
        .eq('is_active', true);

      // Get workspaces with recent feedbacks
      const { data: activeFeedbackWs } = await supabase
        .from('feedbacks')
        .select('member_id, team_members(team_id, teams(workspace_id))')
        .gte('created_at', thirtyDaysAgo);

      const activeWsIds = new Set<string>();
      activeFeedbackWs?.forEach((f: any) => {
        const wsId = f.team_members?.teams?.workspace_id;
        if (wsId) activeWsIds.add(wsId);
      });

      const inactiveWs = allWs?.filter(ws => !activeWsIds.has(ws.id)) || [];

      return { inactiveWorkspaces: inactiveWs.length };
    },
  });

  const openInviteDialog = (email: string, name: string | null, isResend: boolean) => {
    setInviteDialog({ open: true, email, name, plan: 'pulse', isResend });
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
      const planNames: Record<PlanTier, string> = { pulse: 'Pulse', pro: 'Pro', business: 'Business' };
      toast({ title: "Convite enviado!", description: `${email} receberá o link com plano ${planNames[plan]}.` });
      refetchLeads();
    } catch (error: any) {
      toast({ title: "Erro ao convidar", description: error.message, variant: "destructive" });
    } finally {
      setInvitingEmail(null);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground">Visão geral e alertas do sistema</p>
      </div>

      {/* Big Numbers */}
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

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => window.dispatchEvent(new CustomEvent('admin-tab-change', { detail: 'users' }))}>
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
            <div className="text-2xl font-bold">{leadsLoading ? '...' : leads?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts && alerts.inactiveWorkspaces > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                {alerts.inactiveWorkspaces} workspace{alerts.inactiveWorkspaces > 1 ? 's' : ''} sem atividade há 30+ dias
              </p>
              <p className="text-sm text-muted-foreground">
                Verifique na aba Inteligência para detalhes
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => window.dispatchEvent(new CustomEvent('admin-tab-change', { detail: 'intelligence' }))}
            >
              Ver detalhes
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentFeedbacks && recentFeedbacks.length > 0 ? (
            <div className="space-y-3">
              {recentFeedbacks.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50">
                  <div className="flex items-center gap-3">
                    <Badge variant={f.type === 'positive' ? 'default' : f.type === 'constructive' ? 'secondary' : 'outline'} className="text-xs">
                      {f.type}
                    </Badge>
                    <span className="text-sm font-medium">{f.team_members?.name || 'Membro'}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(f.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Nenhuma atividade recente</p>
          )}
        </CardContent>
      </Card>

      {/* Waitlist */}
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
                    <TableCell>{lead.phone || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>
                      {lead.team_size ? <Badge variant="outline">{lead.team_size}</Badge> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(lead.created_at)}</TableCell>
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
                          <><RefreshCw className="h-4 w-4 mr-2" />Reenviar</>
                        ) : (
                          <><Mail className="h-4 w-4 mr-2" />Aprovar & Convidar</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Nenhum lead na lista de espera</div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialog.open} onOpenChange={(open) => setInviteDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{inviteDialog.isResend ? 'Reenviar Convite' : 'Aprovar Acesso'}</DialogTitle>
            <DialogDescription>
              {inviteDialog.isResend ? `Reenviar convite para ${inviteDialog.email}` : 'Selecione o plano inicial.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plano Inicial</Label>
              <Select value={inviteDialog.plan} onValueChange={(v) => setInviteDialog(prev => ({ ...prev, plan: v as PlanTier }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pulse">🎵 Pulse (Gratuito)</SelectItem>
                  <SelectItem value="pro">💼 Pro</SelectItem>
                  <SelectItem value="business">🏢 Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog(prev => ({ ...prev, open: false }))}>Cancelar</Button>
            <Button onClick={confirmInvite}><Mail className="h-4 w-4 mr-2" />Enviar Convite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
