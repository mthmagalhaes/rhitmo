import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Loader2, Mail, CheckCircle, UserCheck, Send } from 'lucide-react';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    name: string;
    email?: string | null;
    invite_status?: string | null;
    invite_token?: string | null;
  } | null;
  onSuccess?: () => void;
}

export const InviteMemberDialog = ({ 
  open, 
  onOpenChange, 
  member, 
  onSuccess 
}: InviteMemberDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  // Gerar link de convite — sempre usar domínio de produção
  const APP_URL = 'https://rhitmo.co';
  const inviteUrl = member?.invite_token 
    ? `${APP_URL}/invite?code=${member.invite_token}`
    : null;

  if (!member) return null;

  const handleGenerateInvite = async () => {
    setLoading(true);
    try {
      const newToken = crypto.randomUUID();
      
      const { error } = await supabase
        .from('team_members')
        .update({ 
          invite_token: newToken,
          invite_status: 'pending'
        })
        .eq('id', member.id);
      
      if (error) throw error;
      
      toast({
        title: "Convite gerado!",
        description: "Copie o link e envie para o membro.",
      });
      
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro ao gerar convite",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      toast({
        title: "Link copiado!",
        description: "Cole no WhatsApp ou envie por e-mail."
      });
    }
  };

  const handleSendEmail = async () => {
    if (!member.email || !member.invite_token) return;
    setEmailSending(true);
    try {
      // Buscar nome real do líder — nunca usar email como fallback visível.
      const { data: { user } } = await supabase.auth.getUser();
      const leaderName =
        (user?.user_metadata?.full_name as string | undefined) ||
        (user?.user_metadata?.display_name as string | undefined) ||
        undefined;

      const { error } = await supabase.functions.invoke('send-member-invite', {
        body: { memberId: member.id, useInviteLink: true },
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Convite enviado!",
        description: `Email enviado para ${member.email}.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar email",
        description: error.message || 'Tente novamente em instantes.',
        variant: "destructive",
      });
    } finally {
      setEmailSending(false);
    }
  };

  const renderContent = () => {
    // Estado: Usuário já aceitou
    if (member.invite_status === 'accepted') {
      return (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <UserCheck className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Usuário Ativo</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {member.name} já possui acesso à plataforma.
            </p>
          </div>
        </div>
      );
    }

    // Estado: Convite pendente
    if (member.invite_status === 'pending' && inviteUrl) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1">
              <Mail className="h-3 w-3" />
              Convite Enviado
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Compartilhe este link com <strong>{member.name}</strong> para que possa acessar seu perfil na plataforma:
          </p>
          
          <div className="flex gap-2">
            <Input 
              value={inviteUrl} 
              readOnly 
              className="font-mono text-sm"
            />
            <Button onClick={handleCopyLink} variant="outline" className="shrink-0 gap-2">
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
          </div>

          {member.email && (
            <div className="rounded-xl border bg-primary/5 p-4 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Enviar convite por email
                </p>
                <p className="text-xs text-muted-foreground">
                  Mandamos o template oficial do Rhitmo para <strong>{member.email}</strong> com o link acima.
                </p>
              </div>
              <Button
                onClick={handleSendEmail}
                disabled={emailSending || emailSent}
                className="w-full gap-2"
                size="sm"
              >
                {emailSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : emailSent ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Email enviado
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar convite por email
                  </>
                )}
              </Button>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            Ao acessar o link, {member.name} poderá criar uma conta e visualizar os feedbacks compartilhados.
          </p>
        </div>
      );
    }

    // Estado: Nenhum convite gerado
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Gere um link de convite para que <strong>{member.name}</strong> possa acessar seu próprio perfil na plataforma.
        </p>
        
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">O que o membro poderá ver:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✓ Seu perfil e dados do Rhitmo Sync</li>
            <li>✓ Feedbacks marcados como "compartilhados"</li>
            <li className="text-amber-600 dark:text-amber-400">✗ Notas privadas do líder permanecerão ocultas</li>
          </ul>
        </div>
        
        <Button 
          onClick={handleGenerateInvite} 
          disabled={loading}
          className="w-full gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Gerar Link de Convite
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar {member.name}</DialogTitle>
          <DialogDescription>
            Permita que este membro acesse a plataforma com sua própria conta.
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};
