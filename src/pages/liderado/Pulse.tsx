// Sprint 13.x — Página /liderado/pulse: lista pulses pendentes + histórico do liderado.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLinkedMember } from '@/hooks/useLinkedMember';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AnswerPulseModal } from '@/components/pulse/AnswerPulseModal';
import { usePendingPulseSurveys, type PendingPulseSurvey } from '@/hooks/usePendingPulseSurveys';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LideradoPulse() {
  const { linkedMember, isLoading: loadingMember } = useLinkedMember();
  const memberId = linkedMember?.id ?? null;

  const { data: pending = [], isLoading: loadingPending } = usePendingPulseSurveys(memberId);
  const [openSurvey, setOpenSurvey] = useState<PendingPulseSurvey | null>(null);

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['liderado-pulse-history', memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pulse_surveys')
        .select('id, name, type, status, completed_at, sent_at')
        .eq('member_id', memberId!)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20);
      if (error) {
        console.error('[LideradoPulse.history]', error);
        return [];
      }
      return data ?? [];
    },
  });

  const isLoading = loadingMember || loadingPending || loadingHistory;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-2">
          <Sparkles className="h-3 w-3" />
          Pulse
        </div>
        <h1 className="text-3xl font-serif tracking-tight">Suas Pesquisas Pulse</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Pulses são perguntas rápidas do seu líder. A forma mais prática de responder é direto pelo Slack quando a Rhitmo te chamar.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-sm font-medium mb-3">
              <Clock className="h-4 w-4 text-amber-500" />
              Pendentes
              <Badge variant="secondary" className="rounded-full">{pending.length}</Badge>
            </h2>
            {pending.length === 0 ? (
              <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
                Tudo em dia. Nenhum Pulse pendente.
              </div>
            ) : (
              <div className="rounded-2xl border bg-card divide-y">
                {pending.map((p) => (
                  <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Pulse com {p.questions.length} {p.questions.length === 1 ? 'pergunta' : 'perguntas'}</p>
                      <p className="text-xs text-muted-foreground">
                        Recebido há {formatDistanceToNow(new Date(p.sent_at), { locale: ptBR })}
                      </p>
                    </div>
                    <Button onClick={() => setOpenSurvey(p)} className="rounded-xl">Responder</Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-sm font-medium mb-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Histórico
              <Badge variant="secondary" className="rounded-full">{history.length}</Badge>
            </h2>
            {history.length === 0 ? (
              <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
                Você ainda não respondeu nenhum Pulse.
              </div>
            ) : (
              <div className="rounded-2xl border bg-card divide-y">
                {history.map((h) => (
                  <div key={h.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{h.name ?? 'Pulse'}</p>
                      <p className="text-xs text-muted-foreground">
                        Respondido {h.completed_at ? `há ${formatDistanceToNow(new Date(h.completed_at), { locale: ptBR })}` : ''}
                      </p>
                    </div>
                    <Badge variant="secondary" className="rounded-full">Respondido</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <AnswerPulseModal survey={openSurvey} onClose={() => setOpenSurvey(null)} />
    </div>
  );
}
