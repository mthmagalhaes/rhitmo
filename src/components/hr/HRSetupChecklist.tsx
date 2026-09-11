import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, X, UserPlus, Slack, ShieldCheck, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSlackConnection } from '@/hooks/useSlackConnection';
import { cn } from '@/lib/utils';

interface Props {
  workspaceId: string | null;
  leaderCount: number;
}

interface Item {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  pending: string;
  done: string;
  isDone: boolean;
  action: () => void;
  actionLabel: string;
}

const VISITED_KEY = 'rhitmo:hr:visited-ritmo';

/**
 * Primeiros passos do RH — espelho do AccountSetupBento do líder.
 * Some sozinho quando tudo estiver feito, e pode ser dispensado.
 */
export function HRSetupChecklist({ workspaceId, leaderCount }: Props) {
  const navigate = useNavigate();
  const slack = useSlackConnection();
  const [dismissed, setDismissed] = useState(false);
  const [visitedRitmo, setVisitedRitmo] = useState(false);

  const dismissKey = workspaceId ? `rhitmo:hr:setup-dismissed:${workspaceId}` : null;

  useEffect(() => {
    if (dismissKey) setDismissed(localStorage.getItem(dismissKey) === '1');
    setVisitedRitmo(localStorage.getItem(VISITED_KEY) === '1');
  }, [dismissKey]);

  const { data: retentionSet } = useQuery({
    queryKey: ['hr-retention-set', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return false;
      const { data } = await supabase
        .from('workspaces')
        .select('transcript_retention_days')
        .eq('id', workspaceId)
        .maybeSingle();
      return (data?.transcript_retention_days ?? null) !== null;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  const items: Item[] = useMemo(
    () => [
      {
        id: 'leaders',
        icon: UserPlus,
        title: 'Convide seus líderes',
        pending: 'A Rhitmo ganha vida quando os líderes registram as conversas. Comece por 3 a 5 deles.',
        done: `${leaderCount} líder${leaderCount > 1 ? 'es' : ''} na empresa.`,
        isDone: leaderCount > 0,
        action: () => navigate('/hr/pessoas'),
        actionLabel: 'Convidar',
      },
      {
        id: 'slack',
        icon: Slack,
        title: 'Ligar o Slack',
        pending: 'Lembretes e pautas chegam onde a liderança já trabalha.',
        done: 'Slack conectado.',
        isDone: !!slack.isConnected,
        action: () => navigate('/lider/configuracoes?tab=integracoes'),
        actionLabel: 'Conectar',
      },
      {
        id: 'retention',
        icon: ShieldCheck,
        title: 'Definir o prazo de guarda',
        pending: 'Por quanto tempo guardamos transcrições. É a primeira pergunta da área de segurança.',
        done: 'Prazo de guarda definido.',
        isDone: !!retentionSet,
        action: () => navigate('/hr/governanca'),
        actionLabel: 'Definir',
      },
      {
        id: 'ritmo',
        icon: Activity,
        title: 'Conhecer a Visão BP',
        pending: 'Cadência de 1:1s por líder, sem ver o conteúdo das conversas.',
        done: 'Você já conhece a Visão BP.',
        isDone: visitedRitmo,
        action: () => {
          localStorage.setItem(VISITED_KEY, '1');
          navigate('/hr/ritmo');
        },
        actionLabel: 'Ver',
      },
    ],
    [leaderCount, slack.isConnected, retentionSet, visitedRitmo, navigate],
  );

  const allDone = items.every((i) => i.isDone);
  if (dismissed || allDone) return null;

  const handleDismiss = () => {
    if (dismissKey) localStorage.setItem(dismissKey, '1');
    setDismissed(true);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Primeiros passos
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <X className="h-3 w-3" />
          Dispensar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={cn(
                'group relative flex flex-col rounded-2xl border border-border/50 bg-card p-5',
                'shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-all',
                'hover:-translate-y-0.5 hover:shadow-[0_4px_28px_rgba(0,0,0,0.06)]',
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={cn(
                    'h-9 w-9 rounded-xl flex items-center justify-center',
                    item.isDone
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-primary/10 text-primary',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {item.isDone && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Feito
                  </span>
                )}
              </div>

              <h3 className="text-sm font-semibold tracking-tight text-foreground mb-1.5">
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3 flex-1">
                {item.isDone ? item.done : item.pending}
              </p>

              {!item.isDone && (
                <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={item.action}>
                  {item.actionLabel}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
