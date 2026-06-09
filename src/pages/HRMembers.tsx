import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NewMemberDialog } from '@/components/NewMemberDialog';
import { BulkOnboardDialog } from '@/components/admin/BulkOnboardDialog';
import { DispatchInvitesDialog } from '@/components/hr/DispatchInvitesDialog';
import { useHRAdmin } from '@/components/HRAdminGuard';
import { Input } from '@/components/ui/input';
import { MemberProfileSheet } from '@/components/hr/MemberProfileSheet';
import { EditMemberDialog } from '@/components/EditMemberDialog';
import { useResendRhitmoSync } from '@/hooks/useResendRhitmoSync';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search,
  Users,
  Loader2,
  UserPlus,
  Upload,
  Send,
  MoreHorizontal,
  Pencil,
  Trash2,
  BellRing,
  Music,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { HRUpgradeGate } from '@/components/hr/HRUpgradeGate';

const ITEMS_PER_PAGE = 20;

const getActivityBadge = (days: number) => {
  if (days <= 7) return { label: 'Ativo', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (days <= 30) return { label: `${days}d atrás`, className: 'bg-amber-100 text-amber-700 border-amber-200' };
  if (days <= 60) return { label: `${days}d atrás`, className: 'bg-orange-100 text-orange-700 border-orange-200' };
  return { label: 'Sem feedback', className: 'bg-red-100 text-red-700 border-red-200' };
};

type EditTarget = { id: string; name: string; role: string; teamId: string };
type PendencyFilter = 'all' | 'no_invite' | 'no_feedback' | 'no_pdi' | 'no_sync';

export default function HRMembers() {
  const { workspaceId, workspaceName } = useHRAdmin();
  const { hasHrDashboard, isLoading: planLoading } = usePlanLimits();
  const queryClient = useQueryClient();
  const { resend: resendOneSync, resendMany: resendManySync, pending: syncPending } = useResendRhitmoSync();

  const [search, setSearch] = useState('');
  const [newMemberOpen, setNewMemberOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState('all');
  const [pdiFilter, setPdiFilter] = useState('all');
  const [pendency, setPendency] = useState<PendencyFilter>('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmBulkSync, setConfirmBulkSync] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: leadersData } = useQuery({
    queryKey: ['hr-leaders', workspaceId],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_hr_leaders_overview', { _workspace_id: workspaceId });
      return data as any;
    },
    enabled: !!workspaceId,
  });

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['hr-members', workspaceId, search, selectedLeader, pdiFilter, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hr_all_members', {
        _workspace_id: workspaceId,
        _search: search || null,
        _leader_id: selectedLeader === 'all' ? null : selectedLeader,
        _has_pdi: pdiFilter === 'all' ? null : pdiFilter === 'with_pdi',
        _limit: ITEMS_PER_PAGE,
        _offset: page * ITEMS_PER_PAGE,
      });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!workspaceId,
  });

  const members = membersData || [];
  const totalCount = members[0]?.total_count || 0;
  const totalPages = Math.ceil(Number(totalCount) / ITEMS_PER_PAGE);
  const leaders = (leadersData as any)?.leaders || [];
  const memberIds = useMemo(() => members.map((m: any) => m.member_id), [members]);
  const memberIdsKey = memberIds.join(',');

  // Lazy fetch team_name/team_id por página (RPC não retorna).
  const { data: teamsByMember } = useQuery({
    queryKey: ['hr-members-teams', workspaceId, memberIdsKey],
    enabled: memberIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, team_id, teams(name)')
        .in('id', memberIds);
      if (error) throw error;
      const map: Record<string, { team_id: string | null; team_name: string | null }> = {};
      for (const row of (data || []) as any[]) {
        map[row.id] = { team_id: row.team_id ?? null, team_name: row.teams?.name ?? null };
      }
      return map;
    },
  });

  // Aplica filtros client-side sobre a página atual.
  const visibleMembers = useMemo(() => {
    return members.filter((m: any) => {
      if (teamFilter !== 'all') {
        const tm = teamsByMember?.[m.member_id];
        if (!tm || tm.team_id !== teamFilter) return false;
      }
      switch (pendency) {
        case 'no_invite':
          return m.invite_status && m.invite_status !== 'accepted';
        case 'no_feedback':
          return (m.days_since_last_feedback ?? 999) > 30;
        case 'no_pdi':
          return (m.pdi_count ?? 0) === 0;
        case 'no_sync':
          return !m.has_sync;
        default:
          return true;
      }
    });
  }, [members, pendency, teamFilter, teamsByMember]);

  const pendingCount = useMemo(
    () => members.filter((m: any) => m.invite_status && m.invite_status !== 'accepted').length,
    [members]
  );

  const teamOptions = useMemo(() => {
    const seen = new Map<string, string>();
    Object.values(teamsByMember ?? {}).forEach((t) => {
      if (t.team_id && t.team_name) seen.set(t.team_id, t.team_name);
    });
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [teamsByMember]);

  // Reset seleção quando filtros/página mudam.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, pendency, teamFilter, search, selectedLeader, pdiFilter]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['hr-members', workspaceId] });
    queryClient.invalidateQueries({ queryKey: ['hr-leaders', workspaceId] });
    queryClient.invalidateQueries({ queryKey: ['hr-members-teams', workspaceId] });
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds(() => (checked ? new Set(visibleMembers.map((m: any) => m.member_id)) : new Set()));
  };

  const allVisibleSelected =
    visibleMembers.length > 0 && visibleMembers.every((m: any) => selectedIds.has(m.member_id));

  const handleResendInvite = async (member: any) => {
    if (!member?.member_email) {
      toast.error('Sem e-mail cadastrado para reenviar.');
      return;
    }
    setActingId(member.member_id);
    try {
      const { error } = await supabase.functions.invoke('admin-invite-user', {
        body: { email: member.member_email, name: member.member_name, workspace_id: workspaceId },
      });
      if (error) throw error;
      toast.success(`Lembrete enviado para ${member.member_email}`);
      refreshAll();
    } catch (err) {
      toast.error(`Falha ao reenviar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActingId(null);
    }
  };

  const handleResendSyncOne = async (member: any) => {
    setActingId(member.member_id);
    const ok = await resendOneSync({ id: member.member_id, name: member.member_name, email: member.member_email });
    if (ok) toast.success(`Pesquisa Rhitmo Sync enviada para ${member.member_email}`);
    setActingId(null);
  };

  const handleBulkResendInvite = async () => {
    const targets = members.filter(
      (m: any) => selectedIds.has(m.member_id) && m.invite_status && m.invite_status !== 'accepted'
    );
    if (targets.length === 0) {
      toast.error('Nenhum selecionado com convite pendente.');
      return;
    }
    setActingId('bulk');
    let sent = 0, errors = 0;
    for (const m of targets) {
      try {
        const { error } = await supabase.functions.invoke('admin-invite-user', {
          body: { email: m.member_email, name: m.member_name, workspace_id: workspaceId },
        });
        if (error) throw error;
        sent++;
      } catch { errors++; }
    }
    toast[errors > 0 ? 'warning' : 'success'](`Convites: ${sent} enviados, ${errors} com erro`);
    setActingId(null);
    setSelectedIds(new Set());
    refreshAll();
  };

  const handleBulkResendSyncConfirmed = async () => {
    const targets = members
      .filter((m: any) => selectedIds.has(m.member_id))
      .map((m: any) => ({ id: m.member_id, name: m.member_name, email: m.member_email }));
    if (targets.length === 0) return;
    setActingId('bulk');
    const { sent, errors } = await resendManySync(targets);
    toast[errors > 0 ? 'warning' : 'success'](`Pesquisa Rhitmo Sync: ${sent} enviadas, ${errors} com erro`);
    setActingId(null);
    setConfirmBulkSync(false);
    setSelectedIds(new Set());
    refreshAll();
  };

  const handleOpenEdit = async (member: any) => {
    setActingId(member.member_id);
    try {
      const cached = teamsByMember?.[member.member_id];
      let teamId = cached?.team_id ?? '';
      if (!teamId) {
        const { data } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('id', member.member_id)
          .maybeSingle();
        teamId = data?.team_id ?? '';
      }
      setEditTarget({
        id: member.member_id,
        name: member.member_name ?? '',
        role: member.member_role ?? '',
        teamId,
      });
    } catch (err) {
      toast.error(`Não foi possível abrir o editor: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActingId(confirmDelete.id);
    try {
      await supabase.from('feedbacks').delete().eq('member_id', confirmDelete.id);
      const { error } = await supabase.from('team_members').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      toast.success(`${confirmDelete.name} removido.`);
      refreshAll();
      setConfirmDelete(null);
    } catch (err) {
      toast.error(`Falha ao remover: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActingId(null);
    }
  };

  const handleRemindAllPending = () => {
    // Antes de abrir o disparo em lote, deixa o usuário ver quem está pendente.
    setPendency('no_invite');
    setPage(0);
    setDispatchOpen(true);
  };

  if (!planLoading && !hasHrDashboard) {
    return <HRUpgradeGate title="Liderados exigem Enterprise" description="A gestão completa de liderados por RH Admin fica disponível no upgrade Enterprise." />;
  }

  const selectedCount = selectedIds.size;
  const bulkBusy = actingId === 'bulk' || syncPending;

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Liderados</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão completa de todos os colaboradores
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={handleRemindAllPending}
            disabled={pendingCount === 0}
            title={pendingCount === 0 ? 'Sem cadastros pendentes' : 'Filtra os pendentes e abre o disparo em lote'}
          >
            <BellRing className="h-4 w-4" />
            Lembrar pendentes{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </Button>
          <Button variant="outline" className="rounded-xl gap-2" onClick={() => setBulkOpen(true)}>
            <Upload className="h-4 w-4" /> Importar em massa
          </Button>
          <Button className="rounded-xl gap-2" onClick={() => setNewMemberOpen(true)}>
            <UserPlus className="h-4 w-4" /> Convidar liderado
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>

        <Select value={selectedLeader} onValueChange={(v) => { setSelectedLeader(v); setPage(0); }}>
          <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Líder" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os líderes</SelectItem>
            {leaders.map((l: any) => (
              <SelectItem key={l.leader_id} value={l.leader_id}>{l.leader_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v)}>
          <SelectTrigger className="w-full lg:w-[160px]"><SelectValue placeholder="Time" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os times</SelectItem>
            {teamOptions.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={pendency} onValueChange={(v) => setPendency(v as PendencyFilter)}>
          <SelectTrigger className="w-full lg:w-[200px]"><SelectValue placeholder="Pendência" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sem filtro de pendência</SelectItem>
            <SelectItem value="no_invite">Cadastro pendente</SelectItem>
            <SelectItem value="no_feedback">Sem feedback (30d+)</SelectItem>
            <SelectItem value="no_pdi">Sem PDI</SelectItem>
            <SelectItem value="no_sync">Sem Rhitmo Sync</SelectItem>
          </SelectContent>
        </Select>

        <Select value={pdiFilter} onValueChange={(v) => { setPdiFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full lg:w-[140px]"><SelectValue placeholder="PDI" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="with_pdi">Com PDI</SelectItem>
            <SelectItem value="without_pdi">Sem PDI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-2xl border bg-primary/5 px-4 py-2.5 shadow-sm">
          <span className="text-sm font-medium">{selectedCount} selecionado{selectedCount > 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-2"
              onClick={handleBulkResendInvite}
              disabled={bulkBusy}
            >
              {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Reenviar convite
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => setConfirmBulkSync(true)}
              disabled={bulkBusy}
            >
              <Music className="h-3.5 w-3.5" />
              Reenviar Rhitmo Sync
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setSelectedIds(new Set())}>
              Limpar
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visibleMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Nenhum liderado encontrado{pendency !== 'all' || teamFilter !== 'all' ? ' nesta combinação de filtros' : ''}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(c) => toggleAllVisible(!!c)}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
                <TableHead>Liderado</TableHead>
                <TableHead className="hidden md:table-cell">Time</TableHead>
                <TableHead className="hidden lg:table-cell">Líder</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Atividade</TableHead>
                <TableHead className="w-20 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleMembers.map((member: any) => {
                const badge = getActivityBadge(member.days_since_last_feedback);
                const isPending = member.invite_status && member.invite_status !== 'accepted';
                const isActing = actingId === member.member_id;
                const teamName = teamsByMember?.[member.member_id]?.team_name ?? '—';
                return (
                  <TableRow key={member.member_id} data-state={selectedIds.has(member.member_id) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(member.member_id)}
                        onCheckedChange={(c) => toggleOne(member.member_id, !!c)}
                        aria-label={`Selecionar ${member.member_name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">
                            {member.member_name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{member.member_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.member_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{teamName}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {member.leader_name || '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {isPending ? (
                        <button
                          type="button"
                          onClick={() => handleResendInvite(member)}
                          disabled={isActing}
                          className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                          title="Clique para reenviar o lembrete de cadastro"
                        >
                          {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <BellRing className="h-3 w-3" />}
                          Lembrar
                        </button>
                      ) : (
                        <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          Vinculado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[11px] ${badge.className}`}>
                          {badge.label}
                        </Badge>
                        {!member.has_sync && (
                          <Badge variant="outline" className="text-[11px] text-muted-foreground">
                            Sync pendente
                          </Badge>
                        )}
                        {member.pdi_count === 0 && (
                          <Badge variant="outline" className="text-[11px] text-muted-foreground">
                            Sem PDI
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground"
                          onClick={() => {
                            setSelectedMemberId(member.member_id);
                            setProfileSheetOpen(true);
                          }}
                        >
                          Ver
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" disabled={isActing} aria-label="Ações">
                              {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => handleOpenEdit(member)}>
                              <Pencil className="h-4 w-4 mr-2" /> Editar dados
                            </DropdownMenuItem>
                            {isPending && (
                              <DropdownMenuItem onClick={() => handleResendInvite(member)}>
                                <Send className="h-4 w-4 mr-2" /> Reenviar convite
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleResendSyncOne(member)}>
                              <Music className="h-4 w-4 mr-2" />
                              {member.has_sync ? 'Reenviar Rhitmo Sync' : 'Enviar Rhitmo Sync'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setConfirmDelete({ id: member.member_id, name: member.member_name })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination + footer hint */}
      <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
        <p>
          {visibleMembers.length} de {members.length} nesta página
          {(pendency !== 'all' || teamFilter !== 'all') && ' · filtros aplicam-se à página atual'}
          {totalCount > 0 && ` · ${totalCount} no total`}
        </p>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              Próxima
            </Button>
          </div>
        )}
      </div>

      <MemberProfileSheet
        open={profileSheetOpen}
        onOpenChange={setProfileSheetOpen}
        memberId={selectedMemberId || ''}
        workspaceId={workspaceId}
      />
      <NewMemberDialog
        open={newMemberOpen}
        onOpenChange={setNewMemberOpen}
        workspaceId={workspaceId}
        onSuccess={refreshAll}
      />
      <BulkOnboardDialog
        open={bulkOpen}
        onOpenChange={(open) => { setBulkOpen(open); if (!open) refreshAll(); }}
        workspaceNames={workspaceName ? [workspaceName] : []}
      />
      <DispatchInvitesDialog
        open={dispatchOpen}
        onOpenChange={setDispatchOpen}
        workspaceId={workspaceId}
      />
      <EditMemberDialog
        open={!!editTarget}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        member={editTarget}
        workspaceId={workspaceId}
        onSuccess={refreshAll}
      />
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os feedbacks e dados deste liderado serão excluídos. O usuário continua existindo na plataforma, mas perde o vínculo com o time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actingId === confirmDelete?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulkSync} onOpenChange={setConfirmBulkSync}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar Rhitmo Sync para {selectedCount} liderado{selectedCount > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              Reenviar a pesquisa substitui o perfil atual em todo o Rhitmo (chat, briefs, avaliações) quando o liderado responder de novo. Quem ainda não preencheu apenas receberá o convite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkResendSyncConfirmed} disabled={bulkBusy}>
              {bulkBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sim, enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
