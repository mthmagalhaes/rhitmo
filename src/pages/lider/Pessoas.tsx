// Sprint 18 — Pessoas (promoção do PessoasV2 com tabs).
// Layout full-bleed estilo Tako/Linear: max-w-7xl em vez de max-w-5xl,
// CTAs "Adicionar liderado" + "Adicionar time" no header (também presentes
// no Workspace switcher). Substitui /lider/1on1s como home do gerenciamento
// de time. Tabs: Liderados (default, tabela densa) · Convites · Times · Analytics.
import { useMemo, useState, useEffect } from 'react';
// useNavigate removido na Sprint 19 — clique no liderado abre MemberAdminSheet, não navega.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInDays, formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAccount } from '@/contexts/AccountContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PageTabs, type PageTab } from '@/components/PageTabs';
import { EmptyStateHero } from '@/components/EmptyStateHero';
import { AnalyticsContent } from '@/pages/Analytics';
import { BulkOnboardDialog } from '@/components/admin/BulkOnboardDialog';
import { NewMemberDialog } from '@/components/NewMemberDialog';
import { NewTeamDialog } from '@/components/NewTeamDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users, Building2, BarChart3, MailPlus, UserPlus, Mail, Send, Loader2,
  AlertTriangle, Pencil, ChevronRight, Search, Plus, MoreHorizontal,
  Trash2, ArrowUp, ArrowDown, X, Copy, Archive, ArchiveRestore,
  Download, FolderInput, CheckCircle2,
} from 'lucide-react';
import { MemberAvatar } from '@/components/MemberAvatar';
import { useLeaderMembers, type LeaderMemberRow } from '@/hooks/useLeaderMembers';
import { trackFunnel } from '@/lib/analytics';
import { downloadCsv } from '@/lib/csvExport';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditTeamDialog } from '@/components/EditTeamDialog';
import { DeleteTeamDialog } from '@/components/DeleteTeamDialog';
import { MemberAdminSheet } from '@/components/leader/MemberAdminSheet';


// ─────────────────────────────────────────────────────────────────────────────
// Tabela densa de Liderados (estilo Tako)
// ─────────────────────────────────────────────────────────────────────────────

const HEALTH_CLASSES = {
  fresh: 'bg-emerald-500',
  warm: 'bg-amber-500',
  cold: 'bg-rose-500',
} as const;

function getHealth(lastIso: string): keyof typeof HEALTH_CLASSES {
  const days = differenceInDays(new Date(), new Date(lastIso));
  if (days <= 7) return 'fresh';
  if (days <= 14) return 'warm';
  return 'cold';
}

type SortKey = 'name' | 'role' | 'team' | 'last';
type SortDir = 'asc' | 'desc';

const HEALTH_LABEL: Record<keyof typeof HEALTH_CLASSES, string> = {
  fresh: 'Fresco · feedback nos últimos 7 dias',
  warm: 'Morno · 8 a 14 dias sem feedback',
  cold: 'Frio · mais de 14 dias sem feedback',
};

type HealthFilter = 'all' | 'fresh' | 'warm' | 'cold';

function PeopleListTab({ onNewMember }: { onNewMember: () => void }) {
  const qc = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const { teams, members, isLoading, workspace } = useLeaderMembers({ includeArchived: showArchived });
  const [query, setQuery] = useState('');
  const [teamId, setTeamId] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTeamId, setMoveTeamId] = useState<string>('none');
  const [acting, setActing] = useState(false);
  const [adminSheetMember, setAdminSheetMember] = useState<LeaderMemberRow | null>(null);

  const teamById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t.name])),
    [teams],
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'last' ? 'desc' : 'asc'); }
  };

  // Health counters (computed on the team-filtered + searched set, ignoring health chip itself)
  const baseFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => (teamId === 'all' ? true : m.team_id === teamId))
      .filter((m) =>
        q
          ? m.name.toLowerCase().includes(q) || (m.role ?? '').toLowerCase().includes(q)
          : true,
      );
  }, [members, query, teamId]);

  const counters = useMemo(() => {
    const c = { all: baseFiltered.length, fresh: 0, warm: 0, cold: 0 };
    for (const m of baseFiltered) {
      const h = getHealth(m.last_feedback_date);
      c[h]++;
    }
    return c;
  }, [baseFiltered]);

  const filtered = useMemo(() => {
    const list = healthFilter === 'all'
      ? baseFiltered
      : baseFiltered.filter((m) => getHealth(m.last_feedback_date) === healthFilter);
    const dir = sortDir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      switch (sortKey) {
        case 'name': return a.name.localeCompare(b.name, 'pt-BR') * dir;
        case 'role': return (a.role ?? '').localeCompare(b.role ?? '', 'pt-BR') * dir;
        case 'team': {
          const an = a.team_id ? teamById[a.team_id] ?? '' : '';
          const bn = b.team_id ? teamById[b.team_id] ?? '' : '';
          return an.localeCompare(bn, 'pt-BR') * dir;
        }
        case 'last': {
          const av = new Date(a.last_feedback_date).getTime();
          const bv = new Date(b.last_feedback_date).getTime();
          return (av - bv) * dir;
        }
      }
    });
  }, [baseFiltered, healthFilter, sortKey, sortDir, teamById]);

  // Clear orphan selections when filter changes
  useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(filtered.map((m) => m.id));
      const next = new Set<string>();
      prev.forEach((id) => visible.has(id) && next.add(id));
      return next;
    });
  }, [filtered]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));
  const someVisibleSelected = filtered.some((m) => selected.has(m.id));

  const toggleAllVisible = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((m) => (checked ? next.add(m.id) : next.delete(m.id)));
      return next;
    });
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['team-members', workspace?.id] });
  };

  const exportCsv = (rows: LeaderMemberRow[], scope: 'all' | 'selected') => {
    if (rows.length === 0) {
      toast.error('Nenhum liderado para exportar.');
      return;
    }
    const data = rows.map((m) => ({
      Nome: m.name,
      Cargo: m.role ?? '',
      Time: m.team_id ? teamById[m.team_id] ?? '' : '',
      Email: m.email ?? '',
      'Último sinal': format(new Date(m.last_feedback_date), 'yyyy-MM-dd'),
      'Status saúde': ({ fresh: 'Fresco', warm: 'Morno', cold: 'Frio' })[getHealth(m.last_feedback_date)],
      Arquivado: m.archived_at ? 'Sim' : 'Não',
    }));
    const ts = format(new Date(), 'yyyy-MM-dd');
    downloadCsv(`rhitmo-liderados-${ts}.csv`, data);
    trackFunnel('members_exported_csv', {
      workspaceId: workspace?.id ?? null,
      payload: { count: rows.length, scope },
    });
    toast.success(`${rows.length} liderado(s) exportado(s).`);
  };

  const handleBulkArchive = async () => {
    if (selected.size === 0) return;
    setActing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ids = Array.from(selected);
      const { error } = await supabase
        .from('team_members')
        .update({ archived_at: new Date().toISOString(), archived_by: user?.id ?? null })
        .in('id', ids);
      if (error) throw error;
      trackFunnel('members_bulk_archived', {
        workspaceId: workspace?.id ?? null,
        payload: { count: ids.length },
      });
      toast.success(`${ids.length} liderado(s) arquivado(s).`);
      setSelected(new Set());
      refresh();
    } catch (err) {
      toast.error(`Falha ao arquivar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActing(false);
    }
  };

  const handleBulkUnarchive = async () => {
    if (selected.size === 0) return;
    setActing(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase
        .from('team_members')
        .update({ archived_at: null, archived_by: null })
        .in('id', ids);
      if (error) throw error;
      trackFunnel('members_bulk_unarchived', {
        workspaceId: workspace?.id ?? null,
        payload: { count: ids.length },
      });
      toast.success(`${ids.length} liderado(s) restaurado(s).`);
      setSelected(new Set());
      refresh();
    } catch (err) {
      toast.error(`Falha ao restaurar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActing(false);
    }
  };

  const handleBulkMove = async () => {
    if (selected.size === 0) return;
    setActing(true);
    try {
      const ids = Array.from(selected);
      const newTeam = moveTeamId === 'none' ? null : moveTeamId;
      const { error } = await supabase
        .from('team_members')
        .update({ team_id: newTeam })
        .in('id', ids);
      if (error) throw error;
      trackFunnel('members_bulk_moved', {
        workspaceId: workspace?.id ?? null,
        payload: { count: ids.length, target_team_id: newTeam },
      });
      const teamLabel = newTeam ? (teamById[newTeam] ?? 'time') : 'Sem time';
      toast.success(`${ids.length} liderado(s) movido(s) para ${teamLabel}.`);
      setMoveOpen(false);
      setSelected(new Set());
      refresh();
    } catch (err) {
      toast.error(`Falha ao mover: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActing(false);
    }
  };

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {children}
      {sortKey === k && (
        sortDir === 'asc'
          ? <ArrowUp className="h-3 w-3" />
          : <ArrowDown className="h-3 w-3" />
      )}
    </button>
  );

  const HealthChip = ({ value, label, count, dot }: { value: HealthFilter; label: string; count: number; dot?: string }) => (
    <button
      type="button"
      onClick={() => setHealthFilter(value)}
      className={cn(
        'h-7 px-2.5 rounded-lg text-[12px] font-medium border inline-flex items-center gap-1.5 transition-colors',
        healthFilter === value
          ? 'bg-foreground text-background border-foreground'
          : 'bg-card text-muted-foreground border-border/50 hover:bg-muted/50 hover:text-foreground',
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />}
      {label}
      <span className={cn('text-[11px] tabular-nums', healthFilter === value ? 'opacity-80' : 'opacity-60')}>{count}</span>
    </button>
  );

  const selectedCount = selected.size;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Procurar por nome ou cargo"
              className="pl-9 h-10 rounded-xl bg-card border-border/50"
            />
          </div>
          {teams.length > 1 && (
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="h-10 w-[180px] rounded-xl bg-card border-border/50 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os times</SelectItem>
                {teams
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer select-none">
            <Checkbox
              checked={showArchived}
              onCheckedChange={(v) => setShowArchived(!!v)}
            />
            Mostrar arquivados
          </label>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2 h-10"
            onClick={() => exportCsv(filtered, 'all')}
            disabled={filtered.length === 0}
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Health chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <HealthChip value="all"   label="Todos"   count={counters.all} />
        <HealthChip value="fresh" label="Frescos" count={counters.fresh} dot="bg-emerald-500" />
        <HealthChip value="warm"  label="Mornos"  count={counters.warm}  dot="bg-amber-500" />
        <HealthChip value="cold"  label="Frios"   count={counters.cold}  dot="bg-rose-500" />
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} de {members.length}
        </span>
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-[13px] font-medium">
            {selectedCount} selecionado(s)
          </span>
          <div className="h-4 w-px bg-border mx-1" />
          <Button
            size="sm" variant="outline" className="rounded-lg gap-1.5 h-8"
            onClick={() => { setMoveTeamId('none'); setMoveOpen(true); }}
            disabled={acting}
          >
            <FolderInput className="h-3.5 w-3.5" /> Mover de time
          </Button>
          {showArchived ? (
            <Button
              size="sm" variant="outline" className="rounded-lg gap-1.5 h-8"
              onClick={handleBulkUnarchive}
              disabled={acting}
            >
              <ArchiveRestore className="h-3.5 w-3.5" /> Restaurar
            </Button>
          ) : (
            <Button
              size="sm" variant="outline" className="rounded-lg gap-1.5 h-8 text-destructive hover:text-destructive"
              onClick={handleBulkArchive}
              disabled={acting}
            >
              <Archive className="h-3.5 w-3.5" /> Arquivar
            </Button>
          )}
          <Button
            size="sm" variant="outline" className="rounded-lg gap-1.5 h-8"
            onClick={() => exportCsv(filtered.filter((m) => selected.has(m.id)), 'selected')}
            disabled={acting}
          >
            <Download className="h-3.5 w-3.5" /> Exportar selecionados
          </Button>
          <Button
            size="sm" variant="ghost" className="rounded-lg gap-1.5 h-8 ml-auto"
            onClick={() => setSelected(new Set())}
          >
            <X className="h-3.5 w-3.5" /> Cancelar
          </Button>
        </div>
      )}

      {/* Tabela densa */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        {/* Header row */}
        <div className="grid grid-cols-[28px_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_140px_24px] gap-4 px-5 py-2.5 bg-muted/30 border-b border-border/40 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <div className="flex items-center">
            <Checkbox
              checked={allVisibleSelected ? true : (someVisibleSelected ? 'indeterminate' : false)}
              onCheckedChange={(v) => toggleAllVisible(v === true)}
              aria-label="Selecionar todos visíveis"
            />
          </div>
          <div><SortHeader k="name">Nome</SortHeader></div>
          <div><SortHeader k="role">Cargo</SortHeader></div>
          <div><SortHeader k="team">Time</SortHeader></div>
          <div><SortHeader k="last">Último sinal</SortHeader></div>
          <div />
        </div>

        {isLoading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Carregando liderados…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users className="h-6 w-6 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {members.length === 0
                ? 'Nenhum liderado cadastrado ainda.'
                : 'Nenhum liderado encontrado com esses filtros.'}
            </p>
          </div>
        ) : (
          <ul>
            <TooltipProvider delayDuration={200}>
              {filtered.map((m: LeaderMemberRow) => {
                const health = getHealth(m.last_feedback_date);
                const teamName = m.team_id ? teamById[m.team_id] ?? '—' : '—';
                const isArchived = !!m.archived_at;
                const isSelected = selected.has(m.id);
                return (
                  <li key={m.id} className={cn('border-b border-border/30 last:border-b-0', isArchived && 'opacity-60')}>
                    <div
                      className={cn(
                        'group grid grid-cols-[28px_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_140px_24px] gap-4 px-5 py-2.5 items-center transition-colors',
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/40',
                      )}
                    >
                      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(v) => toggleOne(m.id, v === true)}
                          aria-label={`Selecionar ${m.name}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdminSheetMember(m)}
                        className="contents text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <MemberAvatar
                              memberId={m.id}
                              memberName={m.name}
                              avatarUrl={m.avatar}
                              size="sm"
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={cn(
                                    'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-card',
                                    HEALTH_CLASSES[health],
                                  )}
                                  aria-label={HEALTH_LABEL[health]}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p className="text-xs max-w-xs">{HEALTH_LABEL[health]}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <span className="text-[13px] font-medium text-foreground truncate">
                            {m.name}
                          </span>
                          {isArchived && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-1">Arquivado</Badge>
                          )}
                        </div>
                        <div className="text-[13px] text-muted-foreground truncate">
                          {m.role || '—'}
                        </div>
                        <div className="text-[13px] text-muted-foreground truncate">
                          {teamName}
                        </div>
                        <div className="text-[12px] text-muted-foreground truncate">
                          {formatDistanceToNow(new Date(m.last_feedback_date), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </TooltipProvider>
          </ul>
        )}

        {/* Footer row: novo liderado */}
        <button
          type="button"
          onClick={onNewMember}
          className="w-full flex items-center gap-2 px-5 py-2.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/40 border-t border-border/40 transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Novo liderado
        </button>
      </div>

      {/* Move dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Mover {selectedCount} liderado(s)</DialogTitle>
            <DialogDescription>
              Escolha o novo time. Eles continuam visíveis para você.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Time de destino</Label>
            <Select value={moveTeamId} onValueChange={setMoveTeamId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem time</SelectItem>
                {teams
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setMoveOpen(false)}>
              Cancelar
            </Button>
            <Button className="rounded-xl gap-2" onClick={handleBulkMove} disabled={acting}>
              {acting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MemberAdminSheet
        open={!!adminSheetMember}
        onOpenChange={(o) => !o && setAdminSheetMember(null)}
        member={adminSheetMember}
        teams={teams}
        workspaceId={workspace?.id ?? null}
        onChanged={refresh}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Times tab
// ─────────────────────────────────────────────────────────────────────────────

interface TeamRow {
  id: string;
  name: string;
  created_at: string;
  member_count: number;
  leader_user_id: string | null;
  leader_name: string | null;
  leader_email: string | null;
  leader_invite_pending: boolean;
}

function TeamsTab({ onNewTeam, workspaceId }: { onNewTeam: () => void; workspaceId: string | null }) {
  const qc = useQueryClient();
  const [editTeam, setEditTeam] = useState<TeamRow | null>(null);
  const [deleteTeam, setDeleteTeam] = useState<TeamRow | null>(null);
  const [query, setQuery] = useState('');

  const { data: teams = [], isLoading } = useQuery<TeamRow[]>({
    queryKey: ['workspace-teams-detail', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_workspace_teams_overview', {
        _workspace_id: workspaceId!,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        name: r.name,
        created_at: r.created_at,
        leader_user_id: r.leader_user_id,
        leader_name: r.leader_name,
        leader_email: r.leader_email,
        leader_invite_pending: !!r.leader_invite_pending,
        member_count: Number(r.member_count ?? 0),
      }));
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? teams.filter((t) => t.name.toLowerCase().includes(q)) : teams;
    // Ordem: sem líder → líder pendente → líder ativo. Chama atenção pro que falta agir.
    const weight = (t: TeamRow) => (!t.leader_user_id ? 0 : t.leader_invite_pending ? 1 : 2);
    return [...base].sort((a, b) => {
      const wa = weight(a);
      const wb = weight(b);
      if (wa !== wb) return wa - wb;
      return a.name.localeCompare(b.name);
    });
  }, [teams, query]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['workspace-teams-detail', workspaceId] });
    qc.invalidateQueries({ queryKey: ['teams'] });
    qc.invalidateQueries({ queryKey: ['team-members'] });
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando times...</div>;

  if (!teams.length) {
    return (
      <EmptyStateHero
        icon={Building2}
        title="Nenhum time ainda"
        description="Times agrupam liderados por squad, área ou projeto. Crie o primeiro para organizar a operação."
        ctaLabel="Criar time"
        ctaIcon={Plus}
        onCta={onNewTeam}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar time"
            className="pl-9 h-10 rounded-xl bg-card border-border/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filtered.length} de {teams.length}
          </span>
          <Button onClick={onNewTeam} size="sm" className="rounded-xl gap-2 h-10">
            <Plus className="w-4 h-4" /> Novo time
          </Button>
        </div>
      </div>

      <p className="text-[13px] text-muted-foreground">
        Times organizam seus liderados em grupos. Toda a operação fica embaixo de você (dono do workspace).
      </p>

      {/* Tabela densa */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,2fr)_120px_140px_32px] gap-4 px-5 py-2.5 bg-muted/30 border-b border-border/40 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <div>Nome</div>
          <div>Líder</div>
          <div>Liderados</div>
          <div>Criado</div>
          <div />
        </div>
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Nenhum time encontrado.
          </div>
        ) : (
          <ul>
            {filtered.map((t) => {
              const isSemTime = t.name === 'Sem Time';
              return (
                <li key={t.id} className="border-b border-border/30 last:border-b-0">
                  <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,2fr)_120px_140px_32px] gap-4 px-5 py-3 items-center hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="rounded-lg bg-primary/10 p-1.5 shrink-0">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-[13px] font-medium text-foreground truncate">{t.name}</span>
                    </div>
                    <div className="min-w-0">
                      {t.leader_user_id ? (
                        <span className="text-[13px] text-foreground truncate block">
                          {t.leader_name ?? 'Líder vinculado'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditTeam(t)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Sem líder — definir
                        </button>
                      )}
                    </div>
                    <div className="text-[13px] text-muted-foreground">
                      {t.member_count} {t.member_count === 1 ? 'pessoa' : 'pessoas'}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setEditTeam(t)} disabled={isSemTime}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTeam(t)}
                          disabled={isSemTime}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {workspaceId && (
        <>
          <EditTeamDialog
            open={!!editTeam}
            onOpenChange={(o) => !o && setEditTeam(null)}
            team={editTeam}
            workspaceId={workspaceId}
            onSuccess={refresh}
          />
          <DeleteTeamDialog
            open={!!deleteTeam}
            onOpenChange={(o) => !o && setDeleteTeam(null)}
            team={deleteTeam}
            workspaceId={workspaceId}
            onSuccess={refresh}
          />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Convites tab (preserved from legacy /lider/pessoas)
// ─────────────────────────────────────────────────────────────────────────────

function ResendInviteButton({ memberId, memberName, memberEmail, isBounced }: { memberId: string; memberName: string; memberEmail: string | null; isBounced: boolean }) {
  const [sending, setSending] = useState(false);
  const handleResend = async () => {
    if (!memberEmail) {
      toast.error('Esse liderado não tem e-mail cadastrado.');
      return;
    }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const leaderName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split('@')[0] ?? '';
      const syncUrl = `${window.location.origin}/sync/${memberId}`;
      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'member-welcome',
          recipientEmail: memberEmail,
          idempotencyKey: `member-welcome-${memberId}-resend-${Date.now()}`,
          templateData: { memberName, leaderName, teamName: '', syncUrl },
        },
      });
      if (error) throw error;
      trackFunnel('invite_resent', { memberId, payload: { wasBounced: isBounced } });
      toast.success(`Convite reenviado para ${memberEmail}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha ao reenviar: ${msg}`);
    } finally {
      setSending(false);
    }
  };
  return (
    <Button size="sm" variant="outline" className="rounded-xl gap-2" onClick={handleResend} disabled={sending}>
      {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
      Reenviar
    </Button>
  );
}

// (EditEmailButton legado removido — substituído pelo InviteRowMenu)

// Kebab menu para cada convite pendente.
function InviteRowMenu({
  memberId, memberName, memberEmail, onChanged,
}: {
  memberId: string;
  memberName: string;
  memberEmail: string | null;
  onChanged: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [emailValue, setEmailValue] = useState(memberEmail ?? '');
  const [savingEmail, setSavingEmail] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => { setEmailValue(memberEmail ?? ''); }, [memberEmail]);

  const copyInviteLink = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('invite_token')
        .eq('id', memberId)
        .maybeSingle();
      if (error) throw error;
      const token = (data as { invite_token: string | null } | null)?.invite_token;
      if (!token) {
        toast.error('Esse convite não tem link disponível.');
        return;
      }
      const url = `${window.location.origin}/invite?token=${token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link de convite copiado.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha ao copiar: ${msg}`);
    }
  };

  const handleSaveEmail = async () => {
    const next = emailValue.trim().toLowerCase();
    if (!next || !/.+@.+\..+/.test(next)) {
      toast.error('Informe um e-mail válido.');
      return;
    }
    setSavingEmail(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ email: next })
        .eq('id', memberId);
      if (error) throw error;
      try {
        if (memberEmail) {
          await supabase.rpc('remove_email_suppression' as never, { p_email: memberEmail } as never);
        }
      } catch { /* opcional */ }
      trackFunnel('member_email_edited', { memberId, payload: { from: memberEmail, to: next } });
      toast.success('E-mail atualizado.');
      setEditOpen(false);
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha ao atualizar: ${msg}`);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleCancelInvite = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ invite_status: 'cancelled' })
        .eq('id', memberId);
      if (error) throw error;
      trackFunnel('invite_cancelled', { memberId });
      toast.success(`Convite de ${memberName} cancelado.`);
      setCancelOpen(false);
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha ao cancelar: ${msg}`);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-2" /> Editar e-mail
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyInviteLink}>
            <Copy className="h-3.5 w-3.5 mr-2" /> Copiar link de convite
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setCancelOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <X className="h-3.5 w-3.5 mr-2" /> Cancelar convite
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Editar e-mail */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Editar e-mail do convite</DialogTitle>
            <DialogDescription>
              Atualize o endereço para {memberName}. O próximo reenvio usará o novo e-mail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`invite-email-${memberId}`}>Novo e-mail</Label>
            <Input
              id={`invite-email-${memberId}`}
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              placeholder="nome@empresa.com"
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSaveEmail} disabled={savingEmail} className="rounded-xl gap-2">
              {savingEmail && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancelar convite */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Cancelar convite?</DialogTitle>
            <DialogDescription>
              {memberName} não poderá mais aceitar este convite. Você pode adicionar a pessoa novamente depois.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} className="rounded-xl">Voltar</Button>
            <Button
              variant="destructive"
              onClick={handleCancelInvite}
              disabled={cancelling}
              className="rounded-xl gap-2"
            >
              {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Sim, cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InvitesTab({ onBulk, canBulk }: { onBulk: () => void; onAddSingle?: () => void; canBulk: boolean }) {
  const inviteLabel = 'Convidar em massa';
  const emptyDescription = canBulk
    ? 'Convide vários liderados de uma vez colando uma lista de e-mails. Cada um recebe um convite personalizado.'
    : 'Use o botão "Adicionar liderado" no topo para cadastrar uma pessoa por vez. Convites em massa estão disponíveis para o RH e o owner do workspace.';
  const qc = useQueryClient();
  const { data: pending } = useQuery({
    queryKey: ['pending-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, email, created_at')
        .eq('invite_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: suppressed } = useQuery({
    queryKey: ['suppressed-member-emails'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_suppressed_member_emails');
      if (error) {
        console.warn('[Pessoas] suppressed-emails RPC failed:', error.message);
        return [] as string[];
      }
      return ((data ?? []) as Array<{ email: string }>).map((r) => r.email.toLowerCase());
    },
    staleTime: 60_000,
  });
  const suppressedSet = new Set(suppressed ?? []);

  useEffect(() => {
    if (!pending || !suppressed) return;
    const w = window as unknown as { __rhitmoBouncedFired?: Set<string> };
    const fired = w.__rhitmoBouncedFired ?? new Set<string>();
    pending.forEach((p) => {
      if (p.email && suppressedSet.has(p.email.toLowerCase()) && !fired.has(p.id)) {
        trackFunnel('invite_bounced', { memberId: p.id, payload: { email: p.email } });
        fired.add(p.id);
      }
    });
    w.__rhitmoBouncedFired = fired;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, suppressed]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-bold tracking-tight">Convites pendentes</h2>
          <p className="text-sm text-muted-foreground">
            {pending?.length ?? 0} liderado(s) ainda não aceitaram o convite.
          </p>
        </div>
        {canBulk && (
          <Button onClick={onBulk} className="rounded-xl gap-2">
            <MailPlus className="w-4 h-4" /> {inviteLabel}
          </Button>
        )}
      </div>

      {!pending?.length ? (
        <EmptyStateHero
          icon={MailPlus}
          title="Sem convites pendentes"
          description={emptyDescription}
          ctaLabel={canBulk ? inviteLabel : undefined}
          ctaIcon={canBulk ? MailPlus : undefined}
          onCta={canBulk ? onBulk : undefined}
          variant="compact"
        />
      ) : (
        <div className="space-y-2">
          {pending.map((p) => {
            const isBounced = !!p.email && suppressedSet.has(p.email.toLowerCase());
            return (
            <Card key={p.id} className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
              <CardContent className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-xl bg-primary/10 p-2 shrink-0"><Mail className="w-4 h-4 text-primary" /></div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      {p.email ?? 'sem e-mail'}
                      {isBounced && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">
                                E-mail não foi entregue (bounce). Verifique se o endereço
                                está correto ou peça outro contato.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-muted-foreground hidden md:inline whitespace-nowrap">
                    {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                  {isBounced ? (
                    <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-700 dark:text-amber-400">
                      Bounce
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs hidden sm:inline-flex">Pendente</Badge>
                  )}
                  <ResendInviteButton memberId={p.id} memberName={p.name} memberEmail={p.email} isBounced={isBounced} />
                  <InviteRowMenu
                    memberId={p.id}
                    memberName={p.name}
                    memberEmail={p.email}
                    onChanged={() => {
                      qc.invalidateQueries({ queryKey: ['pending-invites'] });
                      qc.invalidateQueries({ queryKey: ['suppressed-member-emails'] });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────────────

export default function LiderPessoas() {
  const { isHRAdmin, isWorkspaceOwner, workspaceId } = useAccount();
  const { workspace } = useLeaderMembers();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newMemberOpen, setNewMemberOpen] = useState(false);
  const [newTeamOpen, setNewTeamOpen] = useState(false);

  const canManageTeams = isHRAdmin || isWorkspaceOwner;

  const tabs: PageTab[] = [
    {
      value: 'membros',
      label: 'Liderados',
      icon: Users,
      content: <PeopleListTab onNewMember={() => setNewMemberOpen(true)} />,
    },
    {
      value: 'convites',
      label: 'Convites',
      icon: MailPlus,
      content: (
        <InvitesTab
          onBulk={() => setInviteOpen(true)}
          canBulk={canManageTeams}
        />
      ),
    },
    {
      value: 'times',
      label: 'Times',
      icon: Building2,
      hidden: !canManageTeams,
      content: <TeamsTab onNewTeam={() => setNewTeamOpen(true)} workspaceId={workspaceId} />,
    },
    {
      value: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      hidden: !canManageTeams,
      content: <AnalyticsContent />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">Pessoas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Seu time num único clique. Selecione um liderado para abrir a ficha completa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setNewMemberOpen(true)}
                  className="rounded-xl gap-2"
                  disabled={!workspace}
                >
                  <UserPlus className="w-4 h-4" /> Adicionar liderado
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                Cadastra um liderado com ou sem e-mail. Com e-mail, vira convite automático.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <PageTabs tabs={tabs} defaultValue="membros" />

      {workspace && (
        <NewMemberDialog
          open={newMemberOpen}
          onOpenChange={setNewMemberOpen}
          workspaceId={workspace.id}
        />
      )}
      {workspace && canManageTeams && (
        <NewTeamDialog
          open={newTeamOpen}
          onOpenChange={setNewTeamOpen}
          workspaceId={workspace.id}
        />
      )}
      <BulkOnboardDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        workspaceNames={workspace?.name ? [workspace.name] : []}
      />
    </div>
  );
}
