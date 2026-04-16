import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Users, Power, PowerOff, Trash2, Loader2, Eye, Search, Building, Shield,
  Crown, User, Settings, KeyRound, Edit, ArrowRightLeft, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useImpersonation } from '@/hooks/useImpersonation';
import { CustomAvatar } from '@/components/avatar/CustomAvatar';
import { AVATAR_VARIANTS } from '@/components/avatar/avatarData';

interface CapEntry { id?: string; name?: string; team_id?: string; team_name?: string; workspace_name?: string; member_id?: string; member_name?: string; }

interface UserCap {
  user_id: string;
  email: string;
  full_name: string | null;
  owner_of: CapEntry[];
  hr_admin_of: CapEntry[];
  leader_of: CapEntry[];
  member_of: CapEntry[];
  is_super_admin: boolean;
}

type CapFilter = 'all' | 'owner' | 'hr_admin' | 'leader' | 'member' | 'super_admin';
type StatusFilter = 'all' | 'active' | 'suspended' | 'no_workspace';
type SortField = 'name' | 'email' | 'status';
type SortDirection = 'asc' | 'desc';

export const AdminUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [capFilter, setCapFilter] = useState<CapFilter>('all');
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);
  const { startImpersonation } = useImpersonation();

  // Edit member dialog
  const [editDialog, setEditDialog] = useState<{ open: boolean; type: 'workspace' | 'member' | null; data: any }>({
    open: false, type: null, data: null,
  });
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  // User caps
  const { data: userCaps, isLoading: capsLoading } = useQuery({
    queryKey: ['admin-user-caps'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_caps');
      if (error) throw error;
      return (data as any[]).map((u): UserCap => ({
        user_id: u.user_id,
        email: u.email,
        full_name: u.full_name,
        owner_of: u.owner_of || [],
        hr_admin_of: u.hr_admin_of || [],
        leader_of: u.leader_of || [],
        member_of: u.member_of || [],
        is_super_admin: u.is_super_admin,
      }));
    },
  });

  // Workspaces for status toggling
  const { data: workspaces, refetch: refetchWorkspaces } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase.from('workspaces').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // All teams for move member
  const { data: allTeams } = useQuery({
    queryKey: ['admin-all-teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('id, name, workspace_id, workspaces(name, owner_id)').order('name');
      if (error) throw error;
      return data;
    },
  });

  const workspaceStatusByOwner = useMemo(() => {
    const m: Record<string, { is_active: boolean; workspace_id: string }> = {};
    workspaces?.forEach(ws => { m[ws.owner_id] = { is_active: ws.is_active, workspace_id: ws.id }; });
    return m;
  }, [workspaces]);

  const filteredUsers = useMemo(() => {
    if (!userCaps) return [];
    return userCaps.filter(u => {
      if (search) {
        const q = search.toLowerCase();
        if (!u.email.toLowerCase().includes(q) && !(u.full_name || '').toLowerCase().includes(q)) return false;
      }
      if (capFilter === 'owner') return u.owner_of.length > 0;
      if (capFilter === 'hr_admin') return u.hr_admin_of.length > 0;
      if (capFilter === 'leader') return u.leader_of.length > 0;
      if (capFilter === 'member') return u.member_of.length > 0;
      if (capFilter === 'super_admin') return u.is_super_admin;
      return true;
    });
  }, [userCaps, search, capFilter]);

  const toggleWorkspaceStatus = async (workspaceId: string, currentStatus: boolean) => {
    setTogglingId(workspaceId);
    try {
      const { error } = await supabase.from('workspaces').update({ is_active: !currentStatus }).eq('id', workspaceId);
      if (error) throw error;
      toast({ title: currentStatus ? "Workspace Suspenso" : "Workspace Ativado" });
      refetchWorkspaces();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingId(userId);
    try {
      const { error } = await supabase.functions.invoke('admin-delete-user', { body: { user_id: userId } });
      if (error) throw error;
      toast({ title: "Usuário excluído" });
      queryClient.invalidateQueries({ queryKey: ['admin-user-caps'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handlePasswordReset = async (email: string) => {
    setResettingEmail(email);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', { body: { email } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Reset enviado", description: `Link enviado para ${email}.` });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setResettingEmail(null);
    }
  };

  const handleSaveEdit = async () => {
    setEditLoading(true);
    try {
      if (editDialog.type === 'workspace') {
        const { error } = await supabase.from('workspaces').update({ name: editForm.name }).eq('id', editForm.id);
        if (error) throw error;
      } else if (editDialog.type === 'member') {
        const updateData: any = { name: editForm.name, email: editForm.email, role: editForm.role };
        if (editForm.team_id && editForm.team_id !== editDialog.data?.team_id) updateData.team_id = editForm.team_id;
        const { error } = await supabase.from('team_members').update(updateData).eq('id', editForm.id);
        if (error) throw error;
      }
      toast({ title: "Alterações salvas" });
      setEditDialog({ open: false, type: null, data: null });
      queryClient.invalidateQueries({ queryKey: ['admin-user-caps'] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return email.slice(0, 2).toUpperCase();
  };

  // Get a deterministic avatar for a user
  const getUserAvatar = (userId: string) => {
    const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_VARIANTS[hash % AVATAR_VARIANTS.length];
  };

  const teamsByWorkspace = allTeams?.reduce((acc: Record<string, { wsName: string; teams: typeof allTeams }>, team: any) => {
    const wsId = team.workspace_id;
    const wsName = team.workspaces?.name || 'Desconhecido';
    if (!acc[wsId]) acc[wsId] = { wsName, teams: [] };
    acc[wsId].teams.push(team);
    return acc;
  }, {} as Record<string, any>) || {};

  const renderCapBadges = (user: UserCap) => {
    const badges: JSX.Element[] = [];
    if (user.is_super_admin)
      badges.push(<Badge key="sa" variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30"><Settings className="h-2.5 w-2.5" /> Super Admin</Badge>);
    user.owner_of.forEach((ws, i) =>
      badges.push(<Badge key={`o-${i}`} variant="outline" className="text-[10px] gap-1 bg-violet-500/10 text-violet-600 border-violet-500/30"><Building className="h-2.5 w-2.5" /> Owner @ {ws.name}</Badge>));
    user.hr_admin_of.forEach((ws, i) =>
      badges.push(<Badge key={`hr-${i}`} variant="outline" className="text-[10px] gap-1 bg-blue-500/10 text-blue-600 border-blue-500/30"><Shield className="h-2.5 w-2.5" /> HR @ {ws.name}</Badge>));
    user.leader_of.forEach((t, i) =>
      badges.push(<Badge key={`l-${i}`} variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30"><Crown className="h-2.5 w-2.5" /> Líder @ {t.workspace_name}</Badge>));
    user.member_of.forEach((m, i) =>
      badges.push(<Badge key={`m-${i}`} variant="outline" className="text-[10px] gap-1 bg-sky-500/10 text-sky-600 border-sky-500/30"><User className="h-2.5 w-2.5" /> Liderado @ {m.workspace_name}</Badge>));
    return badges.length > 0 ? badges : <span className="text-xs text-muted-foreground italic">Sem papel</span>;
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">Gerencie todos os usuários, papéis e ações de suporte</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={capFilter} onValueChange={v => setCapFilter(v as CapFilter)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por papel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os papéis</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="owner">Owners</SelectItem>
            <SelectItem value="hr_admin">HR Admins</SelectItem>
            <SelectItem value="leader">Líderes</SelectItem>
            <SelectItem value="member">Liderados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Usuários Cadastrados</CardTitle>
          <CardDescription>{filteredUsers.length} de {userCaps?.length || 0} usuários</CardDescription>
        </CardHeader>
        <CardContent>
          {capsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Papéis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const wsInfo = workspaceStatusByOwner[user.user_id];
                  const avatarVariant = getUserAvatar(user.user_id);
                  return (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <CustomAvatar variant={avatarVariant} size={32} className="shrink-0" />
                          <div>
                            <p className="font-medium">{user.full_name || <span className="text-muted-foreground italic">Sem nome</span>}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-md">{renderCapBadges(user)}</div>
                      </TableCell>
                      <TableCell>
                        {wsInfo ? (
                          <Badge variant={wsInfo.is_active ? "default" : "destructive"}>{wsInfo.is_active ? "Ativo" : "Suspenso"}</Badge>
                        ) : (
                          <Badge variant="outline">Sem workspace</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startImpersonation(user.user_id, user.email)} title="Impersonar">
                            <Eye className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handlePasswordReset(user.email)} disabled={resettingEmail === user.email} title="Reset senha">
                            {resettingEmail === user.email ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                          </Button>
                          {wsInfo && (
                            <Button variant="ghost" size="icon" onClick={() => toggleWorkspaceStatus(wsInfo.workspace_id, wsInfo.is_active)} disabled={togglingId === wsInfo.workspace_id} title={wsInfo.is_active ? "Suspender" : "Ativar"}>
                              {togglingId === wsInfo.workspace_id ? <Loader2 className="h-4 w-4 animate-spin" /> : wsInfo.is_active ? <PowerOff className="h-4 w-4 text-destructive" /> : <Power className="h-4 w-4 text-primary" />}
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={deletingId === user.user_id} title="Excluir">
                                {deletingId === user.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir usuário permanentemente?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação remove a conta, workspaces, times, feedbacks e avaliações de <strong>{user.full_name || user.email}</strong>.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar {editDialog.type === 'workspace' ? 'Workspace' : 'Membro'}</DialogTitle>
            <DialogDescription>
              {editDialog.type === 'member' ? 'Edite os dados ou mova para outro time.' : 'Faça as alterações necessárias'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editDialog.type === 'workspace' && (
              <div>
                <Label>Nome</Label>
                <Input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
            )}
            {editDialog.type === 'member' && (
              <>
                <div><Label>Nome</Label><Input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
                <div><Label>Cargo</Label><Input value={editForm.role || ''} onChange={e => setEditForm({ ...editForm, role: e.target.value })} /></div>
                <div>
                  <Label className="flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Mover para Time</Label>
                  <Select value={editForm.team_id || ''} onValueChange={v => setEditForm({ ...editForm, team_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um time" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(teamsByWorkspace).map(([wsId, ws]: [string, any]) => (
                        <div key={wsId}>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{ws.wsName}</div>
                          {ws.teams.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, type: null, data: null })}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={editLoading}>
              {editLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
