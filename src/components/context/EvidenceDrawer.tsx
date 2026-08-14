// Sprint 8.2 — Singleton drawer that opens whenever a CitationChip is clicked anywhere
// in the app. Mounted once globally in App.tsx, listens for the `rhitmo:open-evidence` event.
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { OPEN_EVIDENCE_EVENT, type OpenEvidenceDetail } from './CitationChip';
import { useEvidenceById } from '@/hooks/useEvidenceById';
import { getSourceMeta } from './sourceMeta';

export function EvidenceDrawer() {
  const [open, setOpen] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenEvidenceDetail>).detail;
      if (!detail?.docId) return;
      setDocId(detail.docId);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVIDENCE_EVENT, handler as EventListener);
    return () => window.removeEventListener(OPEN_EVIDENCE_EVENT, handler as EventListener);
  }, []);

  const { data, isLoading, isError } = useEvidenceById(open ? docId : null);
  const evidence = data?.evidence ?? null;
  const fullContent = data?.fullContent ?? null;
  const meta = getSourceMeta(evidence?.source_table);
  const Icon = meta.icon;

  const formattedDate = evidence
    ? (() => {
        try {
          return format(new Date(evidence.occurred_at), "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
        } catch {
          return evidence.occurred_at;
        }
      })()
    : null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 gap-0 flex flex-col overflow-hidden"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60 space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.badgeClass}`}
            >
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
            {evidence?.visibility === 'private_leader' && (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Privado · líder
              </span>
            )}
          </div>
          <SheetTitle className="text-base font-semibold tracking-tight text-foreground text-left">
            {evidence?.title ?? (isLoading ? 'Carregando evidência...' : 'Evidência original')}
          </SheetTitle>
          {formattedDate && (
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}

          {!isLoading && (isError || !evidence) && (
            <div className="flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground/80">Evidência não disponível</p>
              <p className="text-xs mt-1 max-w-xs">
                A referência citada pela IA pode ter sido removida ou você não tem permissão para visualizá-la.
              </p>
            </div>
          )}

          {!isLoading && evidence && (
            <div className="space-y-4">
              {fullContent ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-normal">
                  {fullContent}
                </div>
              ) : evidence.summary ? (
                <>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Resumo
                  </p>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {evidence.summary}
                  </div>
                  <p className="text-xs text-muted-foreground italic pt-2 border-t border-border/40">
                    Conteúdo completo indisponível neste contexto.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Sem conteúdo textual nesta evidência.
                </p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
