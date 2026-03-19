import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, TrendingUp, Lock, CalendarIcon } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { marked } from 'marked';
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { detectGenderBias, type BiasDetectionResult } from "@/lib/biasDetection";
import { BiasAlert } from "@/components/BiasAlert";
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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [biasResult, setBiasResult] = useState<BiasDetectionResult | null>(null);
  const [showBiasAlert, setShowBiasAlert] = useState(false);
  const [biasDismissCount, setBiasDismissCount] = useState(0);
  const { toast } = useToast();
  const { canGenerateReview, limits } = usePlanLimits();

  // Obter nome do gestor logado
  const [managerName, setManagerName] = useState<string>('Gestor');
  
  useEffect(() => {
    const fetchManagerName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || 'Gestor';
        setManagerName(name);
      }
    };
    if (open) {
      fetchManagerName();
    }
  }, [open]);

  // Debounced bias detection (2s after typing stops, min 50 chars)
  useEffect(() => {
    if (!content || content.length < 50 || biasDismissCount >= 3) return;

    const timer = setTimeout(() => {
      const result = detectGenderBias(content);
      if (result.hasBias) {
        setBiasResult(result);
        setShowBiasAlert(true);
      } else {
        setShowBiasAlert(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [content, biasDismissCount]);

  const handlePresetClick = (months: number) => {
    const today = new Date();
    const startDate = subMonths(today, months);
    setDateRange({ from: startDate, to: today });
    setSelectedPreset(months);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setSelectedPreset(null);
  };

  const generateReview = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Selecione um período",
        description: "Escolha um preset ou selecione as datas manualmente.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    setGeneratedMonths(selectedPreset);
    
    // Timeout de 30 segundos para evitar UI travada
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    );
    
    const fetchPromise = supabase.functions.invoke('generate-review', {
      body: { 
        memberId,
        memberName,
        managerName,
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString()
      }
    });
    
    try {
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) {
        console.error('Erro ao gerar avaliação:', error);
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Convert Markdown from AI to HTML for the rich editor
      const rawContent = data.review_content || data.content || '';
      const htmlContent = rawContent.includes('</') ? rawContent : marked.parse(rawContent) as string;
      setContent(htmlContent);
      setCoachingTip(data.coaching_tip || null);
      
      // Auto-gerar título baseado no período
      const periodLabels: Record<number, string> = {
        1: 'Mensal',
        3: 'Trimestral',
        6: 'Semestral',
        12: 'Anual'
      };
      
      const currentDate = new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      if (selectedPreset && periodLabels[selectedPreset]) {
        setTitle(`Avaliação ${periodLabels[selectedPreset]} - ${currentDate}`);
      } else {
        const fromStr = format(dateRange.from, "MMM/yy", { locale: ptBR });
        const toStr = format(dateRange.to, "MMM/yy", { locale: ptBR });
        setTitle(`Avaliação ${fromStr} a ${toStr}`);
      }

      toast({
        title: "Avaliação gerada! ✨",
        description: `Analisamos ${data.feedbackCount} feedbacks do período selecionado.`,
      });
    } catch (error: any) {
      if (error.message === 'TIMEOUT') {
        toast({
          title: "Processamento em andamento ⏳",
          description: "A análise está demorando. Continue editando ou tente novamente em alguns instantes.",
        });
      } else {
        console.error('Erro ao gerar avaliação:', error);
        toast({
          title: "Erro ao gerar avaliação",
          description: error.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        });
      }
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
          period_type: generatedMonths ? periodTypeMap[generatedMonths] : 'manual',
          period_start: dateRange?.from?.toISOString(),
          period_end: dateRange?.to?.toISOString()
        });

      if (error) throw error;

      toast({
        title: "Avaliação salva! 🎉",
        description: "A avaliação foi salva com sucesso.",
      });

      // Fire-and-forget backup to Storage (Safety Net)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        supabase.functions.invoke('backup-data', {
          body: { 
            type: 'review', 
            data: { 
              member_id: memberId,
              title: title.trim(),
              content: content.trim(),
              coaching_tip: coachingTip,
              period_type: generatedMonths ? periodTypeMap[generatedMonths] : 'manual'
            },
            userId: user.id 
          }
        }).then(() => {
          toast({
            title: "Backup Seguro Confirmado 🔒",
            description: "Cópia salva no armazenamento.",
          });
        }).catch(err => {
          console.warn('Backup failed:', err);
          // Silent fail - main data is already saved
        });
      }

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
    setDateRange(undefined);
    setSelectedPreset(null);
    setBiasResult(null);
    setShowBiasAlert(false);
    setBiasDismissCount(0);
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
            <Label>Período da Avaliação</Label>
            <div className="flex gap-2 flex-wrap">
              <TooltipProvider>
                {[
                  { months: 1, label: 'Mensal' },
                  { months: 3, label: 'Trimestral' },
                  { months: 6, label: 'Semestral' },
                  { months: 12, label: 'Anual' },
                ].map(({ months, label }) => (
                  <Tooltip key={months}>
                    <TooltipTrigger asChild>
                      <span>
                        <Button 
                          type="button"
                          variant={selectedPreset === months ? "default" : "outline"}
                          onClick={() => handlePresetClick(months)}
                          disabled={generating}
                          className="gap-2"
                        >
                          {label}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!canGenerateReview && (
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium">Limite do plano {limits.planName} atingido</p>
                        <p className="text-sm text-muted-foreground">
                          {limits.maxReviews} avaliação(ões)/mês. Faça upgrade para Flow.
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          </div>

          {/* DateRange Picker */}
          <div className="space-y-2">
            <Label>Intervalo da Análise</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {" "}
                        {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    "Selecione o período"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                  locale={ptBR}
                  disabled={(date) => date > new Date()}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Botão Gerar com IA */}
          <div className="space-y-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full">
                    <Button
                      type="button"
                      onClick={generateReview}
                      disabled={generating || !canGenerateReview || !dateRange?.from || !dateRange?.to}
                      className="gap-2 w-full"
                    >
                      {!canGenerateReview ? (
                        <Lock className="h-4 w-4" />
                      ) : generating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                     Gerar rascunho de avaliação de desempenho
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canGenerateReview && (
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium">Limite do plano {limits.planName} atingido</p>
                    <p className="text-sm text-muted-foreground">
                      {limits.maxReviews} avaliação(ões)/mês. Faça upgrade para Flow.
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            {generating && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando histórico do período selecionado...
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
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Digite ou gere o conteúdo da avaliação usando os botões acima..."
                minHeight="400px"
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