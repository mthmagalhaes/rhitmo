import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface BatchSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Status = 'idle' | 'loading' | 'processing' | 'done' | 'error';

export function BatchSyncDialog({ open, onOpenChange }: BatchSyncDialogProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>('idle');
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Carregar contagem ao abrir
  useEffect(() => {
    if (open) {
      loadPendingCount();
    } else {
      // Reset ao fechar
      setStatus('idle');
      setPendingCount(null);
      setProgress({ current: 0, total: 0 });
    }
  }, [open]);

  const loadPendingCount = async () => {
    setStatus('loading');
    
    try {
      const { count, error } = await supabase
        .from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .or('tags.is.null,tags.eq.{},title.is.null');
      
      if (error) {
        console.error('Error counting pending feedbacks:', error);
        setStatus('error');
        return;
      }
      
      setPendingCount(count || 0);
      setStatus('idle');
    } catch (err) {
      console.error('Error loading pending count:', err);
      setStatus('error');
    }
  };

  const handleSync = async () => {
    setIsProcessing(true);
    setStatus('processing');
    
    try {
      // 1. Buscar todas as notas pendentes
      const { data: pendingFeedbacks, error } = await supabase
        .from('feedbacks')
        .select('id, content')
        .or('tags.is.null,tags.eq.{},title.is.null')
        .order('created_at', { ascending: true });
      
      if (error || !pendingFeedbacks) {
        toast({ 
          title: "Erro ao buscar notas", 
          description: error?.message, 
          variant: "destructive" 
        });
        setStatus('error');
        setIsProcessing(false);
        return;
      }
      
      if (pendingFeedbacks.length === 0) {
        setStatus('done');
        setIsProcessing(false);
        return;
      }
      
      setProgress({ current: 0, total: pendingFeedbacks.length });
      
      let successCount = 0;
      let errorCount = 0;
      
      // 2. Processar uma por uma (evitar rate limiting)
      for (let i = 0; i < pendingFeedbacks.length; i++) {
        const feedback = pendingFeedbacks[i];
        
        try {
          // Chamar Edge Function
          const { data, error: classifyError } = await supabase.functions.invoke('classify-note', {
            body: { content: feedback.content }
          });
          
          if (classifyError) throw classifyError;
          
          // Atualizar no banco
          const { error: updateError } = await supabase
            .from('feedbacks')
            .update({
              tags: data.tags || [],
              title: data.suggestedTitle || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', feedback.id);
          
          if (updateError) throw updateError;
          
          successCount++;
        } catch (err) {
          console.error(`Error processing feedback ${feedback.id}:`, err);
          errorCount++;
        }
        
        setProgress({ current: i + 1, total: pendingFeedbacks.length });
        
        // Delay entre requests (300ms para evitar rate limiting)
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      setStatus('done');
      setIsProcessing(false);
      
      toast({
        title: "Sincronização concluída! ✨",
        description: `${successCount} notas classificadas.${errorCount > 0 ? ` ${errorCount} erros.` : ''}`,
      });
    } catch (err) {
      console.error('Batch sync error:', err);
      setStatus('error');
      setIsProcessing(false);
      toast({
        title: "Erro na sincronização",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const progressPercent = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={isProcessing ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Sincronizar Inteligência do Sistema
          </DialogTitle>
          <DialogDescription>
            Esta ação irá processar todas as notas antigas que ainda não possuem
            classificação por IA (tags e títulos).
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {status === 'loading' && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Verificando notas...</span>
            </div>
          )}
          
          {status === 'idle' && pendingCount !== null && (
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold text-primary">{pendingCount}</div>
              <p className="text-sm text-muted-foreground">
                {pendingCount === 0 
                  ? "Todas as notas já estão classificadas! 🎉"
                  : `nota${pendingCount > 1 ? 's' : ''} pendente${pendingCount > 1 ? 's' : ''} de classificação`}
              </p>
            </div>
          )}
          
          {status === 'processing' && (
            <div className="space-y-3">
              <Progress value={progressPercent} />
              <p className="text-sm text-center text-muted-foreground">
                Otimizando nota {progress.current} de {progress.total}...
              </p>
            </div>
          )}
          
          {status === 'done' && (
            <div className="text-center space-y-2">
              <div className="text-4xl">✨</div>
              <p className="text-sm text-muted-foreground">
                Sincronização concluída com sucesso!
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-center space-y-2">
              <div className="text-4xl">⚠️</div>
              <p className="text-sm text-muted-foreground">
                Ocorreu um erro. Tente novamente.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          {status === 'idle' && pendingCount !== null && pendingCount > 0 && (
            <Button onClick={handleSync} disabled={isProcessing} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Iniciar Sincronização
            </Button>
          )}
          
          {status === 'error' && (
            <Button onClick={loadPendingCount} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
          )}
          
          {(status === 'done' || (status === 'idle' && pendingCount === 0)) && (
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}