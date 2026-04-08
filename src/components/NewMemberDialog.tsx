import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useEnforcedLimits } from '@/hooks/useEnforcedLimits';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { Team } from '@/types/team';

interface NewMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onSuccess?: () => void;
}

const memberSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  role: z.string().min(2, 'Cargo é obrigatório').max(100, 'Cargo muito longo'),
  email: z.string().email('E-mail inválido').max(255, 'E-mail muito longo'),
});

export const NewMemberDialog = ({ open, onOpenChange, workspaceId, onSuccess }: NewMemberDialogProps) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [sendDiscInvite, setSendDiscInvite] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { hasSync, memberCount, limits, enforceLimit } = useEnforcedLimits();

  // Desabilitar convite se plano não tem Sync
  useEffect(() => {
    if (!hasSync) {
      setSendDiscInvite(false);
    }
  }, [hasSync]);

  useEffect(() => {
    if (open) {
      loadTeams();
    }
  }, [open]);

  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      setTeams(data || []);
      
      // Se houver apenas um time, seleciona automaticamente
      if (data && data.length === 1) {
        setSelectedTeamId(data[0].id);
      }
    } catch (error: any) {
      console.error('Erro ao carregar times:', error);
    }
  };

  const handleTeamChange = (value: string) => {
    if (value === '__create_new__') {
      setIsCreatingTeam(true);
      setSelectedTeamId('');
    } else {
      setIsCreatingTeam(false);
      setSelectedTeamId(value);
      setNewTeamName('');
    }
  };

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

    if (!selectedTeamId && !isCreatingTeam) {
      toast({
        title: "Time obrigatório",
        description: "Selecione um time para o membro",
        variant: "destructive"
      });
      return;
    }

    if (isCreatingTeam && !newTeamName.trim()) {
      toast({
        title: "Nome do time obrigatório",
        description: "Digite um nome para o novo time",
        variant: "destructive"
      });
      return;
    }

    // Check plan limit
    if (!enforceLimit(memberCount, limits.maxMembers, 'liderados')) return;

    setLoading(true);

    try {
      // Obter sessão do usuário
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      let teamId = selectedTeamId;

      // Criar novo time se necessário
      if (isCreatingTeam && newTeamName.trim()) {
        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert({ 
            workspace_id: workspaceId, 
            name: newTeamName.trim() 
          })
          .select()
          .single();

        if (teamError) {
          // Verificar se é erro de duplicidade (UNIQUE constraint)
          if (teamError.code === '23505') {
            throw new Error('Já existe um time com este nome. Selecione-o na lista.');
          }
          throw teamError;
        }
        
        if (!newTeam || !newTeam.id) {
          throw new Error('Erro ao criar o time. Tente novamente.');
        }
        
        teamId = newTeam.id;
      }

      // Validação final: garantir que teamId é um UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!teamId || !uuidRegex.test(teamId)) {
        throw new Error('Time inválido. Selecione um time válido da lista.');
      }

      // Inserir novo membro na tabela team_members
      const { data: newMember, error: insertError } = await supabase
        .from('team_members')
        .insert({
          user_id: session.user.id,
          name: name.trim(),
          role: role.trim(),
          email: email.trim(),
          team_id: teamId,
          
          performance_score: 50
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Se checkbox DISC marcado, enviar convite via transactional email
      if (sendDiscInvite) {
        const syncUrl = `${window.location.origin}/sync/${newMember.id}`;
        const { data: inviteData, error: inviteError } = await supabase.functions.invoke('send-transactional-email', {
          body: { 
            templateName: 'sync-invite',
            recipientEmail: email.trim(),
            idempotencyKey: `sync-invite-${newMember.id}`,
            templateData: {
              memberName: name.trim(),
              syncUrl,
            }
          }
        });

        if (inviteError) {
          console.error('Erro ao enviar convite DISC:', inviteError);
          toast({
            title: "Membro cadastrado",
            description: `${name.trim()} foi adicionado, mas houve erro ao enviar o convite: ${inviteError.message}`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Sucesso!",
            description: `Membro cadastrado e convite Rhitmo Sync enviado para ${email.trim()}`,
          });
        }
      } else {
        toast({
          title: "Membro cadastrado!",
          description: `${name.trim()} foi adicionado à sua equipe`,
        });
      }

      // Fire-and-forget: send Slack invite if email is provided
      if (email.trim()) {
        supabase.functions.invoke('invite-member-slack', {
          body: {
            member_id: newMember.id,
            member_name: name.trim(),
            member_email: email.trim(),
          },
        }).then(({ data: slackData, error: slackErr }) => {
          if (slackErr) {
            console.error('Slack invite error:', slackErr);
            return;
          }
          if (slackData?.success) {
            toast({
              title: slackData.has_existing_account
                ? '🔗 Convite Slack enviado'
                : '🚀 Convite Slack enviado',
              description: slackData.has_existing_account
                ? `${name.trim()} já tem conta Rhitmo, só precisa conectar ao Slack.`
                : `${name.trim()} receberá link para criar conta via Slack.`,
            });
          } else if (slackData?.reason === 'not_in_workspace') {
            toast({
              title: '⚠️ Email não encontrado no Slack',
              description: 'Adicione a pessoa ao workspace Slack primeiro.',
            });
          }
        }).catch(console.error);
      }

      // Resetar formulário
      setName('');
      setRole('');
      setEmail('');
      setSelectedTeamId('');
      setNewTeamName('');
      setIsCreatingTeam(false);
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

            <div className="space-y-2">
              <Label htmlFor="team">Time *</Label>
              <Select 
                value={isCreatingTeam ? '__create_new__' : selectedTeamId} 
                onValueChange={handleTeamChange}
                disabled={loading}
              >
                <SelectTrigger id="team">
                  <SelectValue placeholder="Selecione um time" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__create_new__">
                    + Criar novo time...
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {isCreatingTeam && (
                <Input
                  placeholder="Nome do novo time (ex: Marketing)"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  disabled={loading}
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="disc-invite"
                  checked={sendDiscInvite && hasSync}
                  onCheckedChange={(checked) => setSendDiscInvite(checked as boolean)}
                  disabled={loading || !hasSync}
                />
                <Label
                  htmlFor="disc-invite"
                  className={`text-sm font-normal cursor-pointer ${!hasSync ? 'text-muted-foreground' : ''}`}
                >
                  Enviar convite para mapeamento de perfil Rhitmo Sync
                </Label>
              </div>
              {!hasSync && (
                <p className="text-xs text-amber-600 dark:text-amber-400 pl-6">
                  🔒 Disponível no plano Flow.{' '}
                  <Link to="/billing" className="underline hover:no-underline">
                    Ver planos
                  </Link>
                </p>
              )}
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
