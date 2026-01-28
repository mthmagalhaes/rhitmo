import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2, CheckCircle2, Calendar, Target, RotateCcw } from 'lucide-react';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Goal {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  start_date?: string | null;
  target_date?: string | null;
  metric_current?: number | null;
  metric_target?: number | null;
  metric_unit?: string | null;
  completed_at?: string | null;
}

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onReactivate?: (goal: Goal) => void;
}

export const GoalCard = ({ goal, onEdit, onDelete, onComplete, onReactivate }: GoalCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getProgress = () => {
    if (!goal.metric_target || goal.metric_target === 0) return null;
    const current = goal.metric_current || 0;
    return Math.min(Math.round((current / goal.metric_target) * 100), 100);
  };

  const getStatusConfig = () => {
    const isOverdue = goal.target_date && isPast(new Date(goal.target_date)) && !isToday(new Date(goal.target_date));
    
    if (goal.status === 'completed') {
      return { label: 'Concluída', variant: 'default' as const, className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' };
    }
    if (goal.status === 'archived') {
      return { label: 'Arquivada', variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' };
    }
    if (isOverdue) {
      return { label: 'Atrasada', variant: 'destructive' as const, className: 'bg-destructive/10 text-destructive border-destructive/20' };
    }
    const progress = getProgress();
    if (progress !== null && progress > 0) {
      return { label: 'Em Andamento', variant: 'default' as const, className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' };
    }
    return { label: 'Não Iniciada', variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' };
  };

  const formatTargetDate = () => {
    if (!goal.target_date) return null;
    const date = new Date(goal.target_date);
    const days = differenceInDays(date, new Date());
    
    if (isToday(date)) return 'Hoje';
    if (days === 1) return 'Amanhã';
    if (days > 0 && days <= 7) return `em ${days} dias`;
    
    return format(date, "dd 'de' MMM", { locale: ptBR });
  };

  const progress = getProgress();
  const statusConfig = getStatusConfig();
  const isActive = goal.status === 'active';
  const isHistory = goal.status === 'completed' || goal.status === 'archived';

  return (
    <>
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary flex-shrink-0" />
              <h4 className="font-medium text-foreground truncate">{goal.title}</h4>
            </div>

            {goal.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{goal.description}</p>
            )}

            {progress !== null && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>
                    {goal.metric_current || 0}{goal.metric_unit ? ` ${goal.metric_unit}` : ''} → {goal.metric_target}{goal.metric_unit ? ` ${goal.metric_unit}` : ''} ({progress}%)
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className={statusConfig.className}>
                {statusConfig.label}
              </Badge>
              
              {goal.target_date && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatTargetDate()}
                </span>
              )}

              {goal.completed_at && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Concluída em {format(new Date(goal.completed_at), "dd/MM/yy")}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {isActive && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onComplete(goal.id)}
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                title="Marcar como concluída"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
            {isHistory && onReactivate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onReactivate(goal)}
                className="h-8 w-8 text-primary hover:text-primary/80"
                title="Reativar meta"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(goal)}
              className="h-8 w-8"
              title="Editar meta"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              className="h-8 w-8 text-destructive hover:text-destructive"
              title="Excluir meta"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              A meta "{goal.title}" será excluída permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(goal.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
