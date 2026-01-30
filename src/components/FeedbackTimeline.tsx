import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, AlertTriangle, Trash2, Zap, Loader2, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface Feedback {
  id: string;
  created_at: string;
  occurred_at?: string;
  content: string;
  type: 'positive' | 'constructive' | 'neutral';
  summary?: string;
  sentiment?: string;
  coaching_tips?: string;
  bias_alert?: string;
  _analysisStuck?: boolean; // Internal flag for timeout handling
}

interface FeedbackTimelineProps {
  feedbacks: Feedback[];
  onDelete?: (id: string) => void;
  onReanalyze?: (id: string) => void;
  reanalyzingId?: string | null;
}

export const FeedbackTimeline = ({ feedbacks, onDelete, onReanalyze, reanalyzingId }: FeedbackTimelineProps) => {
  const [openTranscripts, setOpenTranscripts] = useState<Record<string, boolean>>({});
  const [expandedContent, setExpandedContent] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedContent(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const shouldShowExpandButton = (text: string | undefined) => {
    if (!text) return false;
    // Approx 4 lines of text (around 250-300 chars)
    return text.length > 280;
  };
  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'positive':
        return 'default';
      case 'constructive':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'positive':
        return 'Positivo';
      case 'constructive':
        return 'Construtivo';
      default:
        return 'Neutro';
    }
  };

  const getSentimentLabel = (sentiment: string) => {
    const labels: Record<string, string> = {
      muito_positivo: 'Muito Positivo',
      positivo: 'Positivo',
      neutro: 'Neutro',
      construtivo: 'Construtivo',
      critico: 'Crítico'
    };
    return labels[sentiment] || sentiment;
  };

  const hasAnalysis = (feedback: Feedback) => {
    return feedback.summary || feedback.sentiment || feedback.coaching_tips || feedback.bias_alert;
  };

  const isProcessingAnalysis = (feedback: Feedback) => {
    // Note was just saved but AI hasn't processed it yet
    return !feedback.summary && !feedback.sentiment;
  };

  return (
    <div className="space-y-6">
      {feedbacks.map((feedback) => {
        const showAnalysis = hasAnalysis(feedback);
        const isReanalyzing = reanalyzingId === feedback.id;
        const isProcessing = isProcessingAnalysis(feedback);

        return (
          <Card key={feedback.id} className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant={getTypeVariant(feedback.type)}>
                    {getTypeLabel(feedback.type)}
                  </Badge>
                  {feedback.sentiment && (
                    <Badge variant="outline">{getSentimentLabel(feedback.sentiment)}</Badge>
                  )}
                  {isProcessing && !feedback._analysisStuck && (
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Analisando...</span>
                    </div>
                  )}
                  {isProcessing && feedback._analysisStuck && (
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs">
                      <Clock className="h-3 w-3" />
                      <span>Em processamento...</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(feedback.occurred_at || feedback.created_at).toLocaleDateString('pt-BR')}</span>
                  
                  {onDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          aria-label="Excluir feedback"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este feedback? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDelete(feedback.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
              
              {/* Alert for stuck analysis */}
              {isProcessing && feedback._analysisStuck && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg mb-4">
                  <p className="text-sm font-medium flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <Clock className="h-4 w-4" />
                    Análise em processamento
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    A IA está demorando mais que o normal. Você pode atualizar a página em alguns minutos.
                  </p>
                </div>
              )}

              {showAnalysis ? (
                <>
                  {feedback.summary && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-primary mb-1">📝 Resumo</p>
                      <p className={cn(
                        "text-foreground leading-relaxed",
                        !expandedContent[feedback.id] && shouldShowExpandButton(feedback.summary) && "line-clamp-4"
                      )}>
                        {feedback.summary}
                      </p>
                      {shouldShowExpandButton(feedback.summary) && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleExpand(feedback.id)}
                          className="mt-1 h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {expandedContent[feedback.id] ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              Ver menos
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Ver mais
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  {feedback.coaching_tips && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Dicas para a liderança
                      </p>
                      <div 
                        className="text-sm text-muted-foreground prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(feedback.coaching_tips.replace(/\n/g, '<br/>')) 
                        }}
                      />
                    </div>
                  )}

                  {feedback.bias_alert && feedback.bias_alert !== 'Nenhum viés detectado' && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded mb-4">
                      <p className="text-sm font-medium mb-1 flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                        <AlertTriangle className="h-4 w-4" />
                        Alerta de Viés
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">{feedback.bias_alert}</p>
                    </div>
                  )}

                  <Collapsible 
                    open={openTranscripts[feedback.id]} 
                    onOpenChange={(open) => setOpenTranscripts(prev => ({ ...prev, [feedback.id]: open }))}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                        <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${openTranscripts[feedback.id] ? 'rotate-180' : ''}`} />
                        Ver Transcrição Original
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <Separator className="mb-3" />
                      <p className="text-sm text-muted-foreground leading-relaxed">{feedback.content}</p>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              ) : (
                <>
                  <p className={cn(
                    "text-foreground leading-relaxed mb-4",
                    !expandedContent[feedback.id] && shouldShowExpandButton(feedback.content) && "line-clamp-4"
                  )}>
                    {feedback.content}
                  </p>
                  {shouldShowExpandButton(feedback.content) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleExpand(feedback.id)}
                      className="mb-4 h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {expandedContent[feedback.id] ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Ver menos
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Ver mais
                        </>
                      )}
                    </Button>
                  )}
                  
                  {onReanalyze && (
                    <Button
                      onClick={() => onReanalyze(feedback.id)}
                      disabled={isReanalyzing}
                      variant="outline"
                      className="w-full"
                    >
                      {isReanalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Gerar Análise de IA
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
