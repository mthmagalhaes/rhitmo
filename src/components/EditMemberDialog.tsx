import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Settings, Trash2 } from 'lucide-react';
import { Team } from '@/types/team';
import { useQueryClient } from '@tanstack/react-query';
import { syncStripeSeats } from '@/lib/syncStripeSeats';

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    name: string;
    role: string;
    teamId: string;
  } | null;
  workspaceId: string;
  onSuccess?: () => void;
}

export const EditMemberDialog = ({ 
  open, 
  onOpenChange, 
  member,
  workspaceId,
  onSuccess 
}: EditMemberDialogProps) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && member) {
      setName(member.name);
      setRole(member.role);
      setSelectedTeamId(member.teamId);
      setNewTeamName('');
      setIsCreatingTeam(false);
      loadTeams();
    }
  }, [open, member]);

  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar times:', error);
    }
  };

  const handleTeamChange = (value: string) => {
    if (value === '__create_new__') {
      setIsCreatingTeam(true);
      setSelectedTeamId('');
    } else {
      setIsCreatingTeam(false);
      setSelectedTeamId(value);
      setNewTeamName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !role.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e cargo são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!selectedTeamId && !isCreatingTeam) {
      toast({
        title: "Time obrigatório",
        description: "Selecione um time para o membro",
        variant: "destructive"
      });
      return;
    }

    if (isCreatingTeam && !newTeamName.trim()) {
      toast({
        title: "Nome do time obrigatório",
        description: "Digite um nome para o novo time",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      let teamId = selectedTeamId;

      // Criar novo time se necessário
      if (isCreatingTeam && newTeamName.trim()) {
        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert({ 
            workspace_id: workspaceId, 
            name: newTeamName.trim() 
          })
          .select()
          .single();

        if (teamError) throw teamError;
        teamId = newTeam.id;
      }

      // Atualizar membro
      const { error: updateError } = await supabase
        .from('team_members')
        .update({
          name: name.trim(),
          role: role.trim(),
          team_id: teamId
        })
        .eq('id', member?.id);

      if (updateError) throw updateError;

      toast({
        title: "Membro atualizado!",
        description: isCreatingTeam 
          ? `${name.trim()} movido para o novo time "${newTeamName.trim()}"`
          : `Dados de ${name.trim()} foram atualizados`,
      });

      // Invalidar cache do React Query
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['member', member?.id] });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao atualizar membro:', error);
      toast({
        title: "Erro ao atualizar membro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Primeiro deletar feedbacks do membro
      await supabase.from('feedbacks').delete().eq('member_id', member?.id);
      
      // Depois deletar o membro
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', member?.id);

      if (error) throw error;

      // Recontar seats no Stripe (fire-and-forget; downgrade proporcional)
      syncStripeSeats();

      toast({
        title: "Membro excluído",
        description: `${name} foi removido da equipe`,
      });

      // Invalidar cache do React Query
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['member', member?.id] });
      queryClient.invalidateQueries({ queryKey: ['feedbacks', member?.id] });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao excluir membro:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Editar Membro
          </DialogTitle>
          <DialogDescription>
            Atualize os dados do membro ou mova para outro time
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Completo *</Label>
              <Input
                id="edit-name"
                placeholder="Ex: Maria Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Cargo *</Label>
              <Input
                id="edit-role"
                placeholder="Ex: Analista de Marketing"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-team">Time *</Label>
              <Select 
                value={isCreatingTeam ? '__create_new__' : selectedTeamId} 
                onValueChange={handleTeamChange}
                disabled={loading}
              >
                <SelectTrigger id="edit-team">
                  <SelectValue placeholder="Selecione um time" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__create_new__">
                    + Criar novo time...
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {isCreatingTeam && (
                <Input
                  placeholder="Nome do novo time"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  disabled={loading}
                />
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={loading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Membro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é irreversível. Todas as notas e dados de {name} serão excluídos permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete} 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
