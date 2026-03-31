import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SlackPrivacyOnboarding } from '@/components/slack/SlackPrivacyOnboarding';

type Status = 'loading' | 'success' | 'error' | 'no-state';

export default function SlackConnect() {
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const state = searchParams.get('state');

  useEffect(() => {
    if (authLoading) return;

    if (!state) {
      setStatus('no-state');
      return;
    }

    if (!user) {
      const returnTo = `/slack/connect?state=${encodeURIComponent(state)}`;
      navigate(`/auth?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
      return;
    }

    const link = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('slack-link', {
          body: { state },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Check if privacy tips should be shown
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('hide_slack_privacy_tips')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!prefs?.hide_slack_privacy_tips) {
          setShowPrivacy(true);
        }

        setStatus('success');
      } catch (err: any) {
        console.error('Slack link error:', err);
        setErrorMsg(err.message || 'Erro ao vincular conta');
        setStatus('error');
      }
    };

    link();
  }, [user, authLoading, state, navigate]);

  if (authLoading || (status === 'loading' && state)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Vinculando sua conta Slack...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <>
        <SlackPrivacyOnboarding open={showPrivacy} onOpenChange={setShowPrivacy} />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-6 max-w-md px-6">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Conta vinculada!</h1>
              <p className="text-muted-foreground mt-2">
                Volte ao Slack e execute <code className="bg-muted px-1.5 py-0.5 rounded text-sm">/rhitmo</code> para começar.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Ir para o Dashboard
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Erro na vinculação</h1>
            <p className="text-muted-foreground mt-2">{errorMsg}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  // no-state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md px-6">
        <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vincular Slack</h1>
          <p className="text-muted-foreground mt-2">
            Execute <code className="bg-muted px-1.5 py-0.5 rounded text-sm">/rhitmo</code> no Slack para iniciar a vinculação.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Voltar ao Dashboard
        </Button>
      </div>
    </div>
  );
}
