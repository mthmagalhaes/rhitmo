import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, X, ChevronRight, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMirrorInsight, type MirrorInsight } from '@/hooks/useMirrorInsight';

export function MirrorInsightCard() {
  const { t } = useTranslation();
  const { insight, dismiss } = useMirrorInsight();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!insight) return null;

  const score = Math.round(insight.contradiction_score);
  const severity: 'info' | 'warning' | 'critical' =
    score >= 70 ? 'critical' : score >= 40 ? 'warning' : 'info';

  const severityClasses = {
    info: 'bg-primary/5 border-primary/20',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40',
    critical: 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40',
  };

  return (
    <>
      <div
        className={`rounded-3xl border ${severityClasses[severity]} p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_28px_rgba(0,0,0,0.06)]`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {t('mirror.cardTitle')}
                </p>
                <Badge variant="outline" className="text-[10px] rounded-md">
                  {t('mirror.scoreLabel', { score })}
                </Badge>
              </div>
              <p className="font-serif text-lg leading-snug text-foreground tracking-tight">
                {insight.summary}
              </p>
              {insight.recommended_action && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">{t('mirror.recommendation')}: </span>
                  {insight.recommended_action}
                </p>
              )}
              <div className="flex items-center gap-2 mt-4">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setSheetOpen(true)}
                  className="rounded-xl h-8 text-xs"
                >
                  {t('mirror.viewEvidence')}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => dismiss(insight.id)}
                  className="rounded-xl h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  {t('mirror.acknowledge')}
                </Button>
              </div>
            </div>
          </div>
          <button
            onClick={() => dismiss(insight.id)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label={t('mirror.acknowledge')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <MirrorEvidenceSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        insight={insight}
        onDismiss={() => {
          dismiss(insight.id);
          setSheetOpen(false);
        }}
      />
    </>
  );
}

function MirrorEvidenceSheet({
  open,
  onOpenChange,
  insight,
  onDismiss,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  insight: MirrorInsight;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const declared = (insight.declared_priorities as string[]) || [];
  const observed = (insight.observed_themes as string[]) || [];
  const evidence = insight.evidence || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="rounded-l-3xl sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="font-serif text-2xl tracking-tight">
            {t('mirror.sheetTitle')}
          </SheetTitle>
          <SheetDescription>{insight.summary}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {declared.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                {t('mirror.declared')}
              </p>
              <ul className="space-y-1.5">
                {declared.map((p, i) => (
                  <li key={i} className="text-sm text-foreground bg-muted/40 rounded-xl px-3 py-2">
                    {p}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {observed.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                {t('mirror.observed')}
              </p>
              <ul className="space-y-1.5">
                {observed.map((p, i) => (
                  <li key={i} className="text-sm text-foreground bg-muted/40 rounded-xl px-3 py-2">
                    {p}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {evidence.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                {t('mirror.evidence')}
              </p>
              <div className="space-y-2">
                {evidence.map((e, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-3 space-y-1.5"
                  >
                    <div className="flex items-start gap-2">
                      <Quote className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                      <p className="text-sm text-foreground italic leading-snug">"{e.quote}"</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground pl-5">
                      {e.date} • {e.transcript_id?.slice(0, 8)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {insight.recommended_action && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                {t('mirror.recommendation')}
              </p>
              <p className="text-sm text-foreground leading-relaxed bg-primary/5 rounded-xl px-3 py-2.5">
                {insight.recommended_action}
              </p>
            </section>
          )}

          <Button onClick={onDismiss} className="w-full rounded-xl">
            {t('mirror.acknowledge')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
