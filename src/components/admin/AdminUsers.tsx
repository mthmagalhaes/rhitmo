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
  Crown, User, Settings, KeyRound, Edit, ArrowUpDown, ArrowUp, ArrowDown,
  Copy, Download, Hash, UserPlus, Mail,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useImpersonation } from '@/hooks/useImpersonation';
import { CustomAvatar } from '@/components/avatar/CustomAvatar';
import { AVATAR_VARIANTS } from '@/components/avatar/avatarData';
import type { PlanTier } from '@/types/team';

interface CapEntry { id?: string; name?: string; team_id?: string; team_name?: string; workspace_name?: string; workspace_id?: string; member_id?: string; member_name?: string; }

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

interface WorkspaceRow {
  id: string;
  name: string;
  owner_id: string;
  is_active: boolean;
  client_account: string | null;
  customer_segment: string | null;
}

type CapFilter = 'all' | 'owner' | 'hr_admin' | 'leader' | 'member' | 'super_admin';
type StatusFilter = 'all' | 'active' | 'suspended' | 'no_workspace';
type SegmentFilter = 'all' | 'beta' | 'paid' | 'trial' | 'internal' | 'test';
type SortField = 'name' | 'email' | 'status';
type SortDirection = 'asc' | 'desc';

const SEGMENT_LABELS: Record<string, string> = {
  beta: 'Beta',
  paid: 'Pago',
  trial: 'Trial',
  internal: 'Interno',
  test: 'Teste',
};

const SEGMENT_STYLES: Record<string, string> = {
  beta: 'bg-violet-500/10 text-violet-600 border-violet-500/30',
  paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  trial: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  internal: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  test: 'bg-pink-500/10 text-pink-600 border-pink-500/30',
};

export const AdminUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [capFilter, setCapFilter] = useState<CapFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('all');
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);
  const { startImpersonation } = useImpersonation();

  // Edit user dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    user_id: string; full_name: string; email: string;
    workspace_id: string | null; client_account: string; customer_segment: string;
  }>({ user_id: '', full_name: '', email: '', workspace_id: null, client_account: '', customer_segment: 'beta' });
  const [editLoading, setEditLoading] = useState(false);

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

  const { data: workspaces, refetch: refetchWorkspaces } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, owner_id, is_active, client_account, customer_segment')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WorkspaceRow[];
    },
  });

  const workspaceById = useMemo(() => {
    const m: Record<string, WorkspaceRow> = {};
    workspaces?.forEach(ws => { m[ws.id] = ws; });
    return m;
  }, [workspaces]);

  // Status helper: a user is "active" if their primary workspace (any link:
  // owner / hr / leader / member) is active. Only "no_workspace" if they
  // have zero links to any known workspace.
  const getUserWorkspaceStatus = (user: UserCap): { is_active: boolean; workspace_id: string } | null => {
    const ws = getPrimaryWorkspace(user);
    if (!ws) return null;
    return { is_active: ws.is_active, workspace_id: ws.id };
  };

  // Resolve a user's primary workspace (owner > hr_admin > leader > member)
  const getPrimaryWorkspace = (user: UserCap): WorkspaceRow | null => {
    const candidates: (string | undefined)[] = [
      ...user.owner_of.map((w: any) => w.id),
      ...user.hr_admin_of.map((w: any) => w.id),
      ...user.leader_of.map((t: any) => t.workspace_id),
      ...user.member_of.map((m: any) => m.workspace_id),
    ];
    for (const id of candidates) {
      if (id && workspaceById[id]) return workspaceById[id];
    }
    // fallback: try by name
    const wsName = user.owner_of[0]?.name || user.hr_admin_of[0]?.name
      || user.leader_of[0]?.workspace_name || user.member_of[0]?.workspace_name;
    if (wsName && workspaces) {
      return workspaces.find(w => w.name === wsName) || null;
    }
    return null;
  };

  // Aggregate distinct workspaces a user touches (with role label)
  const getUserWorkspaces = (user: UserCap): { id: string; name: string; role: string }[] => {
    const map = new Map<string, { id: string; name: string; role: string }>();
    const add = (id: string | undefined, name: string | undefined, role: string) => {
      if (!id || !name) return;
      if (!map.has(id)) map.set(id, { id, name, role });
    };
    user.owner_of.forEach((w: any) => add(w.id, w.name, 'Owner'));
    user.hr_admin_of.forEach((w: any) => add(w.id, w.name, 'HR'));
    user.leader_of.forEach((t: any) => add(t.workspace_id, t.workspace_name, 'Líder'));
    user.member_of.forEach((m: any) => add(m.workspace_id, m.workspace_name, 'Liderado'));
    return Array.from(map.values());
  };

  const filteredUsers = useMemo(() => {
    if (!userCaps) return [];
    let list = userCaps.filter(u => {
      const primaryWs = getPrimaryWorkspace(u);
      const userWss = getUserWorkspaces(u);

      if (search) {
        const q = search.toLowerCase();
        const haystack = [
          u.email, u.full_name || '', u.user_id,
          primaryWs?.client_account || '',
          ...userWss.map(w => w.name),
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (capFilter === 'owner' && u.owner_of.length === 0) return false;
      if (capFilter === 'hr_admin' && u.hr_admin_of.length === 0) return false;
      if (capFilter === 'leader' && u.leader_of.length === 0) return false;
      if (capFilter === 'member' && u.member_of.length === 0) return false;
      if (capFilter === 'super_admin' && !u.is_super_admin) return false;

      if (statusFilter !== 'all') {
        const wsInfo = getUserWorkspaceStatus(u);
        if (statusFilter === 'no_workspace' && wsInfo) return false;
        if (statusFilter === 'active' && (!wsInfo || !wsInfo.is_active)) return false;
        if (statusFilter === 'suspended' && (!wsInfo || wsInfo.is_active)) return false;
      }

      if (workspaceFilter !== 'all') {
        if (!userWss.some(w => w.id === workspaceFilter)) return false;
      }

      if (segmentFilter !== 'all') {
        if (primaryWs?.customer_segment !== segmentFilter) return false;
      }

      return true;
    });

    const dir = sortDirection === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (sortField === 'name') return (a.full_name || a.email).localeCompare(b.full_name || b.email) * dir;
      if (sortField === 'email') return a.email.localeCompare(b.email) * dir;
      const wsA = getUserWorkspaceStatus(a);
      const wsB = getUserWorkspaceStatus(b);
      const rank = (ws?: { is_active: boolean } | null) => !ws ? 2 : ws.is_active ? 0 : 1;
      return (rank(wsA) - rank(wsB)) * dir;
    });
    return list;
  }, [userCaps, search, capFilter, statusFilter, workspaceFilter, segmentFilter, sortField, sortDirection, workspaceById]);

  // Segment counters across ALL users (not filtered)
  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = { beta: 0, paid: 0, trial: 0, internal: 0, test: 0 };
    userCaps?.forEach(u => {
      const ws = getPrimaryWorkspace(u);
      const seg = ws?.customer_segment;
      if (seg && counts[seg] !== undefined) counts[seg]++;
    });
    return counts;
  }, [userCaps, workspaceById]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-40" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 inline" />
      : <ArrowDown className="h-3 w-3 ml-1 inline" />;
  };

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

  const openEdit = (user: UserCap) => {
    const primaryWs = getPrimaryWorkspace(user);
    setEditForm({
      user_id: user.user_id,
      full_name: user.full_name || '',
      email: user.email,
      workspace_id: primaryWs?.id || null,
      client_account: primaryWs?.client_account || '',
      customer_segment: primaryWs?.customer_segment || 'beta',
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    setEditLoading(true);
    try {
      // 1. Update auth user (name/email) if changed
      const original = userCaps?.find(u => u.user_id === editForm.user_id);
      const nameChanged = (original?.full_name || '') !== editForm.full_name;
      const emailChanged = original?.email !== editForm.email;
      if (nameChanged || emailChanged) {
        const payload: any = { user_id: editForm.user_id };
        if (nameChanged) payload.full_name = editForm.full_name;
        if (emailChanged) payload.email = editForm.email;
        const { data, error } = await supabase.functions.invoke('admin-update-user', { body: payload });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }

      // 2. Update workspace client_account / customer_segment
      if (editForm.workspace_id) {
        const { error } = await supabase.from('workspaces')
          .update({
            client_account: editForm.client_account || null,
            customer_segment: editForm.customer_segment,
          })
          .eq('id', editForm.workspace_id);
        if (error) throw error;
      }

      toast({ title: "Alterações salvas" });
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-user-caps'] });
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado`, description: text });
  };

  const exportCSV = () => {
    const rows = filteredUsers.map(u => {
      const ws = getPrimaryWorkspace(u);
      const allWss = getUserWorkspaces(u).map(w => `${w.name} (${w.role})`).join(' | ');
      const wsInfo = getUserWorkspaceStatus(u);
      const status = !wsInfo ? 'Sem workspace' : wsInfo.is_active ? 'Ativo' : 'Suspenso';
      const roles: string[] = [];
      if (u.is_super_admin) roles.push('Super Admin');
      if (u.owner_of.length) roles.push('Owner');
      if (u.hr_admin_of.length) roles.push('HR Admin');
      if (u.leader_of.length) roles.push('Líder');
      if (u.member_of.length) roles.push('Liderado');
      return {
        user_id: u.user_id,
        nome: u.full_name || '',
        email: u.email,
        workspaces: allWss,
        cliente: ws?.client_account || '',
        segmento: ws ? (SEGMENT_LABELS[ws.customer_segment || 'beta'] || ws.customer_segment) : '',
        papeis: roles.join(' | '),
        status,
      };
    });
    if (rows.length === 0) {
      toast({ title: "Nada para exportar", variant: "destructive" });
      return;
    }
    const headers = Object.keys(rows[0]);
    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => escape((r as any)[h])).join(',')),
    ].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rhitmo-usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportado", description: `${rows.length} usuários` });
  };

  const getUserAvatar = (userId: string) => {
    const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_VARIANTS[hash % AVATAR_VARIANTS.length];
  };

  const renderCapBadges = (user: UserCap) => {
    const badges: JSX.Element[] = [];
    if (user.is_super_admin)
      badges.push(<Badge key="sa" variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30"><Settings className="h-2.5 w-2.5" /> Super Admin</Badge>);
    if (user.owner_of.length)
      badges.push(<Badge key="o" variant="outline" className="text-[10px] gap-1 bg-violet-500/10 text-violet-600 border-violet-500/30"><Building className="h-2.5 w-2.5" /> Owner ({user.owner_of.length})</Badge>);
    if (user.hr_admin_of.length)
      badges.push(<Badge key="hr" variant="outline" className="text-[10px] gap-1 bg-blue-500/10 text-blue-600 border-blue-500/30"><Shield className="h-2.5 w-2.5" /> HR ({user.hr_admin_of.length})</Badge>);
    if (user.leader_of.length)
      badges.push(<Badge key="l" variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30"><Crown className="h-2.5 w-2.5" /> Líder ({user.leader_of.length})</Badge>);
    if (user.member_of.length)
      badges.push(<Badge key="m" variant="outline" className="text-[10px] gap-1 bg-sky-500/10 text-sky-600 border-sky-500/30"><User className="h-2.5 w-2.5" /> Liderado ({user.member_of.length})</Badge>);
    return badges.length > 0 ? badges : <span className="text-xs text-muted-foreground italic">Sem papel</span>;
  };

  const allWorkspaces = workspaces || [];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">Gestão completa de usuários, workspaces e clientes</p>
      </div>

      {/* Segment counters */}
      <div className="flex flex-wrap items-center gap-2">
        {(['beta', 'paid', 'trial', 'internal', 'test'] as const).map(seg => (
          <button
            key={seg}
            onClick={() => setSegmentFilter(segmentFilter === seg ? 'all' : seg)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${SEGMENT_STYLES[seg]} ${segmentFilter === seg ? 'ring-2 ring-offset-1 ring-primary/40' : 'opacity-80 hover:opacity-100'}`}
          >
            {SEGMENT_LABELS[seg]}: {segmentCounts[seg]}
          </button>
        ))}
        {segmentFilter !== 'all' && (
          <button onClick={() => setSegmentFilter('all')} className="text-xs text-muted-foreground underline">limpar</button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nome, email, ID, cliente, workspace..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={capFilter} onValueChange={v => setCapFilter(v as CapFilter)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Papel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os papéis</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="owner">Owners</SelectItem>
            <SelectItem value="hr_admin">HR Admins</SelectItem>
            <SelectItem value="leader">Líderes</SelectItem>
            <SelectItem value="member">Liderados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="suspended">Suspenso</SelectItem>
            <SelectItem value="no_workspace">Sem workspace</SelectItem>
          </SelectContent>
        </Select>
        <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Workspace" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos workspaces</SelectItem>
            {allWorkspaces.map(ws => (
              <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={segmentFilter} onValueChange={v => setSegmentFilter(v as SegmentFilter)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Segmento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos segmentos</SelectItem>
            {(['beta', 'paid', 'trial', 'internal', 'test'] as const).map(seg => (
              <SelectItem key={seg} value={seg}>{SEGMENT_LABELS[seg]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 ml-auto">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
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
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                    Usuário <SortIcon field="name" />
                  </TableHead>
                  <TableHead><Hash className="h-3 w-3 inline mr-1" /> ID</TableHead>
                  <TableHead>Workspace(s)</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Hierarquia</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    Status <SortIcon field="status" />
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const wsInfo = getUserWorkspaceStatus(user);
                  const avatarVariant = getUserAvatar(user.user_id);
                  const userWss = getUserWorkspaces(user);
                  const primaryWs = getPrimaryWorkspace(user);
                  const segment = primaryWs?.customer_segment || null;
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
                        <button
                          onClick={() => copyToClipboard(user.user_id, 'ID')}
                          className="text-xs font-mono text-muted-foreground hover:text-foreground inline-flex items-center gap-1 group"
                          title={user.user_id}
                        >
                          {user.user_id.slice(0, 8)}…
                          <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition" />
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 max-w-[200px]">
                          {userWss.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          ) : userWss.slice(0, 3).map(w => (
                            <div key={w.id} className="text-xs flex items-center gap-1.5">
                              <span className="font-medium truncate">{w.name}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">· {w.role}</span>
                            </div>
                          ))}
                          {userWss.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{userWss.length - 3} outros</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs">{primaryWs?.client_account || <span className="text-muted-foreground italic">—</span>}</span>
                          {segment && (
                            <Badge variant="outline" className={`text-[10px] w-fit ${SEGMENT_STYLES[segment] || ''}`}>
                              {SEGMENT_LABELS[segment] || segment}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">{renderCapBadges(user)}</div>
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
                          <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="Editar">
                            <Edit className="h-4 w-4" />
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

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>Atualizar identidade e classificação de cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">ID do sistema</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded font-mono break-all">{editForm.user_id}</code>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(editForm.user_id, 'ID')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Nome completo</Label>
              <Input value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Workspace primário</p>
              <Select
                value={editForm.workspace_id || ''}
                onValueChange={v => {
                  const ws = workspaceById[v];
                  setEditForm({
                    ...editForm,
                    workspace_id: v,
                    client_account: ws?.client_account || '',
                    customer_segment: ws?.customer_segment || 'beta',
                  });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione workspace" /></SelectTrigger>
                <SelectContent>
                  {(() => {
                    const user = userCaps?.find(u => u.user_id === editForm.user_id);
                    const wss = user ? getUserWorkspaces(user) : [];
                    return wss.length > 0 ? wss.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name} ({w.role})</SelectItem>
                    )) : <div className="px-2 py-1 text-xs text-muted-foreground">Sem workspaces</div>;
                  })()}
                </SelectContent>
              </Select>
              <div>
                <Label>Cliente (rótulo livre)</Label>
                <Input
                  placeholder="ex: FSTR Holding"
                  value={editForm.client_account}
                  onChange={e => setEditForm({ ...editForm, client_account: e.target.value })}
                  disabled={!editForm.workspace_id}
                />
              </div>
              <div>
                <Label>Segmento</Label>
                <Select
                  value={editForm.customer_segment}
                  onValueChange={v => setEditForm({ ...editForm, customer_segment: v })}
                  disabled={!editForm.workspace_id}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['beta', 'paid', 'trial', 'internal', 'test'] as const).map(seg => (
                      <SelectItem key={seg} value={seg}>{SEGMENT_LABELS[seg]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={editLoading}>
              {editLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
