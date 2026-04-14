import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Rocket, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface SetupChecklistProps {
  hasMembers: boolean;
  hasFeedbacks: boolean;
  hasAIAnalysis: boolean;
  hasMentorChat: boolean;
  hasLeaderSync?: boolean;
  onAddMember: () => void;
  onAddNote: () => void;
  onOpenMentor: () => void;
  onOpenLeaderSync?: () => void;
}

export const SetupChecklist = ({
  hasMembers,
  hasFeedbacks,
  hasAIAnalysis,
  hasMentorChat,
  hasLeaderSync = false,
  onAddMember,
  onAddNote,
  onOpenMentor,
  onOpenLeaderSync,
}: SetupChecklistProps) => {
  const { t } = useTranslation();

  const steps = [
    { 
      label: t('setup.registerFirstMember'), 
      done: hasMembers, 
      action: onAddMember,
      actionLabel: t('setup.addAction')
    },
    { 
      label: t('setup.configureLeadership'), 
      done: hasLeaderSync, 
      action: onOpenLeaderSync,
      actionLabel: t('setup.threeMin'),
      disabled: false
    },
    { 
      label: t('setup.createTestNote'), 
      done: hasFeedbacks, 
      action: onAddNote,
      actionLabel: t('setup.createNoteAction'),
      disabled: !hasMembers
    },
    { 
      label: t('setup.generateAISummary'), 
      done: hasAIAnalysis, 
      action: onAddNote,
      actionLabel: t('setup.createNoteAction'),
      disabled: !hasMembers
    },
    { 
      label: t('setup.askMentor'), 
      done: hasMentorChat, 
      action: onOpenMentor,
      actionLabel: t('setup.chatAction'),
      disabled: !hasMembers
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const progress = (completedCount / steps.length) * 100;
  const isComplete = completedCount === steps.length;

  if (isComplete) return null;

  return (
    <Card className="border-primary/20 bg-primary/5 mb-8">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Rocket className="h-5 w-5 text-primary" />
            {t('setup.title')}
          </CardTitle>
          <Badge variant="secondary" className="font-medium">
            {completedCount}/{steps.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, i) => (
          <div 
            key={i}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-all",
              step.done 
                ? "bg-muted/50 border-muted" 
                : "bg-background border-border hover:border-primary/30"
            )}
          >
            <div className="flex items-center gap-3">
              {step.done ? (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              ) : (
                <Checkbox checked={false} disabled className="h-5 w-5" />
              )}
              <span className={cn(
                "text-sm",
                step.done ? "line-through text-muted-foreground" : "text-foreground"
              )}>
                {step.label}
              </span>
            </div>
            {!step.done && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={step.action}
                disabled={step.disabled}
                className="text-primary hover:text-primary hover:bg-primary/10"
              >
                {step.actionLabel}
              </Button>
            )}
          </div>
        ))}
        
        <div className="pt-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center mt-2">
            {t('setup.stepsCompleted', { completed: completedCount, total: steps.length })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
