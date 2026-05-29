// Barra de filtros do Diário v2 — substitui a master list lateral.
// Estado vive na URL (member, team, period, q, tags, source, from, to, sort).
import { Search, CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getTagLabel } from '@/lib/tagConfig';
import { SlackIcon } from '@/components/icons/SlackIcon';
import type { LeaderMemberRow } from '@/hooks/useLeaderMembers';
import type { Team } from '@/types/team';
import type { DateRange } from 'react-day-picker';

export type DiarySource = 'all' | 'slack';

export type Period = '7d' | '30d' | '90d' | 'all';
export type SortOrder = 'newest' | 'oldest';

const FILTER_TAGS = [
  { key: '1:1', emoji: '🎯' },
  { key: 'Check-in', emoji: '✅' },
  { key: 'Feedback Difícil', emoji: '🚨' },
  { key: 'Oportunidade de Melhoria', emoji: '⚠️' },
  { key: 'Destaque Positivo', emoji: '⭐' },
];

interface DiaryFiltersProps {
  members: LeaderMemberRow[];
  teams: Team[];
  memberId: string;
  teamId: string;
  period: Period;
  query: string;
  selectedTags: string[];
  source: DiarySource;
  dateRange: DateRange | undefined;
  sort: SortOrder;
  onMemberChange: (id: string) => void;
  onTeamChange: (id: string) => void;
  onPeriodChange: (p: Period) => void;
  onQueryChange: (q: string) => void;
  onTagsChange: (tags: string[]) => void;
  onSourceChange: (s: DiarySource) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onSortChange: (s: SortOrder) => void;
}

export function DiaryFilters({
  members,
  teams,
  memberId,
  teamId,
  period,
  query,
  selectedTags,
  source,
  dateRange,
  sort,
  onMemberChange,
  onTeamChange,
  onPeriodChange,
  onQueryChange,
  onTagsChange,
  onSourceChange,
  onDateRangeChange,
  onSortChange,
}: DiaryFiltersProps) {
  const hasDateFilter = !!dateRange?.from;
  const toggleTag = (key: string) => {
    if (selectedTags.includes(key)) onTagsChange(selectedTags.filter((t) => t !== key));
    else onTagsChange([...selectedTags, key]);
  };
  const formatDateRange = () => {
    if (!dateRange?.from) return null;
    const from = format(dateRange.from, 'dd MMM', { locale: ptBR });
    if (!dateRange.to) return from;
    const to = format(dateRange.to, 'dd MMM', { locale: ptBR });
    return `${from} – ${to}`;
  };

  return (
    <div className="flex flex-col gap-3 p-3 bg-muted/30 rounded-xl border">
      {/* Linha 1 — busca + liderado + time + período */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar nas notas…"
            className="pl-9 rounded-lg h-9 text-sm"
          />
        </div>

        <Select value={memberId} onValueChange={onMemberChange}>
          <SelectTrigger className="w-full sm:w-[180px] rounded-lg h-9 text-sm">
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
            <SelectTrigger className="w-full sm:w-[150px] rounded-lg h-9 text-sm">
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
          <SelectTrigger className="w-full sm:w-[130px] rounded-lg h-9 text-sm">
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

      {/* Linha 2 — chips de tag + data customizada + ordenação */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {FILTER_TAGS.map((tag) => (
            <Button
              key={tag.key}
              variant={selectedTags.includes(tag.key) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleTag(tag.key)}
              className="h-8 text-xs gap-1"
            >
              {tag.emoji} {getTagLabel(tag.key)}
            </Button>
          ))}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 gap-1.5 shrink-0 text-xs',
                hasDateFilter && 'border-primary text-primary',
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {hasDateFilter ? formatDateRange() : 'Filtrar data'}
              {hasDateFilter && (
                <X
                  className="h-3.5 w-3.5 ml-1 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDateRangeChange(undefined);
                  }}
                />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
              locale={ptBR}
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>

        <Select value={sort} onValueChange={(v) => onSortChange(v as SortOrder)}>
          <SelectTrigger className="w-[140px] h-8 shrink-0 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Mais recentes</SelectItem>
            <SelectItem value="oldest">Mais antigos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
