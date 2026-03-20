import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Target, Globe, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AdjustCompetencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competency: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  jobTitle: string;
  level: string;
  onAdjusted: (adjusted: { name: string; description: string }) => void;
}

export function AdjustCompetencyDialog({
  open, onOpenChange, competency, jobTitle, level, onAdjusted,
}: AdjustCompetencyDialogProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [adjusted, setAdjusted] = useState<{ name: string; description: string } | null>(null);

  const mutation = useMutation({
    mutationFn: async (type: string) => {
      const { data, error } = await supabase.functions.invoke('adjust-competency', {
        body: {
          competency_name: competency?.name,
          competency_description: competency?.description || '',
          job_title: jobTitle,
          level: level || 'Pleno',
          adjustment_type: type,
          custom_prompt: type === 'custom' ? customPrompt : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { name: string; description: string };
    },
    onSuccess: (data) => {
      setAdjusted(data);
      toast({ title: 'Competência ajustada com IA!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao ajustar', description: err.message, variant: 'destructive' });
    },
  });

  const handleAdjust = (type: string) => {
    if (type === 'custom' && !customPrompt.trim()) {
      toast({ title: 'Digite uma instrução', variant: 'destructive' });
      return;
    }
    mutation.mutate(type);
  };

  const handleUse = () => {
    if (adjusted) {
      onAdjusted(adjusted);
      onOpenChange(false);
      reset();
    }
  };

  const reset = () => {
    setCustomPrompt('');
    setAdjusted(null);
  };

  if (!competency) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Ajustar Competência com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted/40 rounded-xl space-y-1">
            <p className="font-semibold text-sm">{competency.name}</p>
            <p className="text-xs text-muted-foreground">{competency.description}</p>
            <p className="text-xs text-muted-foreground">Cargo: {jobTitle} · Nível: {level || 'N/A'}</p>
          </div>

          {!adjusted ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Como você quer ajustar?</p>
                <div className="grid gap-2">
                  <Button
                    variant="outline" className="justify-start gap-3 h-auto py-3 rounded-xl"
                    onClick={() => handleAdjust('more_specific')}
                    disabled={mutation.isPending}
                  >
                    <Target className="h-4 w-4 shrink-0 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Mais específico para o cargo</p>
                      <p className="text-xs text-muted-foreground">Ajusta para {jobTitle}</p>
                    </div>
                  </Button>
                  <Button
                    variant="outline" className="justify-start gap-3 h-auto py-3 rounded-xl"
                    onClick={() => handleAdjust('more_generic')}
                    disabled={mutation.isPending}
                  >
                    <Globe className="h-4 w-4 shrink-0 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Mais genérico</p>
                      <p className="text-xs text-muted-foreground">Aplicável a múltiplos cargos</p>
                    </div>
                  </Button>
                  <Button
                    variant="outline" className="justify-start gap-3 h-auto py-3 rounded-xl"
                    onClick={() => handleAdjust('adjust_level')}
                    disabled={mutation.isPending}
                  >
                    <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Ajustar para nível {level || 'Pleno'}</p>
                      <p className="text-xs text-muted-foreground">Expectativas do nível</p>
                    </div>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Ou personalize</p>
                <Textarea
                  placeholder="Ex: 'Focar em comunicação com stakeholders C-level'"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={2}
                  className="rounded-xl"
                />
                <Button
                  size="sm"
                  onClick={() => handleAdjust('custom')}
                  disabled={mutation.isPending || !customPrompt.trim()}
                  className="gap-2"
                >
                  {mutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Ajustando...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Ajustar com IA</>
                  )}
                </Button>
              </div>

              {mutation.isPending && (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Ajustando com IA...
                </div>
              )}
            </>
          ) : (
            <>
              <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl space-y-1">
                <p className="text-xs font-medium text-primary">✨ Competência ajustada</p>
                <p className="font-semibold text-sm">{adjusted.name}</p>
                <p className="text-sm text-muted-foreground">{adjusted.description}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={reset}>
                  Ajustar novamente
                </Button>
                <Button className="flex-1 rounded-xl" onClick={handleUse}>
                  Usar esta versão
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
