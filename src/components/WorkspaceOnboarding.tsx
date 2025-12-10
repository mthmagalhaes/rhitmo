import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface WorkspaceOnboardingProps {
  userId: string;
  userMetadata?: { assigned_plan?: string };
  onComplete: () => void;
}

export function WorkspaceOnboarding({ userId, userMetadata, onComplete }: WorkspaceOnboardingProps) {
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workspaceName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira o nome do seu workspace.',
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
        });

      if (teamError) throw teamError;

      toast({
        title: 'Workspace criado!',
        description: 'Seu ambiente está pronto para uso.',
      });

      onComplete();
    } catch (error: any) {
      console.error('Erro ao criar workspace:', error);
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
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Bem-vindo ao Rhitmo! 🚀</DialogTitle>
          <DialogDescription className="text-base">
            Vamos configurar seu ambiente. Qual o nome da sua empresa ou time?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Nome do Workspace</Label>
            <Input
              id="workspace-name"
              placeholder="Ex: Marketing Squad"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar e Começar'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
