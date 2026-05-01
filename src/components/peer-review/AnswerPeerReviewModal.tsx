// Sprint 10.3 — Modal do par para responder uma peer review pendente.
// UPDATE em review_peers (status='completed' + response_jsonb). Trigger
// review_peers_restrict_peer_update (Sprint 10.1) garante integridade.
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { PEER_REVIEW_QUESTIONS } from '@/lib/peerReviewQuestions';
import type { PendingPeerReview } from '@/hooks/usePendingPeerReviews';

interface AnswerPeerReviewModalProps {
  invite: PendingPeerReview | null;
  onClose: () => void;
}

export function AnswerPeerReviewModal({ invite, onClose }: AnswerPeerReviewModalProps) {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const open = !!invite;

  useEffect(() => {
    if (invite) setAnswers({});
  }, [invite?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!invite) return;

    const allAnswered = PEER_REVIEW_QUESTIONS.every(
      (q) => (answers[q.id] ?? '').trim().length > 0,
    );
    if (!allAnswered) {
      toast.error('Por favor, responda todas as perguntas.');
      return;
    }

    setSubmitting(true);
    try {
      const responsePayload = {
        questions: PEER_REVIEW_QUESTIONS.map((q) => ({
          id: q.id,
          question: q.question,
          answer: (answers[q.id] ?? '').trim(),
        })),
        submitted_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('review_peers')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          response_jsonb: responsePayload as unknown as never,
        })
        .eq('id', invite.id);

      if (error) {
        console.error('[AnswerPeerReviewModal] update', error);
        toast.error('Não conseguimos enviar sua avaliação', {
          description: error.message,
        });
        return;
      }

      toast.success('Avaliação enviada', {
        description: 'Obrigado por contribuir com a evolução do seu colega.',
      });
      queryClient.invalidateQueries({ queryKey: ['pending-peer-reviews'] });
      // Sprint 10.5 — peer responses propagam para context_evidence (Sprint 10.1 trigger),
      // o líder precisa ver o novo evidence no /lider/contexto sem F5.
      queryClient.invalidateQueries({ queryKey: ['team-timeline'] });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="rounded-2xl max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Avaliar {invite?.reviewed_member_name ?? 'colega'}
          </DialogTitle>
          <DialogDescription>
            Suas respostas serão consolidadas com as de outros pares pelo líder antes de qualquer
            compartilhamento. Seja específico e construtivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {PEER_REVIEW_QUESTIONS.map((q, idx) => (
            <div key={q.id} className="space-y-2">
              <Label className="text-sm leading-snug">
                <span className="text-muted-foreground mr-1.5">{idx + 1}.</span>
                {q.question}
              </Label>
              <Textarea
                value={answers[q.id] ?? ''}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                placeholder={q.placeholder ?? 'Sua resposta...'}
                rows={3}
                className="rounded-xl"
                disabled={submitting}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar avaliação'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
