import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trash2, Zap, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface Feedback {
  id: string;
  created_at: string;
  content: string;
  type: 'positive' | 'constructive' | 'neutral';
  summary?: string;
  sentiment?: string;
  coaching_tips?: string;
  bias_alert?: string;
  embedding?: string; // RAG embedding vector
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

  // Notas legadas têm coaching_tips preenchido
  const hasLegacyAnalysis = (feedback: Feedback) => {
    return feedback.coaching_tips || feedback.bias_alert;
  };

  const isProcessingAnalysis = (feedback: Feedback) => {
    // Nota está processando se não tem summary E não tem embedding
    return !feedback.summary && !feedback.embedding;
  };

  return (
    <div className="space-y-6">
      {feedbacks.map((feedback) => {
        const showLegacyAnalysis = hasLegacyAnalysis(feedback);
        const isReanalyzing = reanalyzingId === feedback.id;
        const isProcessing = isProcessingAnalysis(feedback);
        // Para notas RAG: mostrar summary diretamente, sem seção de transcrição
        const isRagNote = feedback.summary && !feedback.coaching_tips;

        return (
          <Card key={feedback.id} className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  {/* Só mostrar badges de tipo/sentiment para notas legadas (com coaching_tips) */}
                  {hasLegacyAnalysis(feedback) && (
                    <>
                      <Badge variant={getTypeVariant(feedback.type)}>
                        {getTypeLabel(feedback.type)}
                      </Badge>
                      {feedback.sentiment && (
                        <Badge variant="outline">{getSentimentLabel(feedback.sentiment)}</Badge>
                      )}
                    </>
                  )}
                  {isProcessing && (
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Analisando...</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(feedback.created_at).toLocaleDateString('pt-BR')}</span>
                  
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
              
              {/* Notas legadas (com coaching_tips) - exibir resumo + transcrição */}
              {showLegacyAnalysis ? (
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
              ) : isRagNote ? (
                /* Notas RAG - exibir summary diretamente, sem seção de transcrição */
                <>
                  <p className={cn(
                    "text-foreground leading-relaxed mb-4",
                    !expandedContent[feedback.id] && shouldShowExpandButton(feedback.summary) && "line-clamp-4"
                  )}>
                    {feedback.summary}
                  </p>
                  {shouldShowExpandButton(feedback.summary) && (
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
                </>
              ) : (
                /* Notas sem processamento - exibir content bruto */
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
