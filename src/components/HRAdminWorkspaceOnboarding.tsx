import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Building2, Loader2, UserPlus } from 'lucide-react';

interface HRAdminWorkspaceOnboardingProps {
  onComplete: () => void;
}

export function HRAdminWorkspaceOnboarding({ onComplete }: HRAdminWorkspaceOnboardingProps) {
  const [workspaceName, setWorkspaceName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workspaceName.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Informe o nome da empresa.', variant: 'destructive' });
      return;
    }

    if (leaderEmail.trim() && !leaderEmail.includes('@')) {
      toast({ title: 'E-mail inválido', description: 'Informe um e-mail válido para o primeiro líder.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.rpc('create_hr_admin_starter_workspace' as any, {
        _workspace_name: workspaceName.trim(),
        _team_name: teamName.trim() || 'Primeiro time',
        _leader_email: leaderEmail.trim() || null,
      });

      if (error) throw error;

      toast({
        title: 'Workspace criado!',
        description: 'Sua visão inicial de RH está pronta.',
      });

      try { localStorage.removeItem('signup_persona'); } catch { /* ignore */ }
      onComplete();
    } catch (error: any) {
      console.error('Erro ao criar workspace RH:', error);
      toast({
        title: 'Erro ao criar workspace',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-lg rounded-3xl [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl tracking-tight">Configure sua visão de RH</DialogTitle>
          <DialogDescription className="text-base">
            Comece no Pulse com uma amostra do painel Enterprise. Depois, faça upgrade para liberar a gestão completa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="hr-workspace-name">Nome da empresa</Label>
            <Input
              id="hr-workspace-name"
              placeholder="Ex: Acme Brasil"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              disabled={isLoading}
              className="rounded-xl"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hr-team-name">Primeiro time ou área</Label>
            <Input
              id="hr-team-name"
              placeholder="Ex: Produto, Engenharia, Comercial"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={isLoading}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hr-leader-email">E-mail do primeiro líder</Label>
            <Input
              id="hr-leader-email"
              type="email"
              placeholder="lider@empresa.com"
              value={leaderEmail}
              onChange={(e) => setLeaderEmail(e.target.value)}
              disabled={isLoading}
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Ele ficará registrado como primeiro líder para você concluir o convite depois.
            </p>
          </div>

          <Button type="submit" className="w-full rounded-xl h-12 font-semibold" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar visão de RH'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
