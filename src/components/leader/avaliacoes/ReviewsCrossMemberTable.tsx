// Tabela densa cross-member para /lider/avaliacoes. 1 linha por liderado com
// estado do Rhitmo, datas dos últimos recaps e ação sugerida.
import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, ChevronRight, MoreHorizontal, Sparkles, Music } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { MemberAvatar } from '@/components/MemberAvatar';
import { cn } from '@/lib/utils';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';
import type { Team } from '@/types/team';
import type { MemberReviewsSummary } from '@/hooks/useTeamReviewsSummary';
import { RHITMO_CHIP, RHITMO_LABEL, RHITMO_TOOLTIP } from '@/lib/rhitmoState';

type ChipFilter = 'all' | 'needs_monthly' | 'no_formal_6m';

interface Props {
  members: LeaderMemberRow[];
  teams: Team[];
  summaryByMember: Map<string, MemberReviewsSummary>;
  onOpenMember: (m: LeaderMemberRow, initialTab?: 'monthly' | 'formal') => void;
  onCreateFormal: (m: LeaderMemberRow) => void;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  try {
    return format(parseISO(iso), "MMM yyyy", { locale: ptBR });
  } catch {
    return null;
  }
}

function monthsAgo(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

function humanMonthsAgo(n: number | null): string | null {
  if (n === null) return null;
  if (n <= 0) return 'este mês';
  if (n === 1) return 'há 1 mês';
  return `há ${n} meses`;
}

// Prioridade para ordenação inteligente (menor = mais urgente)
function priority(s: MemberReviewsSummary | undefined): number {
  if (!s) return 4;
  if (s.rhitmoState === 'B') return 0; // rascunho pendente — CTA mais quente
  const m = monthsAgo(s.lastMonthlyAt);
  if (s.lastMonthlyAt === null || (m !== null && m >= 2)) return 1; // atrasado / sem histórico
  if (!s.hasCurrentMonthRecap) return 2; // mês corrente faltando
  return 3; // em dia
}

export function ReviewsCrossMemberTable({
  members,
  teams,
  summaryByMember,
  onOpenMember,
  onCreateFormal,
}: Props) {
  const [query, setQuery] = useState('');
  const [teamId, setTeamId] = useState<string>('all');
  // Default: chama atenção para quem está sem Rhitmo Formal há 6+ meses.
  const [chip, setChip] = useState<ChipFilter>('no_formal_6m');

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
        if (chip === 'all') return true;
        if (chip === 'needs_monthly') return s ? !s.hasCurrentMonthRecap : true;
        if (chip === 'no_formal_6m') {
          const m6 = monthsAgo(s?.lastFormalAt ?? null);
          return m6 === null || m6 >= 6;
        }
        return true;
      })
      .sort((a, b) => {
        // Ordenação inteligente: rascunho pendente → atrasados → mês corrente faltando → resto
        const pa = priority(summaryByMember.get(a.id));
        const pb = priority(summaryByMember.get(b.id));
        if (pa !== pb) return pa - pb;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
  }, [members, query, teamId, chip, summaryByMember]);

  const counters = useMemo(() => {
    let needsMonthly = 0, noFormal6m = 0;
    for (const m of members) {
      const s = summaryByMember.get(m.id);
      if (s && !s.hasCurrentMonthRecap) needsMonthly++;
      const m6 = monthsAgo(s?.lastFormalAt ?? null);
      if (m6 === null || m6 >= 6) noFormal6m++;
    }
    return { all: members.length, needsMonthly, noFormal6m };
  }, [members, summaryByMember]);

  // Formal-first: chip destaca cobertura de avaliação formal primeiro.
  const visibleChips = useMemo(() => {
    const items: Array<readonly [ChipFilter, string, number]> = [
      ['no_formal_6m', 'Sem Formal 6m+', counters.noFormal6m],
      ['needs_monthly', 'Sem Mensal', counters.needsMonthly],
      ['all', 'Todos', counters.all],
    ];
    return items;
  }, [counters]);

  return (
    <TooltipProvider delayDuration={200}>
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
            {visibleChips.map(([key, label, count]) => (
              <Button
                key={key}
                variant={chip === key ? 'default' : 'outline'}
                size="sm"
                className="h-8 rounded-full text-xs"
                onClick={() => setChip(key as ChipFilter)}
              >
                {label} <span className="ml-1 opacity-70">{count}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Tabela — Formal-first: Últ. Formal antes de Últ. Mensal */}
        <div className="rounded-3xl border bg-card overflow-hidden shadow-[0_2px_28px_rgba(0,0,0,0.04)]">
          <div className="grid grid-cols-[1.4fr_0.9fr_1fr_1fr_0.9fr_1.1fr_auto] gap-3 px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground border-b bg-muted/20">
            <div>Liderado</div>
            <div>Time</div>
            <div>Últ. Formal</div>
            <div>Últ. Mensal</div>
            <div>Cadência</div>
            <div>Próxima ação</div>
            <div />
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhum liderado para os filtros atuais.
            </div>
          ) : (
            filtered.map((m) => {
              const s = summaryByMember.get(m.id);
              const monthlyLabel = fmtDate(s?.lastMonthlyAt ?? null);
              const months = monthsAgo(s?.lastMonthlyAt ?? null);
              const monthlyRel = humanMonthsAgo(months);
              const isLate = months !== null && months >= 2;
              const formalLabel = fmtDate(s?.lastFormalAt ?? null);
              const nextAction = s?.nextAction ?? 'none';
              const state = s?.rhitmoState ?? 'C';
              const isOk = nextAction === 'none';
              return (
                <button
                  key={m.id}
                  onClick={() => onOpenMember(m)}
                  className={cn(
                    "w-full text-left grid grid-cols-[1.4fr_0.9fr_1fr_1fr_0.9fr_1.1fr_auto] gap-3 items-center px-4 py-2.5 border-b last:border-b-0 hover:bg-muted/40 hover:opacity-100 transition-all",
                    isOk && "opacity-60",
                  )}
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
                  {/* Últ. Formal — em destaque */}
                  <div className="text-sm font-medium">
                    {formalLabel ?? <span className="text-muted-foreground font-normal">—</span>}
                  </div>
                  {/* Últ. Mensal */}
                  <div className="text-sm min-w-0">
                    {monthlyLabel ? (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-muted-foreground">
                          {monthlyLabel}
                          {monthlyRel && (
                            <span> · {monthlyRel}</span>
                          )}
                        </span>
                        {isLate && (
                          <Badge
                            variant="outline"
                            className="rounded-full text-[10px] px-1.5 py-0 h-4 bg-destructive/10 text-destructive border-destructive/20 flex-shrink-0"
                          >
                            atrasado
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  {/* Cadência (Rhitmo chip) */}
                  <div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className={cn('rounded-full text-[11px] cursor-help', RHITMO_CHIP[state])}>
                          {RHITMO_LABEL[state]}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px] text-xs">
                        {RHITMO_TOOLTIP[state]}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-sm">
                    {nextAction === 'monthly' && (
                      <span className="inline-flex items-center gap-1.5 text-primary">
                        <Music className="h-3.5 w-3.5" /> Gerar Mensal
                      </span>
                    )}
                    {nextAction === 'formal' && (
                      <span className="inline-flex items-center gap-1.5 text-primary">
                        <Sparkles className="h-3.5 w-3.5" /> Nova Formal
                      </span>
                    )}
                    {nextAction === 'none' && (
                      <span className="text-muted-foreground">Em dia</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon" aria-label="Mais ações"
                          className="h-7 w-7"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenMember(m, 'monthly'); }}>
                          <Music className="h-4 w-4 mr-2" /> Abrir Mensal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenMember(m, 'formal'); }}>
                          <Sparkles className="h-4 w-4 mr-2" /> Abrir Histórico Formal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateFormal(m); }}>
                          <Sparkles className="h-4 w-4 mr-2" /> Nova Avaliação Formal
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
    </TooltipProvider>
  );
}
