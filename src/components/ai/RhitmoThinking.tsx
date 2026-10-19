// Estado executivo "Rhitmo está pensando": etapas que avançam com o tempo,
// aviso de que é possível sair da tela e erro transparente com "Tentar novamente".
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  steps: string[];
  /** ms por etapa (a última fica ativa até terminar). */
  stepMs?: number;
  title?: string;
  hint?: string | null;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function RhitmoThinking({
  steps,
  stepMs = 3500,
  title = 'A Rhitmo está trabalhando nisso',
  hint = 'Pode sair desta tela, a Rhitmo continua trabalhando e avisa quando terminar.',
  error,
  onRetry,
  className,
  compact,
}: Props) {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (error) return;
    setIdx(0);
    const t = setInterval(() => setIdx((i) => Math.min(i + 1, steps.length - 1)), stepMs);
    return () => clearInterval(t);
  }, [steps.length, stepMs, error]);

  if (error) {
    return (
      <div role="alert" className={cn('rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-3', className)}>
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Não deu certo desta vez</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" className="rounded-xl" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className={cn('rounded-2xl bg-muted/40 p-4', compact ? 'space-y-2' : 'space-y-3', className)}>
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          {!reduce && <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-ping" />}
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
        <p className="text-sm font-semibold tracking-tight">{title}</p>
      </div>
      <ul className="space-y-1.5 pl-1">
        {steps.slice(0, idx + 1).map((s, i) => {
          const done = i < idx;
          return (
            <AnimatePresence key={s} initial={!reduce}>
              <motion.li
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.3 }}
                className={cn('flex items-center gap-2 text-sm', done ? 'text-muted-foreground' : 'text-foreground')}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <span className="h-3.5 w-3.5 flex items-center justify-center">
                    <span className={cn('h-1.5 w-1.5 rounded-full bg-primary', !reduce && 'animate-pulse')} />
                  </span>
                )}
                <span className={cn(!done && !reduce && 'animate-pulse')}>{s}</span>
              </motion.li>
            </AnimatePresence>
          );
        })}
      </ul>
      {hint && !compact && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
