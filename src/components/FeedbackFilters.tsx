import { Search, CalendarIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface FeedbackFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  sortOrder: 'newest' | 'oldest';
  onSortChange: (order: 'newest' | 'oldest') => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
}

const FILTER_TAGS = [
  { key: '1:1', emoji: '🎯', label: '1:1' },
  { key: 'PDI', emoji: '🚀', label: 'PDI' },
  { key: 'Check-in', emoji: '✅', label: 'Check-in' },
  { key: 'Feedback Difícil', emoji: '🚨', label: 'Feedback' },
];

export const FeedbackFilters = ({
  searchQuery,
  onSearchChange,
  selectedTags,
  onTagsChange,
  sortOrder,
  onSortChange,
  dateRange,
  onDateRangeChange,
}: FeedbackFiltersProps) => {
  const toggleTag = (tagKey: string) => {
    if (selectedTags.includes(tagKey)) {
      onTagsChange(selectedTags.filter(t => t !== tagKey));
    } else {
      onTagsChange([...selectedTags, tagKey]);
    }
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return null;
    const from = format(dateRange.from, "dd MMM", { locale: ptBR });
    if (!dateRange.to) return from;
    const to = format(dateRange.to, "dd MMM", { locale: ptBR });
    return `${from} – ${to}`;
  };

  const hasDateFilter = !!dateRange?.from;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 p-3 bg-muted/30 rounded-lg border">
      {/* Input de Busca */}
      <div className="relative flex-1 min-w-0 w-full sm:w-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por palavras-chave..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Filtros de Tags (Toggle Buttons) */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTER_TAGS.map(tag => (
          <Button
            key={tag.key}
            variant={selectedTags.includes(tag.key) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleTag(tag.key)}
            className="h-8 text-xs gap-1"
          >
            {tag.emoji} {tag.label}
          </Button>
        ))}
      </div>

      {/* Filtro de Período */}
      {onDateRangeChange && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5 shrink-0 text-xs",
                hasDateFilter && "border-primary text-primary"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {hasDateFilter ? formatDateRange() : "Filtrar data"}
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
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Select de Ordenação */}
      <Select value={sortOrder} onValueChange={(value) => onSortChange(value as 'newest' | 'oldest')}>
        <SelectTrigger className="w-[140px] h-9 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Mais recentes</SelectItem>
          <SelectItem value="oldest">Mais antigos</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
