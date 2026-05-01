// Sprint 12.3 — Captura rápida sempre visível para o Diário de Bordo.
// Persiste em `feedbacks` com visibility='private_leader' e tag 'diario-bordo'.
// Sem modal: textarea inline + botão Salvar. Cmd/Ctrl+Enter envia.
import { useState } from 'react';
import { Loader2, PenSquare } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface QuickPrivateNoteInputProps {
  memberId: string;
  memberName: string;
}

export function QuickPrivateNoteInput({ memberId, memberName }: QuickPrivateNoteInputProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const text = content.trim();
    if (!text) return;
    if (!user) {
      toast({
        title: 'Sessão expirada',
        description: 'Recarregue a página e tente novamente.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('feedbacks').insert([{
        manager_id: user.id,
        member_id: memberId,
        title: 'Anotação do diário',
        content: text,
        tags: ['diario-bordo'],
        visibility: 'private_leader',
        type: 'neutral',
        source: 'manual',
        occurred_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['feedbacks', memberId] });
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar',
        description: e.message ?? 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  const firstName = memberName.split(' ')[0];

  return (
    <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-4 border-border bg-card">
      <header className="flex items-center gap-2 mb-3">
        <PenSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-serif text-sm font-bold tracking-tight">
          Captura rápida
        </h3>
      </header>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          }
        }}
        placeholder={`Anotação privada sobre ${firstName}…`}
        className="rounded-xl bg-background min-h-[100px] resize-y"
      />
      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-muted-foreground/70 hidden sm:inline">
          ⌘ + Enter para salvar
        </span>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!content.trim() || saving}
          className="rounded-xl gap-2 ml-auto"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Salvar nota
        </Button>
      </div>
    </Card>
  );
}
