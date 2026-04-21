import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MonthlyReportButtonProps {
  workspaceId: string;
}

export function MonthlyReportButton({ workspaceId }: MonthlyReportButtonProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!workspaceId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-monthly-report', {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      if (!data?.url) {
        toast.error('Não foi possível gerar o PDF');
        return;
      }
      window.open(data.url, '_blank', 'noopener,noreferrer');
      toast.success('Relatório mensal gerado');
    } catch (err) {
      console.error('[MonthlyReportButton]', err);
      const msg = err instanceof Error ? err.message : 'Erro ao gerar relatório';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={generating || !workspaceId}
      variant="outline"
      className="rounded-xl gap-2 h-10"
    >
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {generating ? 'Gerando...' : 'Exportar PDF do mês'}
    </Button>
  );
}
