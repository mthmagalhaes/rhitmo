// Sprint 9.2 — Card de alerta no dashboard do liderado para Pulses pendentes.
import { useState } from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePendingPulseSurveys, type PendingPulseSurvey } from '@/hooks/usePendingPulseSurveys';
import { PULSE_TEMPLATES } from '@/lib/pulseTemplates';
import { AnswerPulseModal } from './AnswerPulseModal';

interface PendingPulseAlertProps {
  memberId: string;
}

export function PendingPulseAlert({ memberId }: PendingPulseAlertProps) {
  const { data: surveys } = usePendingPulseSurveys(memberId);
  const [activeSurvey, setActiveSurvey] = useState<PendingPulseSurvey | null>(null);

  if (!surveys || surveys.length === 0) return null;

  return (
    <>
      <Card className="p-5 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] bg-amber-50/60 dark:bg-amber-950/20 mb-6">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-amber-700 dark:text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {surveys.length === 1
                ? 'Você tem um Pulse aguardando resposta'
                : `Você tem ${surveys.length} Pulses aguardando resposta`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sua resposta ajuda seu líder a entender bloqueios, prioridades e contexto.
            </p>

            <div className="mt-3 space-y-2">
              {surveys.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSurvey(s)}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-background/80 hover:bg-background transition-colors px-3 py-2.5 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="secondary" className="rounded-full text-[10px]">
                      {PULSE_TEMPLATES[s.type]?.label ?? s.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">
                      {s.questions.length}{' '}
                      {s.questions.length === 1 ? 'pergunta' : 'perguntas'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 font-medium flex-shrink-0">
                    Responder
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <AnswerPulseModal survey={activeSurvey} onClose={() => setActiveSurvey(null)} />
    </>
  );
}
