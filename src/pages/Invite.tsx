import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHomeRoute } from '@/hooks/useHomeRoute';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { Loader2, XCircle, Sparkles, UserCheck, CheckCircle2, LogIn } from 'lucide-react';

type InviteStatus = 'loading' | 'pending' | 'already_accepted' | 'not_found' | 'success';

interface InviteData {
  memberName: string;
  memberEmail: string | null;
  workspaceName: string;
  memberId: string;
  linkedUserId: string | null;
}

export default function Invite() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') ?? searchParams.get('token');
  
  const [status, setStatus] = useState<InviteStatus>('loading');
  const [processing, setProcessing] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const home = useHomeRoute();
  const { toast } = useToast();

  // Validate invite token
  const validateInvite = useCallback(async () => {
    if (!code) {
      setStatus('not_found');
      return;
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('get_invite_status', {
        p_invite_token: code
      });

      if (rpcError) throw rpcError;
      if (!data || data.length === 0) {
        setStatus('not_found');
        return;
      }

      const invite = data[0];
      
      if (invite.status === 'pending') {
        setInviteData({
          memberId: invite.member_id,
          memberName: invite.member_name,
          memberEmail: invite.member_email,
          workspaceName: invite.workspace_name,
          linkedUserId: invite.linked_user_id,
        });
        setStatus('pending');
      } else if (invite.status === 'already_accepted') {
        setInviteData({
          memberId: invite.member_id,
          memberName: invite.member_name,
          memberEmail: invite.member_email,
          workspaceName: invite.workspace_name,
          linkedUserId: invite.linked_user_id,
        });
        setStatus('already_accepted');
      } else {
        setStatus('not_found');
      }
    } catch (err) {
      console.error('Error validating invite:', err);
      setStatus('not_found');
    }
  }, [code]);

  useEffect(() => {
    validateInvite();
  }, [validateInvite]);

  // Smart redirect: if user is logged in and invite is already accepted by them
  useEffect(() => {
    if (user && status === 'already_accepted' && inviteData?.linkedUserId === user.id) {
      navigate(home, { replace: true });
    }
  }, [user, status, inviteData, navigate, home]);

  // Auto-process if user is already logged in and invite is pending
  useEffect(() => {
    if (user && status === 'pending' && inviteData && !processing) {
      handleAcceptInvite();
    }
  }, [user, status, inviteData]);

  const handleAcceptInvite = async () => {
    if (!user) {
      localStorage.setItem('pending_invite', code!);
      const params = new URLSearchParams({ mode: 'signup' });
      if (inviteData?.memberEmail) {
        params.set('email', inviteData.memberEmail);
      }
      navigate(`/auth?${params.toString()}`);
      return;
    }

    setProcessing(true);
    try {
      const { data: tokenResult, error: tokenError } = await supabase
        .from('team_members')
        .update({
          linked_user_id: user.id,
          invite_status: 'accepted',
          invite_token: null
        })
        .eq('invite_token', code)
        .eq('invite_status', 'pending')
        .select('id');

      if ((!tokenResult || tokenResult.length === 0) && inviteData?.memberId) {
        const { error: memberError } = await supabase
          .from('team_members')
          .update({
            linked_user_id: user.id,
            invite_status: 'accepted',
            invite_token: null
          })
          .eq('id', inviteData.memberId)
          .eq('invite_status', 'pending')
          .is('linked_user_id', null);

        if (memberError) throw memberError;
      } else if (tokenError) {
        throw tokenError;
      }

      // Show success screen instead of immediate redirect
      setStatus('success');
      
      // Auto-redirect after 6 seconds
      setTimeout(() => {
        navigate(home, { replace: true });
      }, 6000);
    } catch (err: any) {
      console.error('Error accepting invite:', err);
      toast({
        title: "Erro ao aceitar convite",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <RhitmoLogo size="md" className="text-primary" />
        </div>

        {status === 'loading' && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground mt-4">Validando convite...</p>
          </div>
        )}

        {status === 'not_found' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Convite Inválido
              </h1>
              <p className="text-muted-foreground mt-2">
                Este link de convite é inválido ou expirou.
              </p>
            </div>
            <Button variant="outline" asChild className="mt-4">
              <Link to="/">Voltar para o início</Link>
            </Button>
          </div>
        )}

        {status === 'already_accepted' && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Convite já aceito!
              </h1>
              <p className="text-muted-foreground">
                {inviteData?.memberName ? `Olá, ${inviteData.memberName}! ` : ''}
                Você já aceitou este convite
                {inviteData?.workspaceName ? ` para o ${inviteData.workspaceName}` : ''}.
                Para acessar suas devolutivas, faça login abaixo.
              </p>
            </div>
            <div className="space-y-3">
              <Button asChild size="lg" className="w-full">
                <Link to="/auth?mode=login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Acessar minha conta
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Da próxima vez, acesse diretamente em <strong>app-rhitmo.lovable.app/auth</strong>
            </p>
          </div>
        )}

        {status === 'pending' && inviteData && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Olá, {inviteData.memberName}!
              </h1>
              <p className="text-muted-foreground">
                Você foi convidado para colaborar no <strong>{inviteData.workspaceName}</strong> através do Rhitmo.
              </p>
            </div>
            <Button 
              onClick={handleAcceptInvite}
              disabled={processing}
              size="lg"
              className="w-full"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Aceitar e Acessar
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Ao aceitar, você poderá visualizar feedbacks compartilhados pelo seu líder.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Tudo pronto! 🎉
              </h1>
              <p className="text-muted-foreground">
                Bem-vindo ao <strong>{inviteData?.workspaceName}</strong>!
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
              <p>
                💡 <strong>Dica:</strong> Da próxima vez, acesse diretamente em{' '}
                <strong className="text-foreground">app-rhitmo.lovable.app/auth</strong>{' '}
                usando sua conta Google ou email.
              </p>
            </div>
            <Button 
              onClick={() => navigate(home, { replace: true })}
              size="lg"
              className="w-full"
            >
              Acessar agora
            </Button>
            <p className="text-xs text-muted-foreground animate-pulse">
              Redirecionando automaticamente...
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
