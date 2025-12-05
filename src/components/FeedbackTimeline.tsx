import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, AlertTriangle, Trash2, Zap, Loader2, ChevronDown } from 'lucide-react';
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

interface Feedback {
  id: string;
  created_at: string;
  content: string;
  type: 'positive' | 'constructive' | 'neutral';
  summary?: string;
  sentiment?: string;
  coaching_tips?: string;
  bias_alert?: string;
}

interface FeedbackTimelineProps {
  feedbacks: Feedback[];
  onDelete?: (id: string) => void;
  onReanalyze?: (id: string) => void;
  reanalyzingId?: string | null;
}

export const FeedbackTimeline = ({ feedbacks, onDelete, onReanalyze, reanalyzingId }: FeedbackTimelineProps) => {
  const [openTranscripts, setOpenTranscripts] = useState<Record<string, boolean>>({});
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

  return (
    <div className="space-y-6">
      {feedbacks.map((feedback) => {
        const showAnalysis = hasAnalysis(feedback);
        const isReanalyzing = reanalyzingId === feedback.id;

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
              
              {showAnalysis ? (
                <>
                  {feedback.summary && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-primary mb-1">📝 Resumo</p>
                      <p className="text-foreground leading-relaxed">{feedback.summary}</p>
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
                  <p className="text-foreground leading-relaxed mb-4">{feedback.content}</p>
                  
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
