import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type RecallBot = {
  id: string;
  recall_bot_id: string;
  status: string;
  meeting_url: string | null;
  error_message: string | null;
  created_at: string;
};

const PROBLEMATIC_STATUSES = ['skipped_no_leader', 'failed', 'fatal', 'unrecoverable'];

export const PendingTranscriptsCard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reprocessing, setReprocessing] = useState<string | null>(null);

  const { data: bots = [] } = useQuery({
    queryKey: ['pending-recall-bots', user?.id],
    queryFn: async (): Promise<RecallBot[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('recall_bots')
        .select('id, recall_bot_id, status, meeting_url, error_message, created_at')
        .eq('user_id', user.id)
        .in('status', PROBLEMATIC_STATUSES)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) {
        console.error('[PendingTranscripts] fetch error', error);
        return [];
      }
      return (data ?? []) as RecallBot[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  if (bots.length === 0) return null;

  const handleReprocess = async (bot: RecallBot) => {
    setReprocessing(bot.id);
    const toastId = toast.loading('Reprocessando transcrição...', {
      description: 'Baixando da Recall e redistribuindo para os liderados detectados.',
    });
    try {
      const { data, error } = await supabase.functions.invoke('reprocess-meeting', {
        body: { recallBotId: bot.recall_bot_id },
      });
      if (error) throw error;
      if (!data?.success) {
        // Server returned 200 with success:false (e.g. unrecoverable / not ready)
        const msg = data?.error || 'Falha desconhecida';
        if (data?.unrecoverable) {
          toast.error('Sem transcrição na Recall', {
            id: toastId,
            description: msg + ' Você pode descartar essa reunião.',
          });
          await queryClient.invalidateQueries({ queryKey: ['pending-recall-bots'] });
        } else {
          toast.error('Não foi possível reprocessar', { id: toastId, description: msg });
        }
        return;
      }

      const count = data.feedbacks?.length ?? 0;
      toast.success(
        count > 0
          ? `${count} transcrição(ões) criada(s) e distribuída(s)`
          : 'Transcrição salva (sem liderados detectados)',
        { id: toastId, description: 'Atualize o painel do liderado para ver as notas.' },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pending-recall-bots'] }),
        queryClient.invalidateQueries({ queryKey: ['feedbacks'] }),
        queryClient.invalidateQueries({ queryKey: ['meeting-transcripts'] }),
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao reprocessar';
      console.error('[PendingTranscripts] reprocess failed', e);
      toast.error('Não foi possível reprocessar', { id: toastId, description: msg });
    } finally {
      setReprocessing(null);
    }
  };

  const handleDismiss = async (bot: RecallBot) => {
    const toastId = toast.loading('Descartando...');
    const { error } = await supabase
      .from('recall_bots')
      .update({ status: 'dismissed' })
      .eq('id', bot.id);
    if (error) {
      toast.error('Não foi possível descartar', { id: toastId, description: error.message });
      return;
    }
    toast.success('Reunião removida da lista', { id: toastId });
    await queryClient.invalidateQueries({ queryKey: ['pending-recall-bots'] });
  };

  return (
    <div className="rounded-3xl bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Transcrições não distribuídas
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detectamos {bots.length} reunião(ões) cuja transcrição não foi vinculada automaticamente. Clique em reprocessar para baixar da Recall e redistribuir, ou descarte se não houver gravação.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {bots.map((bot) => {
          const isLoading = reprocessing === bot.id;
          const isUnrecoverable = bot.status === 'unrecoverable';
          return (
            <div
              key={bot.id}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  Reunião de {format(new Date(bot.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {bot.error_message || `Status: ${bot.status}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isUnrecoverable && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl gap-2"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Reprocessar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reprocessar transcrição?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Vamos baixar a transcrição novamente da Recall e tentar distribuí-la para todos os liderados detectados na reunião (por nome). Isso pode criar novas anotações no diário de bordo de cada liderado identificado.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleReprocess(bot)}>
                          Reprocessar agora
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => handleDismiss(bot)}
                  title="Descartar"
                >
                  <X className="h-3.5 w-3.5" />
                  Descartar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
