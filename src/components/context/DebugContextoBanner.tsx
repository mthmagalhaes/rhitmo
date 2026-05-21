// Dev-only diagnostic banner para destravar /lider/contexto vazio.
// Chama RPC debug_context_access e mostra o que o banco realmente enxerga.
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  timelineError?: unknown;
  slackError?: unknown;
  rowsLength: number;
}

export function DebugContextoBanner({ timelineError, slackError, rowsLength }: Props) {
  const { workspaceId } = useAccount();
  const { id: effectiveUserId, isImpersonating } = useEffectiveUser();
  const [debug, setDebug] = useState<Record<string, unknown> | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('debug_context_access', {
        _workspace_id: workspaceId ?? null,
      });
      if (cancel) return;
      if (error) {
        console.error('[DebugContextoBanner] debug_context_access failed:', error);
        setDebug({ rpc_error: error.message });
      } else {
        // eslint-disable-next-line no-console
        console.log('[DebugContextoBanner] debug_context_access →', data);
        setDebug(data ?? null);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [workspaceId]);

  if (!import.meta.env.DEV) return null;

  const hasError = !!timelineError || !!slackError;
  const errMsg = (e: unknown) =>
    (e as { message?: string } | undefined)?.message ?? (e ? String(e) : null);

  return (
    <div
      className={`rounded-xl border text-xs font-mono ${
        hasError
          ? 'border-destructive/40 bg-destructive/5 text-destructive'
          : 'border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2"
      >
        <span className="flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" />
          DEBUG /lider/contexto — rows: {rowsLength}
          {hasError && ' · ERRO'}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div>
            <strong>Front:</strong> workspaceId={String(workspaceId)} ·
            effectiveUserId={String(effectiveUserId)} · impersonating={String(isImpersonating)}
          </div>
          {timelineError && (
            <div>
              <strong>useTeamTimeline error:</strong> {errMsg(timelineError)}
            </div>
          )}
          {slackError && (
            <div>
              <strong>useEvidence(slack) error:</strong> {errMsg(slackError)}
            </div>
          )}
          {debug && (
            <pre className="whitespace-pre-wrap break-all text-[10px] leading-relaxed bg-background/60 p-2 rounded">
              {JSON.stringify(debug, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
