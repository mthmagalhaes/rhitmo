import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEnforcedLimits } from '@/hooks/useEnforcedLimits';
import { useAccount } from '@/contexts/AccountContext';
import { Loader2, Users, ArrowLeft, ArrowRight, User, Search, UserPlus, Check } from 'lucide-react';
import { LeaderPicker, type LeaderCandidate } from '@/components/teams/LeaderPicker';
import { cn } from '@/lib/utils';

interface NewTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onSuccess?: () => void;
}

type LeaderMode = 'self' | 'existing' | 'invite';

export const NewTeamDialog = ({
  open,
  onOpenChange,
  workspaceId,
  onSuccess,
}: NewTeamDialogProps) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [leaderMode, setLeaderMode] = useState<LeaderMode | null>(null);
  const [leader, setLeader] = useState<LeaderCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { teamCount, limits, enforceLimit } = useEnforcedLimits();
  const { isHRAdmin, isWorkspaceOwner } = useAccount();

  const requiresLeaderPick = isHRAdmin || isWorkspaceOwner;

  const reset = () => {
    setStep(1);
    setName('');
    setLeader(null);
    setLeaderMode(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const validateStep1 = (): boolean => {
    if (!name.trim()) {
      toast({ title: 'Nome inválido', description: 'O nome do time não pode estar vazio', variant: 'destructive' });
      return false;
    }
    if (!enforceLimit(teamCount, limits.maxTeams, 'times')) return false;
    return true;
  };

  const handleNext = () => {
    if (!validateStep1()) return;
    if (!requiresLeaderPick) {
      // Líder comum: ele mesmo já é o líder (fluxo legado)
      handleSubmit('self_legacy');
      return;
    }
    setStep(2);
  };

  const handlePickMode = async (mode: LeaderMode) => {
    setLeaderMode(mode);
    if (mode === 'self') {
      // atalho: HR/Owner é o próprio líder, criar direto
      await handleSubmit('self_admin');
    }
    // se 'existing' ou 'invite' → renderiza LeaderPicker abaixo
  };

  const handleSubmit = async (variant: 'self_legacy' | 'self_admin' | 'picked' = 'picked') => {
    setLoading(true);
    try {
      let leaderUserId: string | null = null;
      if (variant === 'self_legacy' || variant === 'self_admin') {
        const { data: { user } } = await supabase.auth.getUser();
        leaderUserId = user?.id ?? null;
      } else {
        if (!leader?.user_id) {
          toast({ title: 'Defina o líder', description: 'É obrigatório vincular um líder ao time', variant: 'destructive' });
          setLoading(false);
          return;
        }
        leaderUserId = leader.user_id;
      }

      const { error } = await supabase
        .from('teams')
        .insert({
          workspace_id: workspaceId,
          name: name.trim(),
          leader_user_id: leaderUserId,
        });
      if (error) throw error;

      const successMsg = variant === 'picked' && leader?.pending
        ? `Time "${name.trim()}" criado. ${leader.email} recebe o convite por e-mail.`
        : `Time "${name.trim()}" adicionado.`;
      toast({ title: 'Time criado!', description: successMsg });
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

  const renderStep2 = () => {
    if (!leaderMode) {
      // Hub de escolha
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quem vai liderar este time?</Label>
          <div className="space-y-2">
            <ModeButton
              icon={User}
              title="Sou eu o líder"
              subtitle="Atalho: cria o time já vinculado a você."
              onClick={() => handlePickMode('self')}
              disabled={loading}
              highlight
            />
            <ModeButton
              icon={Search}
              title="Escolher alguém do workspace"
              subtitle="Owner, RH, líderes ou liderados já cadastrados."
              onClick={() => handlePickMode('existing')}
              disabled={loading}
            />
            <ModeButton
              icon={UserPlus}
              title="Convidar novo líder por e-mail"
              subtitle="Envia convite e já vincula o time desde agora."
              onClick={() => handlePickMode('invite')}
              disabled={loading}
            />
          </div>
        </div>
      );
    }

    // mode = existing | invite → mostra o LeaderPicker já no tab certo
    return (
      <LeaderPicker
        workspaceId={workspaceId}
        value={leader}
        onChange={setLeader}
        disabled={loading}
        defaultTab={leaderMode === 'invite' ? 'invite' : 'existing'}
      />
    );
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
              : leaderMode
                ? 'Defina quem vai liderar este time.'
                : 'Como você quer definir o líder?'}
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
            renderStep2()
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === 2 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (leaderMode) {
                  setLeaderMode(null);
                  setLeader(null);
                } else {
                  setStep(1);
                }
              }}
              disabled={loading}
            >
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
          ) : leaderMode && leaderMode !== 'self' ? (
            <Button type="button" onClick={() => handleSubmit('picked')} disabled={loading || !leader}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar time
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ModeButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean;
}

function ModeButton({ icon: Icon, title, subtitle, onClick, disabled, highlight }: ModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left rounded-xl border px-3 py-3 transition-all',
        'flex items-start gap-3 hover:border-primary/50 hover:bg-muted/40',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        highlight ? 'border-primary/40 bg-primary/5' : 'border-border/60',
      )}
    >
      <div className={cn(
        'rounded-lg p-2 shrink-0',
        highlight ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium flex items-center gap-1.5">
          {title}
          {highlight && <Check className="h-3.5 w-3.5 text-primary" />}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
    </button>
  );
}
