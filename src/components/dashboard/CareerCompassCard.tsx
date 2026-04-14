import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Compass, AlertTriangle, Target, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export interface AIAnalysis {
  alignment_score: number;
  analysis_summary: string;
  key_gaps: string[];
  suggested_focus: string[];
  analyzed_at?: string;
}

interface CareerCompassCardProps {
  aiAnalysis: AIAnalysis;
}

function getProgressColor(score: number): string {
  if (score >= 80) return '[&>div]:bg-green-500';
  if (score >= 50) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-orange-500';
}

export function CareerCompassCard({ aiAnalysis }: CareerCompassCardProps) {
  const { t } = useTranslation();
  const { alignment_score, analysis_summary, key_gaps, suggested_focus } = aiAnalysis;

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return t('skillsMap.excellentAlignment');
    if (score >= 50) return t('skillsMap.moderateAlignment');
    return t('skillsMap.realignmentOpportunity');
  };

  return (
    <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] bg-gradient-to-br from-card to-primary/5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-foreground">
          <Compass className="h-5 w-5 text-primary" />
          {t('skillsMap.careerCompass')}
        </h2>
        <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          <Sparkles className="h-3 w-3" />
          {t('skillsMap.ai')}
        </span>
      </div>

      {/* Alignment Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{t('skillsMap.roleAlignment')}</span>
          <span className={cn("text-2xl font-bold", getScoreColor(alignment_score))}>
            {alignment_score}%
          </span>
        </div>
        <Progress 
          value={alignment_score} 
          className={cn("h-3", getProgressColor(alignment_score))}
        />
        <p className={cn("text-xs mt-1", getScoreColor(alignment_score))}>
          {getScoreLabel(alignment_score)}
        </p>
      </div>

      {/* Analysis Summary */}
      <div className="mb-6 p-4 bg-muted/50 rounded-xl border border-border/50">
        <p className="text-sm text-foreground italic leading-relaxed">
          "{analysis_summary}"
        </p>
      </div>

      {/* Two Columns: Gaps and Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Gaps */}
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2 mb-3 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t('skillsMap.attentionPoints')}
          </h3>
          <ul className="space-y-2">
            {key_gaps.map((gap, index) => (
              <li 
                key={index} 
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <span className="text-destructive mt-1">•</span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Suggested Focus */}
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2 mb-3 text-primary">
            <Target className="h-4 w-4" />
            {t('skillsMap.recommendedFocus')}
          </h3>
          <ul className="space-y-2">
            {suggested_focus.map((focus, index) => (
              <li 
                key={index} 
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <span className="text-primary mt-1">•</span>
                <span>{focus}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
