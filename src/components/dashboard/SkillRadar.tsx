import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip as ReTooltip,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface SkillRadarProps {
  memberId: string;
}

interface RadarPayload {
  axes: {
    alignment: number;
    execution: number;
    communication: number;
    learning: number;
    leadership: number;
  };
  total_notes_90d: number;
  has_data: boolean;
  evidence: Record<string, Array<{ id: string; title: string | null; occurred_at: string }>>;
}

export function SkillRadar({ memberId }: SkillRadarProps) {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery<RadarPayload | null>({
    queryKey: ['skill-radar', memberId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_member_skill_radar', { _member_id: memberId });
      if (error) {
        console.error('[SkillRadar] error:', error);
        return null;
      }
      return data as unknown as RadarPayload;
    },
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!data || !data.has_data) return null;

  const chartData = [
    { axis: t('skillsMap.radar.alignment'), value: data.axes.alignment, key: 'alignment' },
    { axis: t('skillsMap.radar.execution'), value: data.axes.execution, key: 'execution' },
    { axis: t('skillsMap.radar.communication'), value: data.axes.communication, key: 'communication' },
    { axis: t('skillsMap.radar.learning'), value: data.axes.learning, key: 'learning' },
    { axis: t('skillsMap.radar.leadership'), value: data.axes.leadership, key: 'leadership' },
  ];

  return (
    <div className="bg-muted/20 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('skillsMap.radar.title')}
        </p>
        <span className="text-xs text-muted-foreground">
          {t('skillsMap.radar.basedOn', { count: data.total_notes_90d })}
        </span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name={t('skillsMap.radar.score')}
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
            />
            <ReTooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value}/100`, t('skillsMap.radar.score')]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
