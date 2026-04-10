import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building, Users, UserPlus, Plus, Edit, Trash2, Loader2, ChevronDown, ChevronRight,
  Crown, User,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkspaceRow {
  id: string;
  name: string;
  owner_id: string;
  is_active: boolean;
  plan_tier: string;
  created_at: string;
  hr_admin_ids: string[] | null;
}

interface TeamRow {
  id: string;
  name: string;
  workspace_id: string;
  leader_user_id: string | null;
  created_at: string;
}

interface MemberRow {
  id: string;
  name: string;
  email: string | null;
  role: string;
  team_id: string;
  linked_user_id: string | null;
}

export const AdminStructure = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set());
  const [expandedTeam, setExpandedTeam] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Dialogs
  const [wsDialog, setWsDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; data?: WorkspaceRow }>({ open: false, mode: 'create' });
  const [teamDialog, setTeamDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; workspaceId?: string; data?: TeamRow }>({ open: false, mode: 'create' });
  const [memberDialog, setMemberDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; teamId?: string; data?: MemberRow }>({ open: false, mode: 'create' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'workspace' | 'team' | 'member'; id: string; name: string } | null>(null);

  // Form state
  const [wsForm, setWsForm] = useState({ name: '', plan_tier: 'pulse', owner_id: '', hr_admin_id: '' });
  const [teamForm, setTeamForm] = useState({ name: '', leader_user_id: '' });
  const [memberForm, setMemberForm] = useState({ name: '', email: '', role: '', team_id: '' });

  // Data queries
  const { data: workspaces, isLoading: wsLoading } = useQuery({
    queryKey: ['admin-structure-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as WorkspaceRow[];
    },
  });

  const { data: teams } = useQuery({
    queryKey: ['admin-structure-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as TeamRow[];
    },
  });

  const { data: members } = useQuery({
    queryKey: ['admin-structure-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, email, role, team_id, linked_user_id')
        .order('name');
      if (error) throw error;
      return data as MemberRow[];
    },
  });

  const { data: allUsers } = useQuery({
    queryKey: ['admin-users-metadata'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users_with_metadata');
      if (error) throw error;
      return data;
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-structure-workspaces'] });
    queryClient.invalidateQueries({ queryKey: ['admin-structure-teams'] });
    queryClient.invalidateQueries({ queryKey: ['admin-structure-members'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  };

  const getUserEmail = (userId: string | null) => {
    if (!userId) return 'Sem líder';
    const user = allUsers?.find((u: any) => u.user_id === userId);
    return user?.full_name || user?.email || userId.slice(0, 8) + '...';
  };

  const teamsForWorkspace = (wsId: string) => teams?.filter(t => t.workspace_id === wsId) || [];
  const membersForTeam = (teamId: string) => members?.filter(m => m.team_id === teamId) || [];

  const toggleWs = (id: string) => {
    setExpandedWs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTeam = (id: string) => {
    setExpandedTeam(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // CRUD handlers
  const handleSaveWorkspace = async () => {
    setLoading(true);
    try {
      if (wsDialog.mode === 'create') {
        // Use the current admin user as owner
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Não autenticado');
        const { error } = await supabase.from('workspaces').insert({
          name: wsForm.name,
          plan_tier: wsForm.plan_tier,
          owner_id: user.id,
        });
        if (error) throw error;
        toast({ title: 'Workspace criado' });
      } else {
        const { error } = await supabase.from('workspaces')
          .update({ name: wsForm.name, plan_tier: wsForm.plan_tier })
          .eq('id', wsDialog.data!.id);
        if (error) throw error;
        toast({ title: 'Workspace atualizado' });
      }
      setWsDialog({ open: false, mode: 'create' });
      invalidateAll();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTeam = async () => {
    setLoading(true);
    try {
      if (teamDialog.mode === 'create') {
        const leaderUserId = teamForm.leader_user_id && teamForm.leader_user_id !== 'none' ? teamForm.leader_user_id : null;
        const { error } = await supabase.from('teams').insert({
          name: teamForm.name,
          workspace_id: teamDialog.workspaceId!,
          leader_user_id: leaderUserId,
        });
        if (error) throw error;
        toast({ title: 'Time criado' });
      } else {
        const { error } = await supabase.from('teams')
          .update({
            name: teamForm.name,
            leader_user_id: teamForm.leader_user_id && teamForm.leader_user_id !== 'none' ? teamForm.leader_user_id : null,
          })
          .eq('id', teamDialog.data!.id);
        if (error) throw error;
        toast({ title: 'Time atualizado' });
      }
      setTeamDialog({ open: false, mode: 'create' });
      invalidateAll();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMember = async () => {
    setLoading(true);
    try {
      if (memberDialog.mode === 'create') {
        const { error } = await supabase.from('team_members').insert({
          name: memberForm.name,
          email: memberForm.email || null,
          role: memberForm.role || 'Membro',
          team_id: memberDialog.teamId!,
        });
        if (error) throw error;
        toast({ title: 'Membro adicionado' });
      } else {
        const updates: any = {
          name: memberForm.name,
          email: memberForm.email || null,
          role: memberForm.role,
        };
        if (memberForm.team_id && memberForm.team_id !== memberDialog.data?.team_id) {
          updates.team_id = memberForm.team_id;
        }
        const { error } = await supabase.from('team_members')
          .update(updates)
          .eq('id', memberDialog.data!.id);
        if (error) throw error;
        toast({ title: 'Membro atualizado' });
      }
      setMemberDialog({ open: false, mode: 'create' });
      invalidateAll();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    setLoading(true);
    try {
      const table = deleteDialog.type === 'workspace' ? 'workspaces' : deleteDialog.type === 'team' ? 'teams' : 'team_members';
      const { error } = await supabase.from(table).delete().eq('id', deleteDialog.id);
      if (error) throw error;
      toast({ title: `${deleteDialog.type === 'workspace' ? 'Workspace' : deleteDialog.type === 'team' ? 'Time' : 'Membro'} excluído` });
      setDeleteDialog(null);
      invalidateAll();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openCreateWs = () => {
    setWsForm({ name: '', plan_tier: 'pulse' });
    setWsDialog({ open: true, mode: 'create' });
  };

  const openEditWs = (ws: WorkspaceRow) => {
    setWsForm({ name: ws.name, plan_tier: ws.plan_tier });
    setWsDialog({ open: true, mode: 'edit', data: ws });
  };

  const openCreateTeam = (wsId: string) => {
    setTeamForm({ name: '', leader_user_id: '' });
    setTeamDialog({ open: true, mode: 'create', workspaceId: wsId });
  };

  const openEditTeam = (team: TeamRow) => {
    setTeamForm({ name: team.name, leader_user_id: team.leader_user_id || '' });
    setTeamDialog({ open: true, mode: 'edit', data: team });
  };

  const openCreateMember = (teamId: string) => {
    setMemberForm({ name: '', email: '', role: '', team_id: '' });
    setMemberDialog({ open: true, mode: 'create', teamId });
  };

  const openEditMember = (member: MemberRow) => {
    setMemberForm({ name: member.name, email: member.email || '', role: member.role, team_id: member.team_id });
    setMemberDialog({ open: true, mode: 'edit', data: member });
  };

  const planColors: Record<string, string> = {
    pulse: 'bg-emerald-500/20 text-emerald-400',
    pro: 'bg-blue-500/20 text-blue-400',
    business: 'bg-violet-500/20 text-violet-400',
    enterprise: 'bg-amber-500/20 text-amber-400',
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estrutura da Plataforma</h1>
          <p className="text-muted-foreground">Gerencie workspaces, times, líderes e liderados</p>
        </div>
        <Button onClick={openCreateWs} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Workspace
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{workspaces?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Workspaces</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{new Set(teams?.map(t => t.leader_user_id).filter(Boolean)).size}</p>
                <p className="text-xs text-muted-foreground">Líderes únicos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{members?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Liderados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tree View */}
      {wsLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {workspaces?.map(ws => {
            const wsTeams = teamsForWorkspace(ws.id);
            const isExpanded = expandedWs.has(ws.id);
            const totalMembers = wsTeams.reduce((acc, t) => acc + membersForTeam(t.id).length, 0);

            return (
              <Card key={ws.id} className="overflow-hidden">
                {/* Workspace Row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => toggleWs(ws.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <Building className="h-4 w-4 text-primary" />
                  <span className="font-semibold flex-1">{ws.name}</span>
                  <Badge variant="outline" className={planColors[ws.plan_tier] || ''}>
                    {ws.plan_tier}
                  </Badge>
                  <Badge variant={ws.is_active ? 'default' : 'destructive'} className="text-xs">
                    {ws.is_active ? 'Ativo' : 'Suspenso'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{wsTeams.length} times · {totalMembers} membros</span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCreateTeam(ws.id)} title="Novo time">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditWs(ws)} title="Editar workspace">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteDialog({ open: true, type: 'workspace', id: ws.id, name: ws.name })} title="Excluir workspace">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Teams */}
                {isExpanded && (
                  <div className="border-t">
                    {wsTeams.length === 0 ? (
                      <div className="px-10 py-4 text-sm text-muted-foreground">Nenhum time neste workspace</div>
                    ) : (
                      wsTeams.map(team => {
                        const teamMembers = membersForTeam(team.id);
                        const isTeamExpanded = expandedTeam.has(team.id);

                        return (
                          <div key={team.id}>
                            <div
                              className="flex items-center gap-3 px-8 py-2.5 cursor-pointer hover:bg-accent/30 transition-colors border-b border-border/50"
                              onClick={() => toggleTeam(team.id)}
                            >
                              {isTeamExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium flex-1 text-sm">{team.name}</span>
                              <div className="flex items-center gap-2">
                                <Crown className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-xs text-muted-foreground">{getUserEmail(team.leader_user_id)}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{teamMembers.length} membros</span>
                              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openCreateMember(team.id)} title="Adicionar membro">
                                  <UserPlus className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditTeam(team)} title="Editar time">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteDialog({ open: true, type: 'team', id: team.id, name: team.name })} title="Excluir time">
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>

                            {/* Members */}
                            {isTeamExpanded && teamMembers.length > 0 && (
                              <div className="bg-accent/10">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-border/30">
                                      <TableHead className="pl-14 text-xs">Nome</TableHead>
                                      <TableHead className="text-xs">Email</TableHead>
                                      <TableHead className="text-xs">Cargo</TableHead>
                                      <TableHead className="text-xs">Vinculado</TableHead>
                                      <TableHead className="text-xs text-right">Ações</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {teamMembers.map(member => (
                                      <TableRow key={member.id} className="border-border/20">
                                        <TableCell className="pl-14 py-2">
                                          <div className="flex items-center gap-2">
                                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="text-sm font-medium">{member.name}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="py-2 text-sm text-muted-foreground">{member.email || '-'}</TableCell>
                                        <TableCell className="py-2">
                                          <Badge variant="outline" className="text-xs">{member.role}</Badge>
                                        </TableCell>
                                        <TableCell className="py-2">
                                          {member.linked_user_id ? (
                                            <Badge className="text-xs bg-emerald-500/20 text-emerald-600 border-0">Sim</Badge>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">Não</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="py-2 text-right">
                                          <div className="flex gap-1 justify-end">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditMember(member)}>
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteDialog({ open: true, type: 'member', id: member.id, name: member.name })}>
                                              <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Workspace Dialog */}
      <Dialog open={wsDialog.open} onOpenChange={open => setWsDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{wsDialog.mode === 'create' ? 'Novo Workspace' : 'Editar Workspace'}</DialogTitle>
            <DialogDescription>
              {wsDialog.mode === 'create' ? 'Crie um workspace para uma nova empresa' : 'Edite os dados do workspace'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={wsForm.name} onChange={e => setWsForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome da empresa" />
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={wsForm.plan_tier} onValueChange={v => setWsForm(p => ({ ...p, plan_tier: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pulse">Pulse</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveWorkspace} disabled={loading || !wsForm.name.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {wsDialog.mode === 'create' ? 'Criar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={teamDialog.open} onOpenChange={open => setTeamDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{teamDialog.mode === 'create' ? 'Novo Time' : 'Editar Time'}</DialogTitle>
            <DialogDescription>
              {teamDialog.mode === 'create' ? 'Crie um time e atribua um líder' : 'Edite o nome ou líder do time'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Time</Label>
              <Input value={teamForm.name} onChange={e => setTeamForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Engenharia" />
            </div>
            <div className="space-y-2">
              <Label>Líder (usuário cadastrado)</Label>
              <Select value={teamForm.leader_user_id} onValueChange={v => setTeamForm(p => ({ ...p, leader_user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar líder" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem líder</SelectItem>
                  {allUsers?.map((u: any) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.full_name || u.email} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveTeam} disabled={loading || !teamForm.name.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {teamDialog.mode === 'create' ? 'Criar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Dialog */}
      <Dialog open={memberDialog.open} onOpenChange={open => setMemberDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{memberDialog.mode === 'create' ? 'Adicionar Membro' : 'Editar Membro'}</DialogTitle>
            <DialogDescription>
              {memberDialog.mode === 'create' ? 'Adicione um liderado ao time' : 'Edite os dados do membro'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={memberForm.name} onChange={e => setMemberForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={memberForm.email} onChange={e => setMemberForm(p => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input value={memberForm.role} onChange={e => setMemberForm(p => ({ ...p, role: e.target.value }))} placeholder="Ex: Desenvolvedor" />
            </div>
            {memberDialog.mode === 'edit' && (
              <div className="space-y-2">
                <Label>Mover para time</Label>
                <Select value={memberForm.team_id} onValueChange={v => setMemberForm(p => ({ ...p, team_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Manter no time atual" /></SelectTrigger>
                  <SelectContent>
                    {teams?.map(t => {
                      const ws = workspaces?.find(w => w.id === t.workspace_id);
                      return (
                        <SelectItem key={t.id} value={t.id}>
                          {ws?.name} → {t.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveMember} disabled={loading || !memberForm.name.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {memberDialog.mode === 'create' ? 'Adicionar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={open => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleteDialog?.type === 'workspace' ? 'workspace' : deleteDialog?.type === 'team' ? 'time' : 'membro'}?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteDialog?.name}</strong> será excluído permanentemente.
              {deleteDialog?.type === 'workspace' && ' Todos os times e membros associados também serão removidos.'}
              {deleteDialog?.type === 'team' && ' Todos os membros deste time serão removidos.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
