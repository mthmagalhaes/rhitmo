// Barra de filtros leve do Diário v2 — substitui a master list lateral.
// Estado vive na URL (member, team, period, q) pra preservar deep-link.
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';
import type { Team } from '@/types/team';

export type Period = '7d' | '30d' | '90d' | 'all';

interface DiaryFiltersProps {
  members: LeaderMemberRow[];
  teams: Team[];
  memberId: string;
  teamId: string;
  period: Period;
  query: string;
  onMemberChange: (id: string) => void;
  onTeamChange: (id: string) => void;
  onPeriodChange: (p: Period) => void;
  onQueryChange: (q: string) => void;
}

export function DiaryFilters({
  members,
  teams,
  memberId,
  teamId,
  period,
  query,
  onMemberChange,
  onTeamChange,
  onPeriodChange,
  onQueryChange,
}: DiaryFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar nas notas…"
          className="pl-9 rounded-xl h-9 text-sm"
        />
      </div>

      <Select value={memberId} onValueChange={onMemberChange}>
        <SelectTrigger className="w-full sm:w-[180px] rounded-xl h-9 text-sm">
          <SelectValue placeholder="Liderado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os liderados</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {teams.length > 1 && (
        <Select value={teamId} onValueChange={onTeamChange}>
          <SelectTrigger className="w-full sm:w-[150px] rounded-xl h-9 text-sm">
            <SelectValue placeholder="Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os times</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={period} onValueChange={(v) => onPeriodChange(v as Period)}>
        <SelectTrigger className="w-full sm:w-[130px] rounded-xl h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Últimos 7 dias</SelectItem>
          <SelectItem value="30d">Últimos 30 dias</SelectItem>
          <SelectItem value="90d">Últimos 90 dias</SelectItem>
          <SelectItem value="all">Tudo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
