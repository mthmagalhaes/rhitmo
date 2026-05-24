import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEnforcedLimits } from '@/hooks/useEnforcedLimits';
import { useAccount } from '@/contexts/AccountContext';
import { Loader2, Users, ArrowLeft, ArrowRight } from 'lucide-react';
import { LeaderPicker, type LeaderCandidate } from '@/components/teams/LeaderPicker';

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
  onSuccess,
}: NewTeamDialogProps) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [leader, setLeader] = useState<LeaderCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { teamCount, limits, enforceLimit } = useEnforcedLimits();
  const { isHRAdmin, isWorkspaceOwner } = useAccount();

  // Para HR Admin / Owner, escolher líder é obrigatório. Para líder comum,
  // ele mesmo continua sendo o líder automaticamente (fluxo legado).
  const requiresLeaderPick = isHRAdmin || isWorkspaceOwner;

  const reset = () => {
    setStep(1);
    setName('');
    setLeader(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleNext = () => {
    if (!name.trim()) {
      toast({ title: 'Nome inválido', description: 'O nome do time não pode estar vazio', variant: 'destructive' });
      return;
    }
    if (!enforceLimit(teamCount, limits.maxTeams, 'times')) return;
    if (!requiresLeaderPick) {
      handleSubmit();
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let leaderUserId: string | null = null;
      if (requiresLeaderPick) {
        if (!leader?.user_id) {
          toast({ title: 'Defina o líder', description: 'É obrigatório vincular um líder ao time', variant: 'destructive' });
          setLoading(false);
          return;
        }
        leaderUserId = leader.user_id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        leaderUserId = user?.id ?? null;
      }

      const { error } = await supabase
        .from('teams')
        .insert({
          workspace_id: workspaceId,
          name: name.trim(),
          leader_user_id: leaderUserId,
        });
      if (error) throw error;

      toast({ title: 'Time criado!', description: `Time "${name.trim()}" foi adicionado` });
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao criar time:', error);
      toast({ title: 'Erro ao criar time', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Novo Time
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Dê um nome ao time. Você define o líder no próximo passo.'
              : 'Escolha quem vai liderar este time.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 1 ? (
            <div className="space-y-2">
              <Label htmlFor="team-name">Nome do time *</Label>
              <Input
                id="team-name"
                placeholder="Ex: Marketing, Vendas, Tecnologia"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
          ) : (
            <LeaderPicker
              workspaceId={workspaceId}
              value={leader}
              onChange={setLeader}
              disabled={loading}
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === 2 ? (
            <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={loading}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={loading}>
              Cancelar
            </Button>
          )}
          {step === 1 ? (
            <Button type="button" onClick={handleNext} disabled={loading || !name.trim()}>
              {requiresLeaderPick ? (
                <>Próximo <ArrowRight className="h-4 w-4 ml-2" /></>
              ) : (
                'Criar time'
              )}
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={loading || !leader}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar time
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
