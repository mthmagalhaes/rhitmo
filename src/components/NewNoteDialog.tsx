import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PenSquare, Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface NewNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMemberId?: string;
  memberName?: string;
  onSuccess?: () => void;
}

export const NewNoteDialog = ({ open, onOpenChange, selectedMemberId, memberName, onSuccess }: NewNoteDialogProps) => {
  const [content, setContent] = useState('');
  const [memberId, setMemberId] = useState(selectedMemberId || '');
  const [loading, setLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Carregar membros quando o dialog abre
  useState(() => {
    if (open && !selectedMemberId) {
      loadTeamMembers();
    }
  });

  const loadTeamMembers = async () => {
    const { data } = await supabase
      .from('team_members')
      .select('id, name')
      .order('name');
    
    if (data) {
      setTeamMembers(data);
    }
  };

  const extractTextFromTxt = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  };

  const extractTextFromDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'txt':
        return extractTextFromTxt(file);
      case 'pdf':
        return extractTextFromPdf(file);
      case 'docx':
        return extractTextFromDocx(file);
      default:
        throw new Error('Formato de arquivo não suportado');
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    const validExtensions = ['txt', 'pdf', 'docx'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (!extension || !validExtensions.includes(extension)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, envie apenas arquivos PDF, DOCX ou TXT.",
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
        description: error.message || "Não foi possível extrair o texto do arquivo.",
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

    if (!memberId && !selectedMemberId) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione um liderado.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Você precisa estar logado');
      }

      // Chamar edge function para criar e analisar o feedback
      const { data, error } = await supabase.functions.invoke('analyze-feedback', {
        body: {
          content: content.trim(),
          memberId: selectedMemberId || memberId,
          type: 'neutral'
        }
      });

      if (error) throw error;

      toast({
        title: "Nota adicionada com sucesso!",
        description: "A análise por IA foi concluída."
      });

      setContent('');
      setMemberId('');
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
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
                    Arraste sua transcrição (PDF, Word ou Texto) ou cole abaixo
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              placeholder="O conteúdo do arquivo aparecerá aqui. Você também pode digitar ou editar manualmente..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-none"
              disabled={loading || isProcessingFile}
            />
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
