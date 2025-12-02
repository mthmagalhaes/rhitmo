import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface DeleteTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: { id: string; name: string } | null | undefined;
  workspaceId: string;
  onSuccess: () => void;
}

export const DeleteTeamDialog = ({
  open,
  onOpenChange,
  team,
  workspaceId,
  onSuccess
}: DeleteTeamDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!team || !workspaceId) return;

    setLoading(true);
    try {
      // 1. Encontrar o time "Sem Time" do workspace
      const { data: semTimeTeam, error: findError } = await supabase
        .from('teams')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('name', 'Sem Time')
        .single();

      if (findError || !semTimeTeam) {
        throw new Error('Time "Sem Time" não encontrado');
      }

      // 2. Mover todos os membros para "Sem Time"
      const { error: updateError } = await supabase
        .from('team_members')
        .update({ team_id: semTimeTeam.id })
        .eq('team_id', team.id);

      if (updateError) throw updateError;

      // 3. Excluir o time
      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', team.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Time excluído",
        description: `Time "${team.name}" foi excluído. Os membros foram movidos para "Sem Time".`
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao excluir time",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Time?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza? Os membros deste time serão movidos para "Sem Time". 
            O histórico deles será preservado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Sim, Excluir'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
