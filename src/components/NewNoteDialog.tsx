import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PenSquare, Loader2 } from 'lucide-react';

interface NewNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMemberId?: string;
  memberName?: string;
  onSuccess?: () => void;
}

export const NewNoteDialog = ({ open, onOpenChange, selectedMemberId, memberName, onSuccess }: NewNoteDialogProps) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'positive' | 'constructive' | 'neutral'>('neutral');
  const [memberId, setMemberId] = useState(selectedMemberId || '');
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
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
          type
        }
      });

      if (error) throw error;

      toast({
        title: "Nota adicionada com sucesso!",
        description: "A análise por IA foi concluída."
      });

      setContent('');
      setType('neutral');
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
            <Label htmlFor="type">Tipo de Feedback</Label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positive">Positivo</SelectItem>
                <SelectItem value="constructive">Construtivo</SelectItem>
                <SelectItem value="neutral">Neutro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              placeholder="Cole a transcrição da reunião ou escreva o feedback aqui..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-none"
              disabled={loading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
