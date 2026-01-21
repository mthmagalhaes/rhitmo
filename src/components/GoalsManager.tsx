import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Target, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GoalCard, type Goal } from "./GoalCard";
import { NewGoalDialog } from "./NewGoalDialog";

interface GoalsManagerProps {
  memberId: string;
  memberName: string;
}

export function GoalsManager({ memberId, memberName }: GoalsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goals", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Goal[];
    },
    enabled: !!memberId,
  });

  const activeGoals = goals.filter((g) => g.status === "active");
  const historyGoals = goals.filter((g) => g.status !== "active");

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setDialogOpen(true);
  };

  const handleNewGoal = () => {
    setEditingGoal(null);
    setDialogOpen(true);
  };

  const handleComplete = async (goal: Goal) => {
    try {
      // If there's a metric target, set current to target
      const updates: Partial<Goal> = {
        status: "completed",
        completed_at: new Date().toISOString(),
      };
      
      if (goal.metric_target !== null) {
        updates.metric_current = goal.metric_target;
      }

      const { error } = await supabase
        .from("goals")
        .update(updates)
        .eq("id", goal.id);

      if (error) throw error;

      toast({
        title: "Meta concluída! 🎉",
        description: `"${goal.title}" foi marcada como concluída.`,
      });

      queryClient.invalidateQueries({ queryKey: ["goals", memberId] });
    } catch (error: any) {
      console.error("Error completing goal:", error);
      toast({
        title: "Erro",
        description: "Não foi possível concluir a meta.",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async (goal: Goal) => {
    try {
      const { error } = await supabase
        .from("goals")
        .update({ status: "archived" })
        .eq("id", goal.id);

      if (error) throw error;

      toast({
        title: "Meta arquivada",
        description: `"${goal.title}" foi arquivada.`,
      });

      queryClient.invalidateQueries({ queryKey: ["goals", memberId] });
    } catch (error: any) {
      console.error("Error archiving goal:", error);
      toast({
        title: "Erro",
        description: "Não foi possível arquivar a meta.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (goal: Goal) => {
    try {
      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", goal.id);

      if (error) throw error;

      toast({
        title: "Meta excluída",
        description: `"${goal.title}" foi excluída permanentemente.`,
      });

      queryClient.invalidateQueries({ queryKey: ["goals", memberId] });
    } catch (error: any) {
      console.error("Error deleting goal:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a meta.",
        variant: "destructive",
      });
    }
  };

  const handleGoalSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["goals", memberId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="active" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="h-9">
            <TabsTrigger value="active" className="text-xs px-3">
              <Target className="h-3.5 w-3.5 mr-1.5" />
              Ativas ({activeGoals.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs px-3">
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              Histórico ({historyGoals.length})
            </TabsTrigger>
          </TabsList>

          <Button size="sm" onClick={handleNewGoal}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Meta
          </Button>
        </div>

        <TabsContent value="active" className="mt-0">
          {activeGoals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma meta ativa</p>
              <p className="text-xs">Clique em "Nova Meta" para criar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={handleEdit}
                  onComplete={handleComplete}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          {historyGoals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Archive className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma meta no histórico</p>
              <p className="text-xs">Metas concluídas ou arquivadas aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={handleEdit}
                  onComplete={handleComplete}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  isHistory
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NewGoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        memberId={memberId}
        memberName={memberName}
        editingGoal={editingGoal}
        onGoalSaved={handleGoalSaved}
      />
    </div>
  );
}

// Export hook for getting goals data (for dynamic accordion title)
export function useGoalsData(memberId: string) {
  return useQuery({
    queryKey: ["goals", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Goal[];
    },
    enabled: !!memberId,
  });
}
