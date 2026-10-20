// Exclusão de avaliação formal em rascunho. Só rascunhos (não compartilhados nem
// confirmados); o banco também bloqueia via política restritiva.
import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  reviewId: string;
  variant?: 'button' | 'icon';
  className?: string;
  onDeleted?: () => void;
}

export function DeleteDraftReviewButton({ reviewId, variant = 'button', className, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const handleDelete = async () => {
    setPending(true);
    const { data, error } = await supabase
      .from('performance_reviews')
      .delete()
      .eq('id', reviewId)
      .eq('shared_with_member', false)
      .is('acknowledged_at', null)
      .select('id');
    setPending(false);
    if (error || !data || data.length === 0) {
      toast({
        title: 'Não foi possível excluir',
        description: 'Só rascunhos que ainda não foram compartilhados podem ser excluídos.',
        variant: 'destructive',
      });
      return;
    }
    setOpen(false);
    toast({ title: 'Rascunho excluído' });
    qc.invalidateQueries({ queryKey: ['performance-reviews'] });
    qc.invalidateQueries({ queryKey: ['team-performance-reviews'] });
    qc.removeQueries({ queryKey: ['formal-review', reviewId] });
    onDeleted?.();
  };

  return (
    <>
      {variant === 'icon' ? (
        <span
          role="button"
          tabIndex={0}
          aria-label="Excluir rascunho"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setOpen(true); } }}
          className={cn('p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors', className)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </span>
      ) : (
        <Button
          variant="ghost"
          className={cn('text-destructive/80 hover:text-destructive hover:bg-destructive/10 gap-1.5', className)}
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4" /> Excluir rascunho
        </Button>
      )}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este rascunho?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O liderado nunca viu este rascunho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
