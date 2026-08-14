import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, MailX } from 'lucide-react';
import { RhitmoLogo } from '@/components/RhitmoLogo';

type Status = 'loading' | 'valid' | 'already_unsubscribed' | 'invalid' | 'success' | 'error';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (res.ok && data.valid) {
          setStatus('valid');
        } else if (data.reason === 'already_unsubscribed') {
          setStatus('already_unsubscribed');
        } else {
          setStatus('invalid');
        }
      } catch {
        setStatus('invalid');
      }
    };

    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token }
      });
      if (error) throw error;
      if (data?.success) {
        setStatus('success');
      } else if (data?.reason === 'already_unsubscribed') {
        setStatus('already_unsubscribed');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <RhitmoLogo className="text-primary mx-auto" size="lg" />

        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Verificando...</p>
          </div>
        )}

        {status === 'valid' && (
          <div className="space-y-6">
            <MailX className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Cancelar inscrição</h1>
              <p className="text-muted-foreground">
                Tem certeza que deseja parar de receber emails do Rhitmo?
              </p>
            </div>
            <Button
              onClick={handleUnsubscribe}
              disabled={processing}
              variant="destructive"
              className="rounded-xl"
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar cancelamento
            </Button>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Inscrição cancelada</h1>
              <p className="text-muted-foreground">
                Você não receberá mais emails do Rhitmo. Emails de autenticação (redefinição de senha, etc.) continuarão sendo enviados.
              </p>
            </div>
          </div>
        )}

        {status === 'already_unsubscribed' && (
          <div className="space-y-4">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Já cancelado</h1>
              <p className="text-muted-foreground">
                Sua inscrição já foi cancelada anteriormente.
              </p>
            </div>
          </div>
        )}

        {status === 'invalid' && (
          <div className="space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Link inválido</h1>
              <p className="text-muted-foreground">
                Este link de cancelamento é inválido ou expirou.
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Erro</h1>
              <p className="text-muted-foreground">
                Não foi possível processar sua solicitação. Tente novamente mais tarde.
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground pt-4">
          Rhitmo • Gestão de Performance Contínua
        </p>
      </div>
    </div>
  );
};

export default Unsubscribe;
