import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEnforcedLimits } from '@/hooks/useEnforcedLimits';
import { Loader2, Users } from 'lucide-react';

interface NewTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onSuccess?: () => void;
}

export const NewTeamDialog = ({ 
  open, 
  onOpenChange, 
  workspaceId,
  onSuccess 
}: NewTeamDialogProps) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { teamCount, limits, enforceLimit } = useEnforcedLimits();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Nome inválido",
        description: "O nome do time não pode estar vazio",
        variant: "destructive"
      });
      return;
    }

    // Check plan limit
    if (!enforceLimit(teamCount, limits.maxTeams, 'times')) return;

    setLoading(true);

    try {
      // Workspace = 1 owner. Novo time fica sempre embaixo do criador (owner/líder
      // logado) — leader_user_id é necessário pra is_team_leader() reconhecer
      // acesso de líder via RLS em feedbacks/goals/etc.
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('teams')
        .insert({ 
          workspace_id: workspaceId, 
          name: name.trim(),
          leader_user_id: user?.id ?? null,
        });

      if (error) throw error;

      toast({
        title: "Time criado!",
        description: `Time "${name.trim()}" foi adicionado`,
      });

      setName('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao criar time:', error);
      toast({
        title: "Erro ao criar time",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Novo Time
          </DialogTitle>
          <DialogDescription>
            Crie um novo time no seu workspace
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Nome do Time *</Label>
              <Input
                id="team-name"
                placeholder="Ex: Marketing, Vendas, Tecnologia"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoFocus
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
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Time
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
