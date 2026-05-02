import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { GoalCard } from './GoalCard';
import { NewGoalDialog } from './NewGoalDialog';
import { Plus, Target, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isPast, isToday } from 'date-fns';

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

interface GoalsManagerProps {
  memberId: string;
  /** Quando true, esconde o botão "Nova Meta" do cabeçalho interno
   *  (usar em páginas que já oferecem o CTA de criação no header da própria página,
   *  evitando duplicação). Default: false. */
  hideHeaderAction?: boolean;
}

export const GoalsManager = ({ memberId, hideHeaderAction = false }: GoalsManagerProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [reactivating, setReactivating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Goal[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const activeGoals = goals.filter(g => g.status === 'active');
  const historyGoals = goals.filter(g => g.status === 'completed' || g.status === 'archived');
  
  const overdueCount = activeGoals.filter(g => {
    if (!g.target_date) return false;
    const date = new Date(g.target_date);
    return isPast(date) && !isToday(date);
  }).length;

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setReactivating(false);
    setDialogOpen(true);
  };

  const handleReactivate = (goal: Goal) => {
    setEditingGoal(goal);
    setReactivating(true);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Meta excluída" });
      queryClient.invalidateQueries({ queryKey: ['goals', memberId] });
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Meta concluída! 🎉" });
      queryClient.invalidateQueries({ queryKey: ['goals', memberId] });
    } catch (error: any) {
      toast({ title: "Erro ao concluir", description: error.message, variant: "destructive" });
    }
  };

  const handleNewGoal = () => {
    setEditingGoal(null);
    setReactivating(false);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <span className="font-medium">
            {activeGoals.length} meta{activeGoals.length !== 1 ? 's' : ''} ativa{activeGoals.length !== 1 ? 's' : ''}
          </span>
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {overdueCount} atrasada{overdueCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {!hideHeaderAction && (
          <Button onClick={handleNewGoal} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Meta
          </Button>
        )}
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="gap-2">
            Ativas ({activeGoals.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            Histórico ({historyGoals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-3">
          {activeGoals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Nenhuma meta ativa</p>
              <p className="text-sm">Clique em "Nova Meta" para começar</p>
            </div>
          ) : (
            activeGoals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onComplete={handleComplete}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          {historyGoals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma meta no histórico</p>
              <p className="text-sm">Metas concluídas ou arquivadas aparecem aqui</p>
            </div>
          ) : (
            historyGoals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onComplete={handleComplete}
                onReactivate={handleReactivate}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <NewGoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        memberId={memberId}
        editingGoal={editingGoal}
        reactivating={reactivating}
      />
    </div>
  );
};
