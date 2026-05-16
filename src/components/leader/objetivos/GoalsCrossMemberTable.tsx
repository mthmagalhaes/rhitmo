// Tabela densa cross-member para /lider/objetivos. 1 linha por liderado com
// resumo das metas (ativas, próxima due, % conclusão) e ação rápida.
import { useMemo, useState } from 'react';
import { format, parseISO, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, ChevronRight, AlertTriangle, Plus, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MemberAvatar } from '@/components/MemberAvatar';
import { cn } from '@/lib/utils';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';
import type { Team } from '@/types/team';
import type { MemberGoalsSummary } from '@/hooks/useTeamGoalsSummary';

type StatusFilter = 'all' | 'with_active' | 'without_active' | 'overdue';

interface Props {
  members: LeaderMemberRow[];
  teams: Team[];
  summaryByMember: Map<string, MemberGoalsSummary>;
  onOpenMember: (m: LeaderMemberRow) => void;
  onNewGoal: (m: LeaderMemberRow) => void;
}

export function GoalsCrossMemberTable({
  members,
  teams,
  summaryByMember,
  onOpenMember,
  onNewGoal,
}: Props) {
  const [query, setQuery] = useState('');
  const [teamId, setTeamId] = useState<string>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  const teamById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t.name])),
    [teams],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => (teamId === 'all' ? true : m.team_id === teamId))
      .filter((m) =>
        q ? m.name.toLowerCase().includes(q) || (m.role ?? '').toLowerCase().includes(q) : true,
      )
      .filter((m) => {
        const s = summaryByMember.get(m.id);
        if (status === 'all') return true;
        if (status === 'with_active') return (s?.active ?? 0) > 0;
        if (status === 'without_active') return (s?.active ?? 0) === 0;
        if (status === 'overdue') return (s?.overdue ?? 0) > 0;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [members, query, teamId, status, summaryByMember]);

  const counters = useMemo(() => {
    let withActive = 0, withoutActive = 0, overdue = 0;
    for (const m of members) {
      const s = summaryByMember.get(m.id);
      if ((s?.active ?? 0) > 0) withActive++;
      else withoutActive++;
      if ((s?.overdue ?? 0) > 0) overdue++;
    }
    return { all: members.length, withActive, withoutActive, overdue };
  }, [members, summaryByMember]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar liderado…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-9 rounded-xl"
          />
        </div>
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger className="h-9 rounded-xl w-[160px]">
            <SelectValue placeholder="Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os times</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5 ml-auto">
          {(
            [
              ['all', 'Todos', counters.all],
              ['with_active', 'Com metas', counters.withActive],
              ['without_active', 'Sem metas', counters.withoutActive],
              ['overdue', 'Atrasadas', counters.overdue],
            ] as const
          ).map(([key, label, count]) => (
            <Button
              key={key}
              variant={status === key ? 'default' : 'outline'}
              size="sm"
              className="h-8 rounded-full text-xs"
              onClick={() => setStatus(key as StatusFilter)}
            >
              {label} <span className="ml-1 opacity-70">{count}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1fr_0.7fr_1fr_1fr_auto] gap-3 px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
          <div>Liderado</div>
          <div>Time</div>
          <div>Metas ativas</div>
          <div>Próxima due</div>
          <div>% concluído</div>
          <div />
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum liderado para os filtros atuais.
          </div>
        ) : (
          filtered.map((m) => {
            const s = summaryByMember.get(m.id);
            const active = s?.active ?? 0;
            const overdue = s?.overdue ?? 0;
            const nextDue = s?.nextDue ? parseISO(s.nextDue) : null;
            const isLate = nextDue && isBefore(nextDue, new Date());
            const pct = s?.percentComplete ?? 0;
            return (
              <button
                key={m.id}
                onClick={() => onOpenMember(m)}
                className="w-full text-left grid grid-cols-[1.4fr_1fr_0.7fr_1fr_1fr_auto] gap-3 items-center px-4 py-2.5 border-b last:border-b-0 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MemberAvatar memberId={m.id} memberName={m.name} avatarUrl={m.avatar} size="sm" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.name}</div>
                    {m.role && (
                      <div className="text-xs text-muted-foreground truncate">{m.role}</div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {m.team_id ? teamById[m.team_id] ?? '—' : '—'}
                </div>
                <div className="text-sm">
                  {active === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <Badge variant="secondary" className="rounded-full">
                      {active}
                      {overdue > 0 && (
                        <span className="ml-1 inline-flex items-center text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="h-3 w-3" />
                        </span>
                      )}
                    </Badge>
                  )}
                </div>
                <div className={cn('text-sm', isLate && 'text-rose-600 dark:text-rose-400')}>
                  {nextDue ? format(nextDue, "dd MMM yyyy", { locale: ptBR }) : <span className="text-muted-foreground">—</span>}
                </div>
                <div className="flex items-center gap-2">
                  {active === 0 ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : (
                    <>
                      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onNewGoal(m); }}>
                        <Plus className="h-4 w-4 mr-2" /> Nova meta
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenMember(m); }}>
                        <ChevronRight className="h-4 w-4 mr-2" /> Ver objetivos
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
