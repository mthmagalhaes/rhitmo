import { useEffect, useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import { Loader2 } from 'lucide-react';
import { LeaderPicker, type LeaderCandidate } from '@/components/teams/LeaderPicker';

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team:
    | { id: string; name: string; leader_user_id?: string | null; workspace_id?: string | null }
    | null
    | undefined;
  workspaceId?: string;
  onSuccess: () => void;
}

export const EditTeamDialog = ({
  open,
  onOpenChange,
  team,
  workspaceId,
  onSuccess,
}: EditTeamDialogProps) => {
  const [teamName, setTeamName] = useState('');
  const [leader, setLeader] = useState<LeaderCandidate | null>(null);
  const [initialLeaderId, setInitialLeaderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isHRAdmin, isWorkspaceOwner } = useAccount();
  const canManageLeader = isHRAdmin || isWorkspaceOwner;
  const wsId = workspaceId ?? team?.workspace_id ?? '';

  useEffect(() => {
    if (!open || !team) return;
    setTeamName(team.name);
    setInitialLeaderId(team.leader_user_id ?? null);

    // Hidrata candidato atual a partir de profiles (se houver líder).
    (async () => {
      if (!team.leader_user_id) {
        setLeader(null);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', team.leader_user_id)
        .maybeSingle();
      if (profile) {
        setLeader({
          user_id: (profile as any).id,
          name: (profile as any).full_name || (profile as any).email || 'Líder atual',
          email: (profile as any).email ?? null,
          origin: 'leader',
        });
      } else {
        setLeader(null);
      }
    })();
  }, [open, team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast({ title: 'Nome inválido', description: 'O nome do time não pode estar vazio.', variant: 'destructive' });
      return;
    }
    if (!team) return;

    if (canManageLeader && !leader?.user_id) {
      toast({
        title: 'Defina o líder',
        description: 'Times sem líder bloqueiam a adição de liderados.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const update: Record<string, any> = { name: teamName.trim() };
      if (canManageLeader && leader?.user_id && leader.user_id !== initialLeaderId) {
        update.leader_user_id = leader.user_id;
      }

      const { error } = await supabase.from('teams').update(update).eq('id', team.id);
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Nome já existe', description: 'Já existe um time com este nome.', variant: 'destructive' });
          return;
        }
        throw error;
      }

      toast({
        title: 'Time atualizado',
        description: `Time "${teamName.trim()}" salvo${update.leader_user_id ? ' com novo líder' : ''}.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Time</DialogTitle>
          <DialogDescription>
            {canManageLeader
              ? `Renomeie o time e/ou troque o líder responsável.`
              : `Renomeie o time "${team?.name}"`}
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
                placeholder="Digite o nome"
                disabled={loading}
              />
            </div>

            {canManageLeader && wsId && (
              <>
                <Separator />
                <LeaderPicker
                  workspaceId={wsId}
                  value={leader}
                  onChange={setLeader}
                  disabled={loading}
                />
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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
