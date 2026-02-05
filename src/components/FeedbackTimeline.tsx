import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Trash2, ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getTagEmoji, getTagColor } from '@/lib/tagConfig';

interface Feedback {
  id: string;
  created_at: string;
  occurred_at?: string;
  content: string;
  type: 'positive' | 'constructive' | 'neutral';
  tags?: string[];
  title?: string | null;
}

interface FeedbackTimelineProps {
  feedbacks: Feedback[];
  onDelete?: (id: string) => void;
  onAnalyze?: (feedbackId: string, content: string) => void;
  analyzingId?: string | null;
}

export const FeedbackTimeline = ({ feedbacks, onDelete, onAnalyze, analyzingId }: FeedbackTimelineProps) => {
  const [expandedContent, setExpandedContent] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedContent(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const shouldShowExpandButton = (text: string | undefined) => {
    if (!text) return false;
    return text.length > 280;
  };

  return (
    <div className="space-y-6">
      {feedbacks.map((feedback) => (
        <Card key={feedback.id} className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            {/* Header: Data + Delete */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(feedback.occurred_at || feedback.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                
                {/* Smart Tags */}
                {feedback.tags && feedback.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.tags.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="outline" 
                        className={cn("text-xs py-0.5 px-2 border", getTagColor(tag))}
                      >
                        {getTagEmoji(tag)} {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
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
            
            {/* Título (se existir) */}
            {feedback.title && (
              <h4 className="font-medium text-foreground mb-2">
                {feedback.title}
              </h4>
            )}
            
            {/* Content with expand toggle */}
            <p className={cn(
              "text-foreground leading-relaxed",
              !expandedContent[feedback.id] && shouldShowExpandButton(feedback.content) && "line-clamp-4"
            )}>
              {feedback.content}
            </p>
            {shouldShowExpandButton(feedback.content) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleExpand(feedback.id)}
                className="mt-2 h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
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

            {/* Botão de Análise para Notas Legado */}
            {(!feedback.tags || feedback.tags.length === 0) && onAnalyze && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAnalyze(feedback.id, feedback.content)}
                  disabled={analyzingId === feedback.id}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                >
                  {analyzingId === feedback.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Analisar com IA
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
