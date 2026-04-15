import { useState, useRef } from 'react';
import { Trash2, ChevronDown, Lock, Eye, MoreVertical, Mic, RefreshCw, Copy, MessageSquare, Pencil, CalendarIcon } from 'lucide-react';
import { SlackIcon } from '@/components/icons/SlackIcon';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getTagEmoji, getTagColor, VALID_TAGS } from '@/lib/tagConfig';
import { cleanTranscriptText, containsHtml } from '@/lib/textSanitizer';
import DOMPurify from 'dompurify';
import { BiasDetectionPanel } from '@/components/BiasDetectionPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

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
  
  if (containsHtml(content)) {
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
  
  const cleanedText = cleanTranscriptText(content);
  return (
    <p className="whitespace-pre-wrap text-foreground leading-relaxed">
      {cleanedText}
    </p>
  );
};

export const FeedbackTimeline = ({ feedbacks, onDelete, onToggleVisibility }: FeedbackTimelineProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState<{ open: boolean; feedback: Feedback | null }>({ open: false, feedback: null });
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editOccurredAt, setEditOccurredAt] = useState<Date | undefined>();
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editorRef = useRef<any>(null);
  const [replicateDialog, setReplicateDialog] = useState<{ open: boolean; feedback: Feedback | null }>({ open: false, feedback: null });
  const [replicateTargets, setReplicateTargets] = useState<string[]>([]);
  const [replicateShared, setReplicateShared] = useState<Record<string, boolean>>({});
  const [isReplicating, setIsReplicating] = useState(false);

  const { data: allMembers = [] } = useQuery({
    queryKey: ['team-members-for-replicate', replicateDialog.feedback?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('team_members')
        .select('id, name, role');
      return data || [];
    },
    enabled: replicateDialog.open,
  });

  // Filter out the member who already has the note
  const availableMembers = allMembers.filter(
    (m) => replicateDialog.feedback && m.id !== (replicateDialog.feedback as any).member_id
  );

  const openReplicateDialog = (feedback: Feedback) => {
    setReplicateDialog({ open: true, feedback });
    setReplicateTargets([]);
    setReplicateShared({});
  };

  const handleReplicate = async () => {
    if (!replicateDialog.feedback || !user?.id || replicateTargets.length === 0) return;
    setIsReplicating(true);
    const fb = replicateDialog.feedback;
    let successCount = 0;

    for (const memberId of replicateTargets) {
      const { data: inserted } = await supabase
        .from('feedbacks')
        .insert({
          member_id: memberId,
          manager_id: user.id,
          content: fb.content,
          title: fb.title || null,
          tags: fb.tags || [],
          occurred_at: fb.occurred_at || fb.created_at,
          source: fb.source || 'manual',
          type: fb.type,
          visibility: replicateShared[memberId] ? 'shared' : 'private_leader',
          summary: null,
          sentiment: null,
          coaching_tips: null,
          bias_alert: null,
        })
        .select('id')
        .single();

      if (inserted?.id) {
        successCount++;
        supabase.functions.invoke('analyze-feedback-background', {
          body: { feedbackId: inserted.id },
        });
      }
    }

    if (successCount > 0) {
      toast.success(`Nota replicada para ${successCount} liderado(s)! ✨`);
    }
    setReplicateDialog({ open: false, feedback: null });
    setReplicateTargets([]);
    setReplicateShared({});
    setIsReplicating(false);
  };

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {feedbacks.map((feedback) => {
          const displayTitle = feedback.title || `Nota de ${new Date(feedback.occurred_at || feedback.created_at).toLocaleDateString('pt-BR')}`;
          const isFallbackTitle = !feedback.title;
          const formattedDate = new Date(feedback.occurred_at || feedback.created_at).toLocaleDateString('pt-BR');
          const isShared = feedback.visibility === 'shared';
          const isTranscription = feedback.source === 'transcription' || feedback.source === 'recall_bot' || !!feedback.meeting_transcript_id;
          const isSlack = feedback.source === 'slack';
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
                  
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    📅 {formattedDate}
                  </span>
                  
                  <span className={cn(
                    "font-medium truncate",
                    isFallbackTitle ? "text-muted-foreground italic" : "text-foreground"
                  )}>
                    {displayTitle}
                  </span>
                  
                  {isTranscription && (
                    <Badge variant="outline" className="hidden sm:flex text-xs py-0.5 px-2 border-primary/30 text-primary bg-primary/10 gap-1">
                      <Mic className="h-3 w-3" /> Transcrição
                    </Badge>
                  )}

                  {isSlack && !isTranscription && (
                    <Badge variant="outline" className="hidden sm:flex text-xs py-0.5 px-2 border-[#4A154B]/30 text-[#4A154B] dark:text-[#E01E5A] bg-[#4A154B]/10 gap-1">
                      <SlackIcon className="h-3 w-3" /> Slack
                    </Badge>
                  )}

                  {isShared && !isTranscription && !isSlack && (
                    <Badge variant="outline" className="hidden sm:flex text-xs py-0.5 px-2 border-primary/30 text-primary bg-primary/10">
                      Compartilhado
                    </Badge>
                  )}
                  
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
                          className="h-7 w-7 text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
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
                        <DropdownMenuItem onClick={() => openReplicateDialog(feedback)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Replicar para liderados
                        </DropdownMenuItem>
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
                  {isTranscription && (
                    <Badge variant="outline" className="flex sm:hidden text-xs py-0.5 px-2 mb-3 w-fit border-primary/30 text-primary bg-primary/10 gap-1">
                      <Mic className="h-3 w-3" /> Transcrição
                    </Badge>
                  )}
                  {isSlack && !isTranscription && (
                    <Badge variant="outline" className="flex sm:hidden text-xs py-0.5 px-2 mb-3 w-fit border-[#4A154B]/30 text-[#4A154B] dark:text-[#E01E5A] bg-[#4A154B]/10 gap-1">
                      <SlackIcon className="h-3 w-3" /> Slack
                    </Badge>
                  )}
                  {isShared && !isTranscription && !isSlack && (
                    <Badge variant="outline" className="flex sm:hidden text-xs py-0.5 px-2 mb-3 w-fit border-primary/30 text-primary bg-primary/10">
                      Compartilhado
                    </Badge>
                  )}
                  
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
                  
                  {renderSanitizedContent(feedback.content)}
                  
                  <BiasDetectionPanel 
                    biasAlert={feedback.bias_alert ?? null} 
                    wordCount={feedback.content?.trim().split(/\s+/).filter(w => w.length > 0).length ?? 0}
                  />
                  
                  {(window.location.hostname.includes('localhost') || window.location.hostname.includes('preview')) && (
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground gap-1.5 h-7"
                        onClick={async () => {
                          try {
                            await supabase.functions.invoke('analyze-feedback-background', {
                              body: { feedbackId: feedback.id }
                            });
                            toast.success('Análise enviada! Recarregue em alguns segundos.');
                          } catch (err) {
                            toast.error('Falha ao reanalisar.');
                          }
                        }}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Reanalisar
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Dialog de Replicação */}
      <Dialog open={replicateDialog.open} onOpenChange={(open) => {
        if (!open) {
          setReplicateDialog({ open: false, feedback: null });
          setReplicateTargets([]);
          setReplicateShared({});
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Replicar nota para outros liderados</DialogTitle>
            <DialogDescription>
              {replicateDialog.feedback?.title || 'Esta nota'} será copiada com análise de IA individual para cada liderado.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[300px]">
            <div className="space-y-3 pr-3">
              {availableMembers.map((member) => {
                const isSelected = replicateTargets.includes(member.id);
                return (
                  <div key={member.id} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`rep-${member.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setReplicateTargets((prev) => [...prev, member.id]);
                          } else {
                            setReplicateTargets((prev) => prev.filter((id) => id !== member.id));
                            setReplicateShared((prev) => {
                              const next = { ...prev };
                              delete next[member.id];
                              return next;
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`rep-${member.id}`} className="flex-1 cursor-pointer">
                        <span className="font-medium text-foreground">{member.name}</span>
                        <span className="text-muted-foreground text-sm ml-1.5">· {member.role}</span>
                      </Label>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-2 ml-7">
                        <Switch
                          id={`share-${member.id}`}
                          checked={replicateShared[member.id] || false}
                          onCheckedChange={(checked) =>
                            setReplicateShared((prev) => ({ ...prev, [member.id]: checked }))
                          }
                        />
                        <Label htmlFor={`share-${member.id}`} className="text-sm text-muted-foreground cursor-pointer">
                          Compartilhar com {member.name.split(' ')[0]}?
                        </Label>
                      </div>
                    )}
                  </div>
                );
              })}
              {availableMembers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum outro liderado disponível.
                </p>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReplicateDialog({ open: false, feedback: null })}>
              Cancelar
            </Button>
            <Button
              onClick={handleReplicate}
              disabled={replicateTargets.length === 0 || isReplicating}
            >
              {isReplicating ? 'Replicando...' : `Replicar (${replicateTargets.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
