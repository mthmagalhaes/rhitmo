import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useHRAdmin } from '@/components/HRAdminGuard';
import { useWorkspacePeople, type WorkspacePerson } from '@/hooks/useWorkspacePeople';
import { NewMemberDialog } from '@/components/NewMemberDialog';
import { BulkOnboardDialog } from '@/components/admin/BulkOnboardDialog';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Search, UserPlus, Users, ChevronDown, Loader2, Crown, Shield, UserCog, User as UserIcon, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type RoleKey = 'owner' | 'hr_admin' | 'leader' | 'member';
type SegmentKey = 'all' | 'members' | 'leaders' | 'hr' | 'no_leader' | 'pending';

const ROLE_META: Record<RoleKey, { label: string; className: string; icon: typeof Crown }> = {
  owner:   { label: 'Owner',    className: 'bg-violet-100 text-violet-700 border-violet-200', icon: Crown },
  hr_admin:{ label: 'HR',       className: 'bg-blue-100 text-blue-700 border-blue-200',       icon: Shield },
  leader:  { label: 'Líder',    className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: UserCog },
  member:  { label: 'Liderado', className: 'bg-sky-100 text-sky-700 border-sky-200',           icon: UserIcon },
};

function RoleChips({ roles }: { roles: RoleKey[] }) {
  const order: RoleKey[] = ['owner', 'hr_admin', 'leader', 'member'];
  const sorted = order.filter((r) => roles.includes(r));
  return (
    <div className="flex flex-wrap gap-1">
      {sorted.map((r) => {
        const m = ROLE_META[r];
        const Icon = m.icon;
        return (
          <Badge key={r} variant="outline" className={`gap-1 ${m.className}`}>
            <Icon className="h-3 w-3" />
            {m.label}
          </Badge>
        );
      })}
    </div>
  );
}

function InviteHRAdminDialog({
  open, onOpenChange, workspaceId, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; workspaceId: string; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!email.trim()) return toast.error('Informe um e-mail válido');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-hr-admin', {
        body: { email: email.trim(), name: name.trim() || null, workspace_id: workspaceId, action: 'invite' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.invited ? `Convite enviado para ${email}` : `${email} promovido(a) a HR Admin`);
      setEmail(''); setName('');
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error('Falha ao convidar', { description: err instanceof Error ? err.message : 'Erro desconhecido' });
    } finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Convidar HR Admin</DialogTitle>
          <DialogDescription>
            HR Admins têm acesso a Pessoas, Times e Analytics do workspace inteiro.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="hr-name">Nome (opcional)</Label>
            <Input id="hr-name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <Label htmlFor="hr-email">E-mail</Label>
            <Input id="hr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading} className="rounded-xl">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Convidar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HRPessoas() {
  const { workspaceId, workspaceName } = useHRAdmin();
  const queryClient = useQueryClient();
  const { data: people = [], isLoading, refetch } = useWorkspacePeople(workspaceId);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleKey | 'all'>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending_invite'>('all');
  const [segment, setSegment] = useState<SegmentKey>('all');

  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [hrDialogOpen, setHrDialogOpen] = useState(false);

  const teams = useMemo(() => {
    const map = new Map<string, string>();
    people.forEach((p) => {
      if (p.team_id && p.team_name) map.set(p.team_id, p.team_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [people]);

  const counts = useMemo(() => ({
    all: people.length,
    members: people.filter((p) => p.roles.includes('member')).length,
    leaders: people.filter((p) => p.roles.includes('leader')).length,
    hr: people.filter((p) => p.roles.includes('hr_admin') || p.roles.includes('owner')).length,
    no_leader: people.filter((p) => p.roles.includes('member') && !p.leader_user_id).length,
    pending: people.filter((p) => p.status === 'pending_invite').length,
  }), [people]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) => {
      if (q && !(`${p.full_name ?? ''} ${p.email ?? ''}`.toLowerCase().includes(q))) return false;
      if (roleFilter !== 'all' && !p.roles.includes(roleFilter)) return false;
      if (teamFilter !== 'all' && p.team_id !== teamFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (segment === 'members'   && !p.roles.includes('member')) return false;
      if (segment === 'leaders'   && !p.roles.includes('leader')) return false;
      if (segment === 'hr'        && !(p.roles.includes('hr_admin') || p.roles.includes('owner'))) return false;
      if (segment === 'no_leader' && !(p.roles.includes('member') && !p.leader_user_id)) return false;
      if (segment === 'pending'   && p.status !== 'pending_invite') return false;
      return true;
    });
  }, [people, search, roleFilter, teamFilter, statusFilter, segment]);

  const onInviteSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['workspace-people', workspaceId] });
    refetch();
  };

  const exportCsv = () => {
    const header = ['Nome', 'Email', 'Papeis', 'Time', 'Lider', 'Status', 'Ultima atividade'];
    const rows = filtered.map((p) => [
      p.full_name ?? '',
      p.email ?? '',
      p.roles.join('|'),
      p.team_name ?? '',
      p.leader_name ?? '',
      p.status,
      p.last_activity_at ?? '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pessoas-${workspaceName}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatActivity = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return '—';
    return formatDistanceToNow(d, { locale: ptBR, addSuffix: true });
  };

  const segChip = (key: SegmentKey, label: string, count: number) => (
    <button
      key={key}
      onClick={() => setSegment(key)}
      className={`px-3 py-1.5 rounded-xl text-sm transition ${
        segment === key ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/70'
      }`}
    >
      {label} <span className="opacity-70">· {count}</span>
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pessoas</h1>
          <p className="text-muted-foreground mt-1">
            Diretório do workspace <span className="font-medium text-foreground">{workspaceName}</span> — Owner, HR, Líderes e Liderados.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} className="rounded-xl">
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-xl">
                <UserPlus className="h-4 w-4 mr-2" /> Convidar
                <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => setMemberDialogOpen(true)}>
                <UserIcon className="h-4 w-4 mr-2" /> Liderado (individual)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkDialogOpen(true)}>
                <Users className="h-4 w-4 mr-2" /> Liderados (em lote)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setHrDialogOpen(true)}>
                <Shield className="h-4 w-4 mr-2" /> HR Admin
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Segments */}
      <div className="flex flex-wrap gap-2">
        {segChip('all', 'Todos', counts.all)}
        {segChip('members', 'Liderados', counts.members)}
        {segChip('leaders', 'Líderes', counts.leaders)}
        {segChip('hr', 'HR / Owner', counts.hr)}
        {segChip('no_leader', 'Sem líder', counts.no_leader)}
        {segChip('pending', 'Convites pendentes', counts.pending)}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            className="pl-9 rounded-xl"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleKey | 'all')}>
          <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Papel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos papéis</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="hr_admin">HR Admin</SelectItem>
            <SelectItem value="leader">Líder</SelectItem>
            <SelectItem value="member">Liderado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-[180px] rounded-xl"><SelectValue placeholder="Time" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos times</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="pending_invite">Convite pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pessoa</TableHead>
              <TableHead>Papéis</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Líder</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Última atividade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center py-12">
                <Loader2 className="h-5 w-5 animate-spin inline" />
              </TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                Nenhuma pessoa encontrada com esses filtros.
              </TableCell></TableRow>
            )}
            {filtered.map((p) => (
              <TableRow key={`${p.user_id ?? 'pending'}-${p.member_id ?? p.email}`}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{p.full_name || p.email || '—'}</span>
                    {p.email && p.full_name && (
                      <span className="text-xs text-muted-foreground">{p.email}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell><RoleChips roles={p.roles as RoleKey[]} /></TableCell>
                <TableCell>
                  {p.team_name ? (
                    <span>
                      {p.team_name}
                      {p.team_count > 1 && <span className="text-xs text-muted-foreground ml-1">+{p.team_count - 1}</span>}
                    </span>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>{p.leader_name || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  {p.status === 'pending_invite' ? (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">Convite pendente</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">Ativo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatActivity(p.last_activity_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <NewMemberDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        workspaceId={workspaceId}
        onSuccess={onInviteSuccess}
      />
      <BulkOnboardDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        workspaceId={workspaceId}
        onSuccess={onInviteSuccess}
      />
      <InviteHRAdminDialog
        open={hrDialogOpen}
        onOpenChange={setHrDialogOpen}
        workspaceId={workspaceId}
        onSuccess={onInviteSuccess}
      />
    </div>
  );
}
