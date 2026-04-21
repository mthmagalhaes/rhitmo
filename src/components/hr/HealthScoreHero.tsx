import { useTranslation } from 'react-i18next';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';

interface HealthScoreHeroProps {
  score?: number;
  history?: Array<{ week_offset: number; health_score: number }>;
  loading?: boolean;
}

export function HealthScoreHero({ score = 0, history = [], loading }: HealthScoreHeroProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className="rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-8">
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  const chartData = [...history].sort((a, b) => b.week_offset - a.week_offset).map((h, idx) => ({
    week: `W-${3 - idx}`,
    score: h.health_score,
  }));

  // Trend
  const previous = chartData.length >= 2 ? chartData[chartData.length - 2].score : score;
  const delta = score - previous;
  const TrendIcon = delta > 2 ? TrendingUp : delta < -2 ? TrendingDown : Minus;
  const trendColor =
    delta > 2 ? 'text-emerald-500' : delta < -2 ? 'text-destructive' : 'text-muted-foreground';

  const tone =
    score >= 70
      ? { from: 'from-emerald-400', to: 'to-emerald-600', text: 'text-emerald-600' }
      : score >= 40
      ? { from: 'from-amber-400', to: 'to-amber-600', text: 'text-amber-600' }
      : { from: 'from-destructive', to: 'to-destructive', text: 'text-destructive' };

  return (
    <Card className="rounded-3xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-8 mb-8 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t('hr.healthScore.title')}
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="flex items-end gap-3 group">
                  <p
                    className={`text-7xl font-bold tracking-tight bg-gradient-to-br ${tone.from} ${tone.to} bg-clip-text text-transparent`}
                  >
                    {score}
                  </p>
                  <span className="text-xl font-medium text-muted-foreground mb-3">/100</span>
                  <div className={`flex items-center gap-1 mb-3 ${trendColor}`}>
                    <TrendIcon className="h-4 w-4" />
                    {delta !== 0 && <span className="text-xs font-medium">{delta > 0 ? '+' : ''}{delta}</span>}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">{t('hr.healthScore.formulaTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <p className="text-sm text-muted-foreground mt-2">
            {score >= 70
              ? t('hr.healthScore.statusGood')
              : score >= 40
              ? t('hr.healthScore.statusMid')
              : t('hr.healthScore.statusLow')}
          </p>
        </div>

        <div className="h-24 md:h-28">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <YAxis hide domain={[0, 100]} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              {t('hr.healthScore.notEnoughData')}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
