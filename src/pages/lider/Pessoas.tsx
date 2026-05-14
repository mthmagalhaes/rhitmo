// Sprint 18 — Pessoas (promoção do PessoasV2 com tabs).
// Layout full-bleed estilo Tako/Linear: max-w-7xl em vez de max-w-5xl,
// CTAs "Adicionar liderado" + "Adicionar time" no header (também presentes
// no Workspace switcher). Substitui /lider/1on1s como home do gerenciamento
// de time. Tabs: Liderados (default, tabela densa) · Convites · Times · Analytics.
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInDays, formatDistanceToNow } from 'date-fns';
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
  Trash2, UserCog, ArrowUp, ArrowDown, X, Copy,
} from 'lucide-react';
import { MemberAvatar } from '@/components/MemberAvatar';
import { useLeaderMembers, type LeaderMemberRow } from '@/hooks/useLeaderMembers';
import { trackFunnel } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditTeamDialog } from '@/components/EditTeamDialog';
import { DeleteTeamDialog } from '@/components/DeleteTeamDialog';
import { ChangeTeamLeaderDialog } from '@/components/ChangeTeamLeaderDialog';

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

function PeopleListTab({ onNewMember }: { onNewMember: () => void }) {
  const navigate = useNavigate();
  const { teams, members, isLoading } = useLeaderMembers();
  const [query, setQuery] = useState('');
  const [teamId, setTeamId] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const teamById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t.name])),
    [teams],
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'last' ? 'desc' : 'asc'); }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = members
      .filter((m) => (teamId === 'all' ? true : m.team_id === teamId))
      .filter((m) =>
        q
          ? m.name.toLowerCase().includes(q) ||
            (m.role ?? '').toLowerCase().includes(q)
          : true,
      );
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
  }, [members, query, teamId, sortKey, sortDir, teamById]);

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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar por nome ou cargo"
            className="pl-9 h-10 rounded-xl bg-card border-border/50"
          />
        </div>
        <div className="flex items-center gap-2">
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
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filtered.length} de {members.length}
          </span>
        </div>
      </div>

      {/* Tabela densa */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        {/* Header row */}
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_140px_24px] gap-4 px-5 py-2.5 bg-muted/30 border-b border-border/40 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
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
                return (
                  <li key={m.id} className="border-b border-border/30 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/member/${m.id}`)}
                      className="group w-full grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_140px_24px] gap-4 px-5 py-2.5 items-center text-left hover:bg-muted/40 transition-colors"
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Times tab
// ─────────────────────────────────────────────────────────────────────────────

interface TeamRow {
  id: string;
  name: string;
  leader_user_id: string | null;
  created_at: string;
  leader_name: string | null;
  member_count: number;
}

function TeamsTab({ onNewTeam, workspaceId }: { onNewTeam: () => void; workspaceId: string | null }) {
  const qc = useQueryClient();
  const [editTeam, setEditTeam] = useState<TeamRow | null>(null);
  const [deleteTeam, setDeleteTeam] = useState<TeamRow | null>(null);
  const [leaderTeam, setLeaderTeam] = useState<TeamRow | null>(null);
  const [query, setQuery] = useState('');

  const { data: teams = [], isLoading } = useQuery<TeamRow[]>({
    queryKey: ['workspace-teams-detail', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('teams')
        .select('id, name, leader_user_id, created_at')
        .eq('workspace_id', workspaceId!)
        .order('name');
      if (error) throw error;

      const list = (rows ?? []) as Array<{ id: string; name: string; leader_user_id: string | null; created_at: string }>;
      const ids = list.map((t) => t.id);

      // Member counts
      const counts = new Map<string, number>();
      if (ids.length) {
        const { data: members } = await supabase
          .from('team_members')
          .select('team_id')
          .in('team_id', ids);
        members?.forEach((m: { team_id: string }) => {
          counts.set(m.team_id, (counts.get(m.team_id) ?? 0) + 1);
        });
      }

      // Resolve leader names via team_members.linked_user_id
      const leaderIds = Array.from(new Set(list.map((t) => t.leader_user_id).filter(Boolean) as string[]));
      const nameByUid = new Map<string, string>();
      if (leaderIds.length) {
        const { data: named } = await supabase
          .from('team_members')
          .select('linked_user_id, name')
          .in('linked_user_id', leaderIds);
        named?.forEach((r: { linked_user_id: string | null; name: string }) => {
          if (r.linked_user_id && !nameByUid.has(r.linked_user_id)) {
            nameByUid.set(r.linked_user_id, r.name);
          }
        });
      }

      return list.map((t) => ({
        ...t,
        leader_name: t.leader_user_id ? nameByUid.get(t.leader_user_id) ?? null : null,
        member_count: counts.get(t.id) ?? 0,
      }));
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? teams.filter((t) => t.name.toLowerCase().includes(q)) : teams;
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

      {/* Tabela densa */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_120px_140px_32px] gap-4 px-5 py-2.5 bg-muted/30 border-b border-border/40 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
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
                  <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_120px_140px_32px] gap-4 px-5 py-3 items-center hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="rounded-lg bg-primary/10 p-1.5 shrink-0">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-[13px] font-medium text-foreground truncate">{t.name}</span>
                    </div>
                    <div className="text-[13px] text-muted-foreground truncate">
                      {t.leader_name ?? (t.leader_user_id ? 'Líder externo' : <span className="italic">Sem líder</span>)}
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
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLeaderTeam(t)}>
                          <UserCog className="h-3.5 w-3.5 mr-2" /> Trocar líder
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
            onSuccess={refresh}
          />
          <DeleteTeamDialog
            open={!!deleteTeam}
            onOpenChange={(o) => !o && setDeleteTeam(null)}
            team={deleteTeam}
            workspaceId={workspaceId}
            onSuccess={refresh}
          />
          <ChangeTeamLeaderDialog
            open={!!leaderTeam}
            onOpenChange={(o) => !o && setLeaderTeam(null)}
            team={leaderTeam}
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

function InvitesTab({ onInvite }: { onInvite: () => void }) {
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
        <Button onClick={onInvite} className="rounded-xl gap-2">
          <UserPlus className="w-4 h-4" /> Convidar liderados
        </Button>
      </div>

      {!pending?.length ? (
        <EmptyStateHero
          icon={MailPlus}
          title="Sem convites pendentes"
          description="Adicione liderados em massa colando uma lista de e-mails. Cada um recebe um convite personalizado."
          ctaLabel="Convidar liderados"
          ctaIcon={UserPlus}
          onCta={onInvite}
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
      content: <InvitesTab onInvite={() => setInviteOpen(true)} />,
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
          {canManageTeams && (
            <Button
              variant="outline"
              onClick={() => setNewTeamOpen(true)}
              className="rounded-xl gap-2"
            >
              <Plus className="w-4 h-4" /> Adicionar time
            </Button>
          )}
          <Button
            onClick={() => setNewMemberOpen(true)}
            className="rounded-xl gap-2"
            disabled={!workspace}
          >
            <UserPlus className="w-4 h-4" /> Adicionar liderado
          </Button>
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
        workspaceNames={workspaceId ? [workspaceId] : []}
      />
    </div>
  );
}
