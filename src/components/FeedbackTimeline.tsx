import { Trash2, ChevronDown, Lock, Eye, MoreVertical, Mic } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getTagEmoji, getTagColor } from '@/lib/tagConfig';
import { cleanTranscriptText, containsHtml } from '@/lib/textSanitizer';
import DOMPurify from 'dompurify';
import { BiasDetectionPanel } from '@/components/BiasDetectionPanel';

interface Feedback {
  id: string;
  created_at: string;
  occurred_at?: string;
  content: string;
  type: 'positive' | 'constructive' | 'neutral';
  tags?: string[];
  title?: string | null;
  visibility?: string | null;
  source?: string | null;
  meeting_transcript_id?: string | null;
  bias_alert?: string | null;
}

interface FeedbackTimelineProps {
  feedbacks: Feedback[];
  onDelete?: (id: string) => void;
  onToggleVisibility?: (id: string, newVisibility: 'shared' | 'private_leader') => void;
}
 
 // Função para renderizar conteúdo sanitizado
 const renderSanitizedContent = (content: string) => {
   if (!content) return null;
   
   // Verificar se contém HTML
   if (containsHtml(content)) {
     // Sanitizar HTML e renderizar com estilos prose
     return (
       <div 
         className="prose prose-sm max-w-none text-foreground dark:prose-invert"
         dangerouslySetInnerHTML={{ 
           __html: DOMPurify.sanitize(content, {
             ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
             ALLOWED_ATTR: []
           }) 
         }} 
       />
     );
   }
   
   // Texto puro: limpar e usar whitespace-pre-wrap
   const cleanedText = cleanTranscriptText(content);
   return (
     <p className="whitespace-pre-wrap text-foreground leading-relaxed">
       {cleanedText}
     </p>
   );
 };
 
export const FeedbackTimeline = ({ feedbacks, onDelete, onToggleVisibility }: FeedbackTimelineProps) => {
  return (
    <TooltipProvider>
      <div className="space-y-2">
        {feedbacks.map((feedback) => {
          const displayTitle = feedback.title || `Nota de ${new Date(feedback.occurred_at || feedback.created_at).toLocaleDateString('pt-BR')}`;
          const isFallbackTitle = !feedback.title;
          const formattedDate = new Date(feedback.occurred_at || feedback.created_at).toLocaleDateString('pt-BR');
          const isShared = feedback.visibility === 'shared';
          const isTranscription = feedback.source === 'transcription' || !!feedback.meeting_transcript_id;
          
          return (
            <Collapsible key={feedback.id} className="group">
              <div className="flex items-center rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                {/* Trigger Area */}
                <CollapsibleTrigger className="flex-1 flex items-center gap-3 p-4 text-left">
                  {/* Source/Visibility Icon */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="shrink-0">
                        {isTranscription ? (
                          <Mic className="h-4 w-4 text-primary" />
                        ) : isShared ? (
                          <Eye className="h-4 w-4 text-primary" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isTranscription ? 'Transcrição de áudio' : isShared ? 'Compartilhado com colaborador' : 'Visível apenas para você'}
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Data */}
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    📅 {formattedDate}
                  </span>
                  
                  {/* Título com Fallback */}
                  <span className={cn(
                    "font-medium truncate",
                    isFallbackTitle ? "text-muted-foreground italic" : "text-foreground"
                  )}>
                    {displayTitle}
                  </span>
                  
                  {/* Transcription Badge */}
                  {isTranscription && (
                    <Badge variant="outline" className="hidden sm:flex text-xs py-0.5 px-2 border-primary/30 text-primary bg-primary/10 gap-1">
                      <Mic className="h-3 w-3" /> Transcrição
                    </Badge>
                  )}

                  {/* Shared Badge (visible on shared items) */}
                  {isShared && !isTranscription && (
                    <Badge variant="outline" className="hidden sm:flex text-xs py-0.5 px-2 border-primary/30 text-primary bg-primary/10">
                      Compartilhado
                    </Badge>
                  )}
                  
                  {/* Tags (se existirem) */}
                  {feedback.tags && feedback.tags.length > 0 && (
                    <div className="hidden sm:flex flex-wrap gap-1 shrink-0">
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
                  
                  {/* Chevron */}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 ml-auto" />
                </CollapsibleTrigger>
                
                {/* Actions Menu */}
                <div className="pr-3 flex items-center gap-1">
                  {(onDelete || onToggleVisibility) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onToggleVisibility && (
                          <DropdownMenuItem 
                            onClick={() => onToggleVisibility(
                              feedback.id, 
                              isShared ? 'private_leader' : 'shared'
                            )}
                          >
                            {isShared ? (
                              <>
                                <Lock className="h-4 w-4 mr-2" />
                                Tornar privado
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Compartilhar
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              
              {/* Conteúdo Expandido */}
              <CollapsibleContent>
                <div className="px-4 py-3 border-x border-b rounded-b-lg bg-muted/30">
                 {/* Transcription Badge em mobile */}
                  {isTranscription && (
                    <Badge variant="outline" className="flex sm:hidden text-xs py-0.5 px-2 mb-3 w-fit border-primary/30 text-primary bg-primary/10 gap-1">
                      <Mic className="h-3 w-3" /> Transcrição
                    </Badge>
                  )}
                  {/* Shared Badge em mobile */}
                  {isShared && !isTranscription && (
                    <Badge variant="outline" className="flex sm:hidden text-xs py-0.5 px-2 mb-3 w-fit border-primary/30 text-primary bg-primary/10">
                      Compartilhado
                    </Badge>
                  )}
                  
                  {/* Tags em mobile (repetidas aqui para visibilidade) */}
                  {feedback.tags && feedback.tags.length > 0 && (
                    <div className="flex sm:hidden flex-wrap gap-1.5 mb-3">
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
                  
                  {/* Conteúdo Sanitizado */}
                  {renderSanitizedContent(feedback.content)}
                  
                  {/* Bias Detection Panel */}
                  <BiasDetectionPanel 
                    biasAlert={feedback.bias_alert ?? null} 
                    wordCount={feedback.content?.trim().split(/\s+/).filter(w => w.length > 0).length ?? 0}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
