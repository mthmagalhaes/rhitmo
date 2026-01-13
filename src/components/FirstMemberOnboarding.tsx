import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FirstMemberOnboardingProps {
  teamId: string;
  onComplete: () => void;
}

export function FirstMemberOnboarding({ teamId, onComplete }: FirstMemberOnboardingProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira o nome do liderado.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Criar primeiro membro
      const { data: newMember, error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          name: name.trim(),
          role: role.trim() || 'Colaborador',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`,
          performance_score: 50
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Liderado cadastrado!',
        description: 'Vamos começar a registrar feedbacks.',
      });

      onComplete();
      
      // Redirecionar para perfil do membro
      navigate(`/member/${newMember.id}`);
    } catch (error: any) {
      console.error('Erro ao criar membro:', error);
      toast({
        title: 'Erro ao cadastrar',
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
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl">
            Bem-vindo! 👋
          </DialogTitle>
          <DialogDescription className="text-base">
            Vamos começar cadastrando sua primeira liderança.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="member-name">Nome *</Label>
            <Input
              id="member-name"
              placeholder="Ex: Maria Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-role">Cargo (opcional)</Label>
            <Input
              id="member-role"
              placeholder="Ex: Analista de Marketing"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={!name.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cadastrando...
              </>
            ) : (
              'Adicionar e Começar'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
