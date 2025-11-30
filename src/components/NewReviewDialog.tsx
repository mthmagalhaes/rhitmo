import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface NewReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  onReviewCreated: () => void;
}

export const NewReviewDialog = ({ 
  open, 
  onOpenChange, 
  memberId, 
  memberName,
  onReviewCreated 
}: NewReviewDialogProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coachingTip, setCoachingTip] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedMonths, setGeneratedMonths] = useState<number | null>(null);
  const { toast } = useToast();

  const generateReview = async (months: number) => {
    setGenerating(true);
    setGeneratedMonths(months);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-review', {
        body: { memberId, months }
      });

      if (error) {
        console.error('Erro ao gerar avaliação:', error);
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setContent(data.review_content || data.content || '');
      setCoachingTip(data.coaching_tip || null);
      
      // Auto-gerar título baseado no período
      const periodLabels: Record<number, string> = {
        1: 'Mensal',
        3: 'Trimestral',
        6: 'Semestral',
        12: 'Anual'
      };
      
      const periodLabel = periodLabels[months] || `${months} meses`;
      const currentDate = new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      setTitle(`Avaliação ${periodLabel} - ${currentDate}`);

      toast({
        title: "Avaliação gerada! ✨",
        description: `Analisamos ${data.feedbackCount} feedbacks dos últimos ${months} meses.`,
      });
    } catch (error: any) {
      console.error('Erro ao gerar avaliação:', error);
      toast({
        title: "Erro ao gerar avaliação",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e o conteúdo da avaliação.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const periodTypeMap: Record<number, string> = {
        1: '1_month',
        3: '3_months',
        6: '6_months',
        12: '12_months'
      };

      const { error } = await supabase
        .from('performance_reviews')
        .insert({
          member_id: memberId,
          title: title.trim(),
          content: content.trim(),
          coaching_tip: coachingTip,
          period_type: generatedMonths ? periodTypeMap[generatedMonths] : 'manual'
        });

      if (error) throw error;

      toast({
        title: "Avaliação salva! 🎉",
        description: "A avaliação foi salva com sucesso.",
      });

      onReviewCreated();
      handleClose();
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a avaliação.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setContent("");
    setCoachingTip(null);
    setGeneratedMonths(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Avaliação de Desempenho</DialogTitle>
          <DialogDescription>
            Gere uma avaliação estruturada para {memberName} ou escreva manualmente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Chips de Geração Rápida */}
          <div className="space-y-2">
            <Label>Gerar com IA (Máquina do Tempo)</Label>
            <div className="flex gap-2 flex-wrap">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => generateReview(1)}
                disabled={generating}
                className="gap-2"
              >
                {generating && generatedMonths === 1 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Mensal (1 mês)
              </Button>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => generateReview(3)}
                disabled={generating}
                className="gap-2"
              >
                {generating && generatedMonths === 3 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Trimestral (3 meses)
              </Button>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => generateReview(6)}
                disabled={generating}
                className="gap-2"
              >
                {generating && generatedMonths === 6 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Semestral (6 meses)
              </Button>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => generateReview(12)}
                disabled={generating}
                className="gap-2"
              >
                {generating && generatedMonths === 12 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Anual (12 meses)
              </Button>
            </div>
            {generating && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando histórico dos últimos {generatedMonths} meses...
              </p>
            )}
          </div>

          {coachingTip && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg print:hidden">
              <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                💡 Dicas para Apresentação (Visível apenas para você)
              </p>
              <div className="text-sm text-muted-foreground prose prose-sm max-w-none">
                <ReactMarkdown>{coachingTip}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Campos de Edição */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Avaliação</Label>
              <Input
                id="title"
                placeholder="Ex: Avaliação Trimestral - Q1 2024"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                placeholder="Digite ou gere o conteúdo da avaliação usando os botões acima..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Você pode editar livremente o conteúdo gerado pela IA antes de salvar.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim() || !content.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Avaliação"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};