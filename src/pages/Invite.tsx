import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import { Loader2, XCircle, Sparkles, UserCheck } from 'lucide-react';

interface InviteData {
  memberName: string;
  memberEmail: string | null;
  workspaceName: string;
  memberId: string;
}

export default function Invite() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') ?? searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Validate invite token
  const validateInvite = useCallback(async () => {
    if (!code) {
      setError('Link de convite inválido');
      setLoading(false);
      return;
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('get_invite_details', {
        p_invite_token: code
      });

      if (rpcError) throw rpcError;
      if (!data || data.length === 0) {
        setError('Convite expirado ou já utilizado');
        setLoading(false);
        return;
      }

      const invite = data[0];
      setInviteData({
        memberId: invite.member_id,
        memberName: invite.member_name,
        memberEmail: invite.member_email,
        workspaceName: invite.workspace_name,
      });
    } catch (err) {
      console.error('Error validating invite:', err);
      setError('Erro ao validar convite');
    } finally {
      setLoading(false);
    }
  }, [code]);

  // Load invite data on mount
  useEffect(() => {
    validateInvite();
  }, [validateInvite]);

  // Accept invite handler
  const handleAcceptInvite = async () => {
    // Scenario A: User not logged in
    if (!user) {
      localStorage.setItem('pending_invite', code!);
      
      // Build URL with signup params
      const params = new URLSearchParams({ mode: 'signup' });
      if (inviteData?.memberEmail) {
        params.set('email', inviteData.memberEmail);
      }
      
      navigate(`/auth?${params.toString()}`);
      return;
    }

    // Scenario B: User logged in - link account
    setProcessing(true);
    try {
      // Try by invite_token first
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

      // Fallback: if token match failed (e.g. token already cleared), try by member_id
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

      toast({
        title: "Convite aceito com sucesso!",
        description: `Bem-vindo ao ${inviteData?.workspaceName}!`,
      });

      navigate('/dashboard', { replace: true });
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

  // Auto-process if user is already logged in
  useEffect(() => {
    if (user && inviteData && !processing) {
      handleAcceptInvite();
    }
  }, [user, inviteData]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <RhitmoLogo size="md" className="text-primary" />
        </div>

        {loading ? (
          /* Loading State */
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground mt-4">Validando convite...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Convite Inválido
              </h1>
              <p className="text-muted-foreground mt-2">
                {error}
              </p>
            </div>
            <Button variant="outline" asChild className="mt-4">
              <Link to="/">Voltar para o início</Link>
            </Button>
          </div>
        ) : inviteData && (
          /* Success State */
          <div className="text-center space-y-6">
            {/* Welcome Icon */}
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>

            {/* Title and Description */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Olá, {inviteData.memberName}!
              </h1>
              <p className="text-muted-foreground">
                Você foi convidado para colaborar no <strong>{inviteData.workspaceName}</strong> através do Rhitmo.
              </p>
            </div>

            {/* Action Button */}
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

            {/* Privacy Note */}
            <p className="text-xs text-muted-foreground">
              Ao aceitar, você poderá visualizar feedbacks compartilhados pelo seu líder.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}