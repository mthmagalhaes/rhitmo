// Sprint 10.2 — SelfReviewWizard
// Modal conversacional para o liderado preencher sua auto-avaliação.
// Faz INSERT em performance_reviews com review_type='self' + author_user_id=auth.uid().
// O trigger ctx_evidence_from_review (Sprint 10.1) propaga automaticamente para o Context Graph.
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { SELF_REVIEW_QUESTIONS } from '@/lib/selfReviewQuestions';

interface SelfReviewWizardProps {
  open: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  authorUserId: string;
}

type Message =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string };

export function SelfReviewWizard({
  open,
  onClose,
  memberId,
  memberName,
  authorUserId,
}: SelfReviewWizardProps) {
  const queryClient = useQueryClient();
  const total = SELF_REVIEW_QUESTIONS.length;

  const [messages, setMessages] = useState<Message[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset on open.
  useEffect(() => {
    if (open) {
      setMessages([
        { role: 'system', content: 'Olá! Esta é a sua auto-avaliação. Vou te guiar com algumas perguntas. Suas respostas serão compartilhadas com o seu líder ao final.' },
        { role: 'system', content: SELF_REVIEW_QUESTIONS[0].question },
      ]);
      setResponses({});
      setCurrentStep(0);
      setInputValue('');
      setReviewMode(false);
      setSubmitting(false);
    }
  }, [open]);

  // Auto-scroll.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, reviewMode]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || submitting) return;

    const q = SELF_REVIEW_QUESTIONS[currentStep];
    const newResponses = { ...responses, [q.id]: trimmed };
    setResponses(newResponses);

    const next = currentStep + 1;
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: trimmed },
    ];

    if (next < total) {
      newMessages.push({ role: 'system', content: SELF_REVIEW_QUESTIONS[next].question });
      setCurrentStep(next);
    } else {
      newMessages.push({
        role: 'system',
        content: 'Tudo pronto. Revise abaixo e envie quando estiver confortável. Você poderá baixar uma cópia depois.',
      });
      setReviewMode(true);
    }

    setMessages(newMessages);
    setInputValue('');
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const buildMarkdown = (): string => {
    const lines: string[] = ['# Auto-avaliação', ''];
    for (const q of SELF_REVIEW_QUESTIONS) {
      lines.push(`## ${q.question}`);
      lines.push('');
      lines.push(responses[q.id] ?? '_Sem resposta_');
      lines.push('');
    }
    return lines.join('\n').trim();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const dateLabel = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      const safeName = (memberName || 'Você').trim();
      const title = `Auto-avaliação de ${safeName} — ${dateLabel}`;
      const content = buildMarkdown();

      const { error } = await supabase.from('performance_reviews').insert({
        member_id: memberId,
        review_type: 'self',
        author_user_id: authorUserId,
        title,
        content,
        shared_with_member: true,
        period_type: 'manual',
      });

      if (error) {
        console.error('[SelfReviewWizard] insert', error);
        toast.error('Não conseguimos enviar sua auto-avaliação', { description: error.message });
        return;
      }

      toast.success('Auto-avaliação enviada', {
        description: 'Seu líder verá no feed de Contexto.',
      });
      queryClient.invalidateQueries({ queryKey: ['my-self-reviews', memberId] });
      queryClient.invalidateQueries({ queryKey: ['shared-reviews', memberId] });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const progress = reviewMode ? 100 : Math.round((currentStep / total) * 100);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="rounded-2xl max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle className="font-serif flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Auto-avaliação
          </DialogTitle>
          <DialogDescription>
            Conte sua versão da história. {reviewMode ? 'Revise e envie.' : `Pergunta ${Math.min(currentStep + 1, total)} de ${total}.`}
          </DialogDescription>
          <Progress value={progress} className="h-1.5 mt-3" />
        </DialogHeader>

        <div
          ref={scrollRef}
          className="h-[420px] overflow-y-auto px-6 py-5"
        >
          <div className="space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex',
                  m.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-[0_2px_12px_rgba(0,0,0,0.04)]',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {reviewMode && (
              <Card className="mt-4 p-5 rounded-2xl border-0 bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Prévia da sua auto-avaliação
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{buildMarkdown()}</ReactMarkdown>
                </div>
              </Card>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border/60 bg-muted/20">
          {reviewMode ? (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Gerar e enviar auto-avaliação
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={SELF_REVIEW_QUESTIONS[currentStep]?.placeholder ?? 'Sua resposta...'}
                  rows={2}
                  className="rounded-xl resize-none flex-1"
                  disabled={submitting}
                  autoFocus
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || submitting}
                  size="icon"
                  className="rounded-xl h-10 w-10 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {/* Sprint 10.5 — saída suave mid-flow (sem perder a sessão por engano) */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (Object.keys(responses).length > 0) {
                      toast('Sair sem enviar?', {
                        description: 'Suas respostas serão descartadas.',
                        action: { label: 'Sair', onClick: onClose },
                      });
                    } else {
                      onClose();
                    }
                  }}
                  disabled={submitting}
                  className="text-xs text-muted-foreground"
                >
                  Sair
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
