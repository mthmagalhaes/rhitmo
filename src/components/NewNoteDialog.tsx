import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PenSquare, Loader2, Upload, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceInput } from './VoiceInput';
import { extractTextFromFile, isFileSupported } from '@/lib/fileParser';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useEditor } from '@tiptap/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  const [occurredAt, setOccurredAt] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);
  const { toast } = useToast();

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
      setContent(extractedText);
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

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Você precisa estar logado');
      }

      // STEP 1: Direct INSERT into Supabase (fast, ~50ms)
      const { data: feedback, error: insertError } = await supabase
        .from('feedbacks')
        .insert({
          manager_id: user.id,
          member_id: targetMemberId,
          content: content.trim(),
          type: 'neutral',
          occurred_at: occurredAt.toISOString(),
          // Analysis fields empty - will be filled by background function
          summary: null,
          sentiment: null,
          coaching_tips: null,
          bias_alert: null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // STEP 2: Close modal IMMEDIATELY and show toast
      toast({
        title: "Nota salva! ✅",
        description: "Processando análise inteligente...",
      });
      
      setContent('');
      setMemberId('');
      setOccurredAt(new Date());
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }

      // STEP 3: Fire-and-forget background analysis
      supabase.functions.invoke('analyze-feedback-background', {
        body: { feedbackId: feedback.id }
      }).catch(err => {
        console.error('Background analysis failed:', err);
        // Silent fail - note is already saved
      });

      // STEP 4: Fire-and-forget backup to Storage (Safety Net)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenSquare className="h-5 w-5" />
            Nova Nota
          </DialogTitle>
          <DialogDescription>
            {memberName 
              ? `Adicione uma nota de feedback para ${memberName}`
              : 'Cole ou digite a transcrição da reunião ou feedback'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
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

          {/* DatePicker - Data do Ocorrido */}
          <div className="space-y-2">
            <Label>Data registrada</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !occurredAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {occurredAt ? format(occurredAt, "PPP", { locale: ptBR }) : "Selecione a data"}
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
              Quando o fato aconteceu (padrão: hoje)
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

          <div className="space-y-2">
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || isProcessingFile}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Analisar e Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
