import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserPlus } from 'lucide-react';
import { z } from 'zod';

interface NewMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const memberSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  role: z.string().min(2, 'Cargo é obrigatório').max(100, 'Cargo muito longo'),
  email: z.string().email('E-mail inválido').max(255, 'E-mail muito longo'),
});

export const NewMemberDialog = ({ open, onOpenChange, onSuccess }: NewMemberDialogProps) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [sendDiscInvite, setSendDiscInvite] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validação
    const result = memberSchema.safeParse({ name, role, email });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      // Obter sessão do usuário
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      // Inserir novo membro na tabela team_members
      const { data: newMember, error: insertError } = await supabase
        .from('team_members')
        .insert({
          user_id: session.user.id,
          name: name.trim(),
          role: role.trim(),
          email: email.trim(),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.trim()}`,
          performance_score: 50
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Se checkbox DISC marcado, enviar convite
      if (sendDiscInvite) {
        const { data: inviteData, error: inviteError } = await supabase.functions.invoke('send-disc-invite', {
          body: { 
            name: name.trim(), 
            email: email.trim(),
            memberId: newMember.id
          }
        });

        if (inviteError) {
          console.error('Erro ao enviar convite DISC:', inviteError);
        }

        toast({
          title: "Sucesso!",
          description: `Membro cadastrado e convite DISC enviado para ${email.trim()}`,
        });
      } else {
        toast({
          title: "Membro cadastrado!",
          description: `${name.trim()} foi adicionado à sua equipe`,
        });
      }

      // Resetar formulário
      setName('');
      setRole('');
      setEmail('');
      setSendDiscInvite(true);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao cadastrar membro:', error);
      toast({
        title: "Erro ao cadastrar membro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Novo Membro
          </DialogTitle>
          <DialogDescription>
            Cadastre um novo liderado na sua equipe
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                placeholder="Ex: Maria Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Cargo *</Label>
              <Input
                id="role"
                placeholder="Ex: Analista de Marketing"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
              />
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail Corporativo *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ex: maria.silva@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="disc-invite"
                checked={sendDiscInvite}
                onCheckedChange={(checked) => setSendDiscInvite(checked as boolean)}
                disabled={loading}
              />
              <Label
                htmlFor="disc-invite"
                className="text-sm font-normal cursor-pointer"
              >
                Enviar convite para mapeamento de perfil DISC agora?
              </Label>
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
              Cadastrar Membro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
