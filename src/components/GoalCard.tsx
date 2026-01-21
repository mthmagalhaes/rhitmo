import { useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Edit2, Trash2, MoreHorizontal, Archive, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface Goal {
  id: string;
  member_id: string;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived';
  start_date: string | null;
  target_date: string | null;
  metric_current: number | null;
  metric_target: number | null;
  metric_unit: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onComplete: (goal: Goal) => void;
  onArchive: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onReactivate?: (goal: Goal) => void;
  isHistory?: boolean;
}

export function GoalCard({ 
  goal, 
  onEdit, 
  onComplete, 
  onArchive, 
  onDelete,
  onReactivate,
  isHistory = false 
}: GoalCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOverdue = goal.target_date && isPast(new Date(goal.target_date)) && !isToday(new Date(goal.target_date)) && goal.status === 'active';
  
  const progress = goal.metric_target && goal.metric_current !== null
    ? Math.min(100, Math.round((goal.metric_current / goal.metric_target) * 100))
    : null;

  const getStatusBadge = () => {
    if (goal.status === 'completed') {
      return <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">Concluída</Badge>;
    }
    if (goal.status === 'archived') {
      return <Badge variant="secondary">Arquivada</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="destructive">Atrasada</Badge>;
    }
    return <Badge variant="outline" className="bg-accent text-accent-foreground">Em dia</Badge>;
  };

  const formatMetric = () => {
    if (!goal.metric_target) return null;
    const current = goal.metric_current ?? 0;
    const unit = goal.metric_unit || '';
    return `${current} → ${goal.metric_target} ${unit}`;
  };

  return (
    <>
      <div 
        className={cn(
          "group relative border rounded-lg p-4 transition-all hover:shadow-sm",
          isHistory && "opacity-70",
          isOverdue && "border-destructive/50 bg-destructive/5"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate">{goal.title}</h4>
              {getStatusBadge()}
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              {formatMetric() && (
                <p>Meta: {formatMetric()}</p>
              )}
              {goal.target_date && (
                <p>
                  Prazo: {format(new Date(goal.target_date), "dd/MMM/yyyy", { locale: ptBR })}
                </p>
              )}
            </div>

            {progress !== null && (
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Edit button - available for all statuses */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(goal)}
              title="Editar"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            
            {/* Complete button - only for active goals */}
            {goal.status === 'active' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10"
                onClick={() => onComplete(goal)}
                title="Marcar como concluída"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            
            {isHistory && onReactivate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10"
                onClick={() => onReactivate(goal)}
                title="Reativar meta"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {goal.status !== 'archived' && (
                  <DropdownMenuItem onClick={() => onArchive(goal)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Arquivar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A meta "{goal.title}" será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(goal);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
