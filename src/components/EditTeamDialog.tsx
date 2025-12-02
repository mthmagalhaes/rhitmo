import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: { id: string; name: string } | null | undefined;
  onSuccess: () => void;
}

export const EditTeamDialog = ({
  open,
  onOpenChange,
  team,
  onSuccess
}: EditTeamDialogProps) => {
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamName.trim()) {
      toast({
        title: "Nome inválido",
        description: "O nome do time não pode estar vazio.",
        variant: "destructive"
      });
      return;
    }

    if (!team) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: teamName.trim() })
        .eq('id', team.id);

      if (error) {
        // Error code 23505 = unique constraint violation
        if (error.code === '23505') {
          toast({
            title: "Nome já existe",
            description: "Já existe um time com este nome.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Time renomeado",
        description: `Time alterado para "${teamName}"`
      });

      onSuccess();
      onOpenChange(false);
      setTeamName('');
    } catch (error: any) {
      toast({
        title: "Erro ao renomear time",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open && team) {
      setTeamName(team.name);
    } else {
      setTeamName('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renomear Time</DialogTitle>
          <DialogDescription>
            Altere o nome do time "{team?.name}"
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Nome do Time</Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Digite o novo nome"
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
