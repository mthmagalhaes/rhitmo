import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { clearSignupPersona } from '@/lib/signupPersona';

interface WorkspaceOnboardingProps {
  userId: string;
  userMetadata?: { assigned_plan?: string };
  email?: string | null;
  createdAt?: string | null;
  onComplete: () => void;
}

export function WorkspaceOnboarding({ userId, userMetadata, email, createdAt, onComplete }: WorkspaceOnboardingProps) {
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInviteHelp, setShowInviteHelp] = useState(false);
  const isReturning = !!createdAt && Date.now() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workspaceName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira o nome da sua empresa.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Usar assigned_plan do metadata ou fallback para 'pulse'
      const planTier = userMetadata?.assigned_plan || 'pulse';

      // Criar workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          owner_id: userId,
          name: workspaceName.trim(),
          plan_tier: planTier,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Criar time padrão "Sem Time"
      const { error: teamError } = await supabase
        .from('teams')
        .insert({
          workspace_id: workspace.id,
          name: 'Sem Time',
          leader_user_id: userId,
        });

      if (teamError) throw teamError;

      // Re-fetch is_beta_user para detectar Programa Fundadores (não bloqueia o fluxo).
      let isFounderProgram = false;
      try {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('is_beta_user')
          .eq('id', workspace.id)
          .maybeSingle();
        isFounderProgram = !!ws?.is_beta_user;
      } catch (err) {
        console.warn('Re-fetch is_beta_user falhou — segue com template genérico:', err);
      }

      // Fire-and-forget: enviar leader-welcome para o próprio líder.
      // Nunca derivar leaderName do email — usa só nome real do perfil.
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const leaderName =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.display_name as string | undefined) ||
          undefined;

        supabase.functions.invoke('notify-leader-welcome', {
          body: { workspaceId: workspace.id }
        }).catch((err) => {
          console.error('Falha ao enviar leader-welcome (não crítico):', err);
        });
      }

      toast({
        title: 'Empresa criada!',
        description: 'Seu ambiente está pronto para uso.',
      });

      // Clear persona intent now that the leader workspace is set up.
      clearSignupPersona();

      onComplete();
    } catch (error: any) {
      console.error('Erro ao criar workspace:', error);
      toast({
        title: 'Erro ao criar empresa',
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
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif font-bold tracking-tight">
            {isReturning ? 'Sua conta não está ligada a nenhuma empresa' : 'Bem-vindo à Rhitmo'}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isReturning
              ? 'No momento, esta conta não faz parte de nenhuma empresa na Rhitmo. Você pode criar uma nova, pedir um convite ou entrar com outra conta.'
              : 'Vamos configurar seu ambiente. Qual o nome da sua empresa?'}
          </DialogDescription>
          {email && (
            <p className="text-xs text-muted-foreground pt-1">Conectado como <span className="font-medium text-foreground">{email}</span></p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Nome da empresa</Label>
            <Input
              id="workspace-name"
              placeholder="Ex: Nordvale Logística"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full rounded-xl" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar minha empresa'
            )}
          </Button>
        </form>

        <div className="mt-2 space-y-2 border-t border-border/60 pt-4">
          <Button type="button" variant="ghost" className="w-full rounded-xl" onClick={() => setShowInviteHelp((v) => !v)}>
            Fui convidado por alguém
          </Button>
          {showInviteHelp && (
            <p className="rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
              Peça para seu líder ou para o RH da sua empresa enviar um novo convite para{' '}
              <span className="font-medium text-foreground">{email || 'este e-mail'}</span>. Ao abrir o link do convite, você entra direto no time certo.
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            className="w-full rounded-xl text-muted-foreground"
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/auth'; }}
          >
            Entrar com outra conta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
