import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Brain, Heart, TrendingUp, AlertTriangle, Trash2 } from 'lucide-react';
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
}

export const FeedbackTimeline = ({ feedbacks, onDelete }: FeedbackTimelineProps) => {
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

  return (
    <div className="space-y-6">
      {feedbacks.map((feedback) => (
        <Card key={feedback.id} className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <Badge variant={getTypeVariant(feedback.type)}>
                {getTypeLabel(feedback.type)}
              </Badge>
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
            
            <p className="text-foreground leading-relaxed mb-4">{feedback.content}</p>

            {feedback.summary && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                    <Brain className="h-4 w-4" />
                    Análise por IA
                  </h4>

                  {feedback.summary && (
                    <div>
                      <p className="text-sm font-medium mb-1">Resumo:</p>
                      <p className="text-sm text-muted-foreground">{feedback.summary}</p>
                    </div>
                  )}

                  {feedback.sentiment && (
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Sentimento:</span>
                      <Badge variant="outline">{getSentimentLabel(feedback.sentiment)}</Badge>
                    </div>
                  )}

                  {feedback.coaching_tips && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Dicas de Coaching:
                      </p>
                      <div 
                        className="text-sm text-muted-foreground prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: feedback.coaching_tips.replace(/\n/g, '<br/>') 
                        }}
                      />
                    </div>
                  )}

                  {feedback.bias_alert && feedback.bias_alert !== 'Nenhum viés detectado' && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded">
                      <p className="text-sm font-medium mb-1 flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                        <AlertTriangle className="h-4 w-4" />
                        Alerta de Viés:
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">{feedback.bias_alert}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
