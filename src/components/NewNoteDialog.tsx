import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PenSquare, Loader2, Upload, CalendarIcon, X, Eye } from 'lucide-react';
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

// Smart Date Extraction - analisa as primeiras 20 linhas do texto
const extractDateFromText = (text: string): Date | null => {
  const lines = text.split('\n').slice(0, 20).join('\n');
  
  // Padrão Tactiq: "Meeting started: 15/01/2025" ou "Meeting started 15-01-2025"
  const tactiqMatch = lines.match(/Meeting\s+started:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i);
  if (tactiqMatch) {
    const [, day, month, year] = tactiqMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const date = new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime()) && date <= new Date()) return date;
  }
  
  // ISO Format: 2025-01-15
  const isoMatch = lines.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime()) && date <= new Date()) return date;
  }
  
  // BR Format: 15/01/2025
  const brMatch = lines.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime()) && date <= new Date()) return date;
  }
  
  // BR Format curto: 15/01/25
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
}

export const NewNoteDialog = ({ open, onOpenChange, selectedMemberId, memberName, onSuccess, workspaceId }: NewNoteDialogProps) => {
  const [content, setContent] = useState('');
  const [memberId, setMemberId] = useState(selectedMemberId || '');
  const [occurredAt, setOccurredAt] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isShared, setIsShared] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);
  const { toast } = useToast();

  // Função centralizada para limpar o formulário
  const resetForm = () => {
    setContent('');
    setMemberId('');
    setOccurredAt(undefined);
    setTags([]);
    setTitle('');
    setIsDragging(false);
    setIsProcessingFile(false);
    setIsShared(false);
    setHasAttemptedSubmit(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (editorRef.current) {
      editorRef.current.commands.clearContent();
    }
  };

  // Wrapper para limpar estado ao fechar o modal
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // Função para tentar extrair data do texto
  const tryExtractDate = (text: string) => {
    if (occurredAt) return; // Não sobrescrever se já tiver data
    
    const detectedDate = extractDateFromText(text);
    if (detectedDate) {
      setOccurredAt(detectedDate);
      toast({
        title: "📅 Data detectada",
        description: `Data de ${format(detectedDate, "dd/MM/yyyy")} encontrada no texto.`,
      });
    }
  };

  // Remover tag
  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  // Carregar membros quando o dialog abre - FILTRO por workspace
  React.useEffect(() => {
    if (open && !selectedMemberId && workspaceId) {
      loadTeamMembers();
    }
  }, [open, selectedMemberId, workspaceId]);

  const loadTeamMembers = async () => {
    if (!workspaceId) return;
    
    const { data } = await supabase
      .from('team_members')
      .select('id, name, teams!inner(workspace_id)')
      .eq('teams.workspace_id', workspaceId)
      .order('name');
    
    if (data) {
      setTeamMembers(data);
    }
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
      
      // Tentar extrair data automaticamente do texto
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

    const targetMemberId = selectedMemberId || memberId;
    if (!targetMemberId) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione um liderado.",
        variant: "destructive"
      });
      return;
    }

    // Validação extra de data obrigatória
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
       
       // =====================================
       // Classificação Automática (Zero Click)
       // =====================================
       let finalTags = tags;
       let finalTitle = title.trim();
       
       // Só classifica se: conteúdo > 20 chars E (tags vazias OU título vazio)
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
             // Aplicar tags se ainda não tiver
             if (tags.length === 0 && classifyData?.tags?.length > 0) {
               finalTags = classifyData.tags;
             }
             
             // Aplicar título se ainda não tiver
             if (!finalTitle && classifyData?.suggestedTitle) {
               finalTitle = classifyData.suggestedTitle;
             }
             
             console.log('[NewNoteDialog] Classification result:', { 
               tags: finalTags, 
               title: finalTitle 
             });
           }
         } catch (classifyErr) {
           console.warn('[NewNoteDialog] Classification error (non-blocking):', classifyErr);
           // Continua sem classificação - salvamento não deve falhar por isso
         }
       }
       // =====================================
       
       // INSERT com dados enriquecidos
      const { data: feedback, error: insertError } = await supabase
        .from('feedbacks')
        .insert({
          manager_id: user.id,
          member_id: targetMemberId,
          content: cleanedContent,
          type: 'neutral',
          occurred_at: occurredAt.toISOString(),
          tags: finalTags.length > 0 ? finalTags : [],
          title: finalTitle || null,
          visibility: isShared ? 'shared' : 'private_leader',
          summary: null,
          sentiment: null,
          coaching_tips: null,
          bias_alert: null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

       // Toast de sucesso (melhorado para mostrar classificação)
       const hasClassification = finalTags.length > 0 || finalTitle;
      toast({
         title: hasClassification ? "Anotação salva e classificada! ✨" : "Anotação salva! ✅",
         description: hasClassification 
           ? `${finalTitle || ''} ${finalTags.length ? `• ${finalTags.join(", ")}` : ''}`.trim()
           : "Registro adicionado ao histórico.",
      });
      
      resetForm();
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }

      // Fire-and-forget backup to Storage (Safety Net)
      supabase.functions.invoke('backup-data', {
        body: { 
          type: 'feedback', 
          data: feedback,
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
        
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4">
          {!selectedMemberId && (
            <div className="space-y-2">
              <Label htmlFor="member">Liderado</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger id="member">
                  <SelectValue placeholder="Selecione um liderado" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* DatePicker - Data do Ocorrido (obrigatório) */}
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
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
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

          {/* Campo de Título (opcional) */}
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

          {/* Smart Tags Section */}
          <div className="space-y-2">
            <Label>Tags de Classificação</Label>
            {tags.length > 0 ? (
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
            ) : (
              <p className="text-xs text-muted-foreground">
                 Tags serão geradas automaticamente ao salvar
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
              minHeight="200px"
              editorRef={editorRef}
            />
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
        
        {/* Sticky footer - always visible */}
        <DialogFooter className="px-6 py-4 border-t bg-background flex-col sm:flex-row gap-4">
          {/* Switch de compartilhamento */}
          <div className="flex items-center gap-3 mr-auto">
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
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading || isProcessingFile || !occurredAt}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
