// Sprint 9.2 — Modal do liderado para responder um Pulse pendente.
// O UPDATE para status='completed' dispara a trigger ctx_evidence_from_pulse_survey,
// que insere automaticamente em context_evidence (visível em /lider/contexto).
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
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
import { PULSE_TEMPLATES } from '@/lib/pulseTemplates';
import type { PendingPulseSurvey } from '@/hooks/usePendingPulseSurveys';

interface AnswerPulseModalProps {
  survey: PendingPulseSurvey | null;
  onClose: () => void;
}

export function AnswerPulseModal({ survey, onClose }: AnswerPulseModalProps) {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const open = !!survey;
  const template = survey ? PULSE_TEMPLATES[survey.type] : null;

  // Reset state every time a new survey is opened.
  useEffect(() => {
    if (survey) setAnswers({});
  }, [survey?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!survey) return;
    const allAnswered = survey.questions.every((q) => (answers[q.id] ?? '').trim().length > 0);
    if (!allAnswered) {
      toast.error('Por favor, responda todas as perguntas.');
      return;
    }

    setSubmitting(true);
    try {
      const responses = survey.questions.map((q) => ({
        question_id: q.id,
        question_text: q.text,
        answer: (answers[q.id] ?? '').trim(),
      }));

      const { error } = await supabase
        .from('pulse_surveys')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          responses: responses as unknown as never,
        })
        .eq('id', survey.id);

      if (error) {
        console.error('[AnswerPulseModal] update', error);
        toast.error('Não conseguimos salvar a resposta', { description: error.message });
        return;
      }

      toast.success('Resposta enviada', {
        description: 'Seu líder verá isso no feed de Contexto.',
      });
      queryClient.invalidateQueries({ queryKey: ['pending-pulse-surveys'] });
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
          <DialogTitle className="font-serif">
            {template ? `Pulse: ${template.label}` : 'Pulse'}
          </DialogTitle>
          {template && (
            <DialogDescription>{template.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-5 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {(survey?.questions ?? []).map((q, idx) => (
            <div key={q.id} className="space-y-2">
              <Label className="text-sm leading-snug">
                <span className="text-muted-foreground mr-1.5">{idx + 1}.</span>
                {q.text}
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
              'Enviar resposta'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
