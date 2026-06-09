import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PenSquare, Loader2, Upload, CalendarIcon, X, Eye, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceInput } from './VoiceInput';
import { extractTextFromFile, isFileSupported } from '@/lib/fileParser';
import { cleanTranscriptText } from '@/lib/textSanitizer';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useEditor } from '@tiptap/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { getTagEmoji, getTagColor, VALID_TAGS } from '@/lib/tagConfig';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { detectBiasWithPositions, type BiasMatch } from '@/lib/biasDetection';
import { BiasSuggestionsPanel } from '@/components/feedback/BiasSuggestionsPanel';
import { NOTE_TEMPLATES, getTemplateById, type NoteTemplateId } from '@/lib/noteTemplates';
import { useTranslation } from 'react-i18next';

// Smart Date Extraction - analisa as primeiras 20 linhas do texto
const extractDateFromText = (text: string): Date | null => {
  const lines = text.split('\n').slice(0, 20).join('\n');
  
  const tactiqMatch = lines.match(/Meeting\s+started:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i);
  if (tactiqMatch) {
    const [, day, month, year] = tactiqMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const date = new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime()) && date <= new Date()) return date;
  }
  
  const isoMatch = lines.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime()) && date <= new Date()) return date;
  }
  
  const brMatch = lines.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime()) && date <= new Date()) return date;
  }
  
  const brShortMatch = lines.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})(?!\d)/);
  if (brShortMatch) {
    const [, day, month, year] = brShortMatch;
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    const date = new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime()) && date <= new Date()) return date;
  }
  
  return null;
};

interface NewNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMemberId?: string;
  memberName?: string;
  onSuccess?: () => void;
  workspaceId?: string;
  initialContent?: string;
  initialTitle?: string;
  /**
   * Liderados que o usuário pode anotar nesta sessão.
   * Quando informado, evita query ampla por workspace_id (que vazaria
   * liderados de outros líderes para Owners/HR Admins do workspace).
   * Pais já têm essa lista via `useLeaderMembers`.
   */
  members?: Array<{ id: string; name: string }>;
}

export const NewNoteDialog = ({ open, onOpenChange, selectedMemberId, memberName, onSuccess, workspaceId, initialContent, initialTitle, members: scopedMembers }: NewNoteDialogProps) => {
  const [content, setContent] = useState(initialContent ?? '');
  const [memberId, setMemberId] = useState(selectedMemberId || '');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [sharedMemberIds, setSharedMemberIds] = useState<string[]>([]);
  const [occurredAt, setOccurredAt] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isShared, setIsShared] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [memberPopoverOpen, setMemberPopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  const [biasMatches, setBiasMatches] = useState<BiasMatch[]>([]);
  const [biasDismissCount, setBiasDismissCount] = useState(0);
  const biasTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced bias detection on content changes
  useEffect(() => {
    if (biasTimerRef.current) clearTimeout(biasTimerRef.current);
    if (biasDismissCount >= 3) return;

    biasTimerRef.current = setTimeout(() => {
      if (!editorRef.current) return;
      const plainText = editorRef.current.getText();
      if (plainText.length < 15) {
        setBiasMatches([]);
        return;
      }
      const matches = detectBiasWithPositions(plainText);
      setBiasMatches(matches);
    }, 800);

    return () => {
      if (biasTimerRef.current) clearTimeout(biasTimerRef.current);
    };
  }, [content, biasDismissCount]);

  const handleApplyBiasSuggestion = useCallback((match: BiasMatch) => {
    if (!editorRef.current) return;
    const text = editorRef.current.getText();
    const before = text.slice(0, match.from);
    const after = text.slice(match.to);
    const newText = before + match.suggestion + after;
    editorRef.current.commands.setContent(`<p>${newText}</p>`);
    setBiasMatches(prev => prev.filter(m => m.from !== match.from));
  }, []);

  const handleApplyAllBiasSuggestions = useCallback(() => {
    if (!editorRef.current || biasMatches.length === 0) return;
    let text = editorRef.current.getText();
    // Apply in reverse order to preserve positions
    const sorted = [...biasMatches].sort((a, b) => b.from - a.from);
    for (const match of sorted) {
      text = text.slice(0, match.from) + match.suggestion + text.slice(match.to);
    }
    editorRef.current.commands.setContent(`<p>${text}</p>`);
    setBiasMatches([]);
  }, [biasMatches]);

  const isMultiMode = !selectedMemberId;

  const resetForm = () => {
    setContent('');
    setMemberId('');
    setSelectedMemberIds([]);
    setSharedMemberIds([]);
    setOccurredAt(undefined);
    setTags([]);
    setTitle('');
    setIsDragging(false);
    setIsProcessingFile(false);
    setIsShared(false);
    setHasAttemptedSubmit(false);
    setMemberPopoverOpen(false);
    setBiasMatches([]);
    setBiasDismissCount(0);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (editorRef.current) {
      editorRef.current.commands.clearContent();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const tryExtractDate = (text: string) => {
    if (occurredAt) return;
    
    const detectedDate = extractDateFromText(text);
    if (detectedDate) {
      setOccurredAt(detectedDate);
      toast({
        title: "📅 Data detectada",
        description: `Data de ${format(detectedDate, "dd/MM/yyyy")} encontrada no texto.`,
      });
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  React.useEffect(() => {
    if (!open || selectedMemberId) return;
    // Prefer the leader-scoped list passed by the parent (via useLeaderMembers).
    if (scopedMembers && scopedMembers.length >= 0) {
      setTeamMembers(scopedMembers.map((m) => ({ id: m.id, name: m.name })));
      return;
    }
    // Fallback: query restrita por leader_user_id do usuário atual.
    // NUNCA filtrar só por workspace_id — RLS libera todo o workspace pra
    // Owners/HR Admins e isso vazaria liderados de outros líderes.
    loadTeamMembers();
  }, [open, selectedMemberId, workspaceId, scopedMembers]);

  const loadTeamMembers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('team_members')
      .select('id, name, teams!inner(leader_user_id, workspace_id)')
      .eq('teams.leader_user_id', user.id)
      .is('archived_at', null)
      .order('name');

    if (workspaceId) {
      query = query.eq('teams.workspace_id', workspaceId);
    }

    const { data } = await query;
    if (data) {
      setTeamMembers(data);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
    // Also remove from shared if unchecked
    setSharedMemberIds(prev => prev.filter(m => m !== id || selectedMemberIds.includes(id)));
  };

  const removeMember = (id: string) => {
    setSelectedMemberIds(prev => prev.filter(m => m !== id));
    setSharedMemberIds(prev => prev.filter(m => m !== id));
  };

  const getMemberName = (id: string) => {
    return teamMembers.find(m => m.id === id)?.name || id;
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!isFileSupported(file)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, envie arquivos PDF, Word, TXT, Markdown ou imagens (PNG, JPG, WebP).",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingFile(true);

    try {
      const extractedText = await extractTextFromFile(file);
       const cleanedText = cleanTranscriptText(extractedText);
       setContent(cleanedText);
      
       tryExtractDate(cleanedText);
      
      toast({
        title: "Arquivo processado!",
        description: `Texto extraído de ${file.name}`,
      });
    } catch (error: any) {
      console.error('Error extracting text:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = async () => {
    setHasAttemptedSubmit(true);
    if (!content.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, adicione o conteúdo da nota.",
        variant: "destructive"
      });
      return;
    }

    // Determine target members
    const targetMemberIds = selectedMemberId 
      ? [selectedMemberId] 
      : selectedMemberIds;

    if (targetMemberIds.length === 0) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione ao menos um liderado.",
        variant: "destructive"
      });
      return;
    }

    if (!occurredAt) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione a data do ocorrido.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Você precisa estar logado');
      }

      const cleanedContent = cleanTranscriptText(content);
       
      // Classification (once for all members)
      let finalTags = tags;
      let finalTitle = title.trim();
      
      const shouldClassify = cleanedContent.length > 20 && 
                            (tags.length === 0 || !finalTitle);
       
      if (shouldClassify) {
        try {
          console.log('[NewNoteDialog] Auto-classifying content...');
          
          const { data: classifyData, error: classifyError } = await supabase
            .functions.invoke('classify-note', {
              body: { content: cleanedContent }
            });
          
          if (classifyError) {
            console.warn('[NewNoteDialog] Classification failed, proceeding without:', classifyError);
          } else {
            if (tags.length === 0 && classifyData?.tags?.length > 0) {
              finalTags = classifyData.tags;
            }
            if (!finalTitle && classifyData?.suggestedTitle) {
              finalTitle = classifyData.suggestedTitle;
            }
            console.log('[NewNoteDialog] Classification result:', { tags: finalTags, title: finalTitle });
          }
        } catch (classifyErr) {
          console.warn('[NewNoteDialog] Classification error (non-blocking):', classifyErr);
        }
      }

      // Loop: insert for each member
      let firstFeedback: any = null;

      for (let i = 0; i < targetMemberIds.length; i++) {
        const mid = targetMemberIds[i];
        
        // Determine visibility for this member
        let visibility: string;
        if (selectedMemberId) {
          // Single-member mode (from /member/:id page)
          visibility = isShared ? 'shared' : 'private_leader';
        } else {
          // Multi-member mode
          visibility = sharedMemberIds.includes(mid) ? 'shared' : 'private_leader';
        }

        const { data: feedback, error: insertError } = await supabase
          .from('feedbacks')
          .insert({
            manager_id: user.id,
            member_id: mid,
            content: cleanedContent,
            type: 'neutral',
            occurred_at: occurredAt.toISOString(),
            tags: finalTags.length > 0 ? finalTags : [],
            title: finalTitle || null,
            visibility,
            summary: null,
            sentiment: null,
            coaching_tips: null,
            bias_alert: null,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (i === 0) firstFeedback = feedback;

        // Fire-and-forget: trigger AI analysis
        if (feedback?.id) {
          supabase.functions.invoke('analyze-feedback-background', {
            body: { feedbackId: feedback.id }
          }).catch(err => {
            console.warn('Background analysis failed (non-critical):', err);
          });
        }
      }

      // Toast
      const hasClassification = finalTags.length > 0 || finalTitle;
      if (targetMemberIds.length > 1) {
        toast({
          title: `Nota salva para ${targetMemberIds.length} liderados! ✨`,
          description: hasClassification
            ? `${finalTitle || ''} ${finalTags.length ? `• ${finalTags.join(", ")}` : ''}`.trim()
            : "Registros adicionados ao histórico.",
        });
      } else {
        toast({
          title: hasClassification ? "Anotação salva e classificada! ✨" : "Anotação salva! ✅",
          description: hasClassification 
            ? `${finalTitle || ''} ${finalTags.length ? `• ${finalTags.join(", ")}` : ''}`.trim()
            : "Registro adicionado ao histórico.",
        });
      }
      
      resetForm();
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }

      // Backup only first feedback (no toast)
      if (firstFeedback) {
        supabase.functions.invoke('backup-data', {
          body: { 
            type: 'feedback', 
            data: firstFeedback,
            userId: user.id 
          }
        }).catch(err => {
          console.warn('Backup failed:', err);
        });
      }

    } catch (error: any) {
      console.error('Error creating feedback:', error);
      toast({
        title: "Erro ao adicionar nota",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const effectiveMemberIds = selectedMemberId ? [selectedMemberId] : selectedMemberIds;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <PenSquare className="h-5 w-5" />
            Nova Anotação
          </DialogTitle>
          <DialogDescription>
            {memberName 
              ? `Adicione uma anotação para ${memberName}`
              : 'Cole ou digite a transcrição da reunião ou feedback'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4">
          {/* Sprint 1.4: Templates de Nota — reduzem fricção da página em branco */}
          <div className="space-y-2">
            <Label>Template</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {NOTE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    const html = tpl.buildHtml(t);
                    if (editorRef.current) {
                      if (html) {
                        editorRef.current.commands.setContent(html);
                      } else {
                        editorRef.current.commands.clearContent();
                      }
                    }
                    setContent(html);
                    if (tpl.defaultTags && tags.length === 0) setTags(tpl.defaultTags);
                    if (tpl.buildTitle && !title) {
                      const tt = tpl.buildTitle(t);
                      if (tt) setTitle(tt);
                    }
                  }}
                  className="flex flex-col items-start gap-1 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <span className="text-lg">{tpl.emoji}</span>
                  <span className="text-xs font-medium text-foreground">{t(tpl.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Member selection */}
          {!selectedMemberId && (
            <div className="space-y-2">
              <Label>Liderado(s)</Label>
              <Popover open={memberPopoverOpen} onOpenChange={setMemberPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={memberPopoverOpen}
                    className={cn(
                      "w-full justify-between font-normal h-auto min-h-10",
                      selectedMemberIds.length === 0 && "text-muted-foreground"
                    )}
                  >
                    {selectedMemberIds.length === 0 ? (
                      "Selecione liderados..."
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {selectedMemberIds.map(id => (
                          <Badge key={id} variant="secondary" className="text-xs gap-1">
                            {getMemberName(id)}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeMember(id); }}
                              className="ml-0.5 hover:bg-accent rounded-sm"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar liderado..." />
                    <CommandList>
                      <CommandEmpty>Nenhum liderado encontrado.</CommandEmpty>
                      <CommandGroup>
                        {teamMembers.map((member) => (
                          <CommandItem
                            key={member.id}
                            value={member.name}
                            onSelect={() => toggleMember(member.id)}
                          >
                            <Checkbox
                              checked={selectedMemberIds.includes(member.id)}
                              className="mr-2"
                            />
                            {member.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* DatePicker */}
          <div className="space-y-2">
            <Label>Data registrada *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !occurredAt && hasAttemptedSubmit && "text-muted-foreground border-orange-300"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {occurredAt 
                    ? format(occurredAt, "PPP", { locale: ptBR }) 
                    : "Selecione a data do ocorrido"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={occurredAt}
                  onSelect={(date) => date && setOccurredAt(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              {occurredAt 
                ? "Quando o fato aconteceu" 
                : hasAttemptedSubmit 
                  ? "⚠️ Campo obrigatório - selecione quando o fato aconteceu"
                  : "Selecione quando o fato aconteceu"}
            </p>
          </div>
          
          <div className="space-y-2">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 sm:p-8 text-center transition-colors cursor-pointer",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/40",
                isProcessingFile && "opacity-50 pointer-events-none"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {isProcessingFile ? (
                <>
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Lendo arquivo...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Arraste sua transcrição (PDF, Word, TXT, Markdown ou Imagem) ou cole abaixo
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
             <Label htmlFor="title">Título (opcional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Será gerado automaticamente se deixar vazio"
              maxLength={60}
              disabled={loading}
            />
            {title && (
              <p className="text-xs text-muted-foreground">
                {title.length}/60 caracteres
              </p>
            )}
          </div>

          {/* Smart Tags - Seletor Interativo */}
          <div className="space-y-2">
            <Label>Tags de Classificação</Label>
            
            {/* Tags selecionadas */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className={cn("text-sm py-1 px-3 border gap-2", getTagColor(tag))}
                  >
                    {getTagEmoji(tag)} {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:bg-accent rounded-sm p-0.5 transition-colors"
                      aria-label={`Remover tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Seletor de tags pré-definidas */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-muted-foreground"
                  disabled={loading}
                >
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                  Adicionar tag
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar ou criar tag..." />
                  <CommandList>
                    <CommandEmpty>
                      <button
                        type="button"
                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const input = e.currentTarget.closest('[cmdk-root]')?.querySelector<HTMLInputElement>('[cmdk-input]');
                          const value = input?.value?.trim();
                          if (value && !tags.includes(value)) {
                            setTags(prev => [...prev, value]);
                            if (input) input.value = '';
                          }
                        }}
                      >
                        Criar tag personalizada
                      </button>
                    </CommandEmpty>
                    <CommandGroup>
                      {VALID_TAGS.filter(t => !tags.includes(t)).map((tag) => (
                        <CommandItem
                          key={tag}
                          value={tag}
                          onSelect={() => {
                            setTags(prev => [...prev, tag]);
                          }}
                        >
                          <span className="mr-2">{getTagEmoji(tag)}</span>
                          {tag}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {tags.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Selecione tags ou deixe vazio para classificação automática por IA
              </p>
            )}
          </div>

          <div 
            className="space-y-2"
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (text && !occurredAt) {
                tryExtractDate(text);
              }
            }}
          >
            <Label htmlFor="content">Conteúdo</Label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="O conteúdo do arquivo aparecerá aqui. Você também pode digitar ou editar manualmente..."
              disabled={loading || isProcessingFile}
              minHeight="150px"
              editorRef={editorRef}
              biasMatches={biasDismissCount < 3 ? biasMatches : undefined}
            />
            {biasDismissCount < 3 && biasMatches.length > 0 && (
              <BiasSuggestionsPanel
                matches={biasMatches}
                onApply={handleApplyBiasSuggestion}
                onApplyAll={handleApplyAllBiasSuggestions}
                onDismiss={() => setBiasDismissCount(prev => prev + 1)}
              />
            )}
            <div className="flex justify-end">
              <VoiceInput 
                onTranscription={(text) => {
                  if (editorRef.current) {
                    editorRef.current.chain().focus().insertContent(text).run();
                  } else {
                    setContent(prev => prev + (prev ? '\n' : '') + text);
                  }
                }}
                disabled={loading || isProcessingFile}
              />
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-background flex-col sm:flex-row gap-4">
          {/* Visibility control */}
          <div className="mr-auto space-y-2">
            {selectedMemberId ? (
              /* Single member mode: original switch */
              <div className="flex items-center gap-3">
                <Switch
                  id="share-toggle"
                  checked={isShared}
                  onCheckedChange={setIsShared}
                  disabled={loading}
                />
                <Label htmlFor="share-toggle" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span>Compartilhar com {memberName || 'colaborador'}?</span>
                </Label>
              </div>
            ) : selectedMemberIds.length === 1 ? (
              /* Dashboard with 1 member: simple switch */
              <div className="flex items-center gap-3">
                <Switch
                  id="share-toggle-single"
                  checked={sharedMemberIds.includes(selectedMemberIds[0])}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSharedMemberIds([selectedMemberIds[0]]);
                    } else {
                      setSharedMemberIds([]);
                    }
                  }}
                  disabled={loading}
                />
                <Label htmlFor="share-toggle-single" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span>Compartilhar com {getMemberName(selectedMemberIds[0])}?</span>
                </Label>
              </div>
            ) : selectedMemberIds.length > 1 ? (
              /* Dashboard with multiple members: checkboxes */
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-sm">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  Compartilhar com quais liderados?
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedMemberIds.map(id => (
                    <label key={id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox
                        checked={sharedMemberIds.includes(id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSharedMemberIds(prev => [...prev, id]);
                          } else {
                            setSharedMemberIds(prev => prev.filter(m => m !== id));
                          }
                        }}
                        disabled={loading}
                      />
                      {getMemberName(id)}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || isProcessingFile || !occurredAt || effectiveMemberIds.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
