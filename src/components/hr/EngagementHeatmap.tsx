import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity } from 'lucide-react';

interface WeekData {
  week_start: string;
  week_label: string;
  count: number;
}

interface LeaderHeatmap {
  leader_id: string;
  leader_name: string;
  weeks: WeekData[];
}

interface EngagementHeatmapProps {
  data: LeaderHeatmap[];
  isLoading?: boolean;
}

function getHeatColor(count: number, maxCount: number): string {
  if (count === 0) return 'bg-muted';
  const ratio = maxCount > 0 ? count / maxCount : 0;
  if (ratio >= 0.75) return 'bg-emerald-500 dark:bg-emerald-400';
  if (ratio >= 0.4) return 'bg-emerald-300 dark:bg-emerald-600';
  if (ratio > 0) return 'bg-yellow-300 dark:bg-yellow-600';
  return 'bg-muted';
}

export function EngagementHeatmap({ data, isLoading }: EngagementHeatmapProps) {
  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Engajamento por Líder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find max count across all data for color scaling
  const maxCount = Math.max(
    1,
    ...data.flatMap((l) => (l.weeks || []).map((w) => w.count))
  );

  const weekLabels = data[0]?.weeks?.map((w) => w.week_label) || [];

  return (
    <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Engajamento por Líder (últimas 8 semanas)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhum dado disponível
          </div>
        ) : (
          <div className="space-y-3">
            {/* Week headers */}
            <div className="flex items-center gap-1.5">
              <div className="w-28 shrink-0" />
              {weekLabels.map((label, i) => (
                <div
                  key={i}
                  className="flex-1 text-center text-[10px] text-muted-foreground font-medium"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Leader rows */}
            <TooltipProvider delayDuration={100}>
              {data.map((leader) => (
                <div key={leader.leader_id} className="flex items-center gap-1.5">
                  <div className="w-28 shrink-0 text-xs font-medium text-foreground truncate">
                    {leader.leader_name?.split(' ')[0] || 'N/A'}
                  </div>
                  {(leader.weeks || []).map((week, i) => (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex-1 aspect-square rounded-md cursor-default transition-colors ${getHeatColor(week.count, maxCount)}`}
                          style={{ minHeight: 24, maxHeight: 36 }}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="rounded-xl text-xs">
                        <p className="font-medium">{leader.leader_name}</p>
                        <p>Semana {week.week_label}: {week.count} feedback{week.count !== 1 ? 's' : ''}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </TooltipProvider>

            {/* Legend */}
            <div className="flex items-center gap-2 pt-2 justify-end">
              <span className="text-[10px] text-muted-foreground">Menos</span>
              <div className="w-4 h-4 rounded bg-muted" />
              <div className="w-4 h-4 rounded bg-yellow-300 dark:bg-yellow-600" />
              <div className="w-4 h-4 rounded bg-emerald-300 dark:bg-emerald-600" />
              <div className="w-4 h-4 rounded bg-emerald-500 dark:bg-emerald-400" />
              <span className="text-[10px] text-muted-foreground">Mais</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
