import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subMonths, startOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, CheckCircle2, RefreshCw, Calendar, AlertTriangle } from 'lucide-react';
import { getDateLocale } from '@/lib/dateLocale';
import {
  useMonthlyRecaps,
  useGenerateMonthlyRecap,
  useUpdateMonthlyRecap,
  useConfirmMonthlyRecap,
  type MonthlyRecap,
} from '@/hooks/useRecaps';

interface Props {
  memberId: string;
}

function buildLast6Months(): string[] {
  const out: string[] = [];
  const base = subMonths(startOfMonth(new Date()), 1);
  for (let i = 0; i < 6; i++) {
    const d = subMonths(base, i);
    out.push(format(d, 'yyyy-MM-01'));
  }
  return out;
}

function RecapCard({
  memberId,
  periodMonth,
  recap,
}: {
  memberId: string;
  periodMonth: string;
  recap: MonthlyRecap | undefined;
}) {
  const { t, i18n } = useTranslation('rhitmo');
  const generate = useGenerateMonthlyRecap(memberId);
  const update = useUpdateMonthlyRecap(memberId);
  const confirm = useConfirmMonthlyRecap(memberId);

  const [highlight, setHighlight] = useState(recap?.highlight_text ?? '');
  const [concern, setConcern] = useState(recap?.concern_text ?? '');
  const [pattern, setPattern] = useState(recap?.dominant_pattern ?? '');

  const isConfirmed = recap?.status === 'confirmed';
  const isDraft = recap?.status === 'draft';
  const isEmpty = !recap;

  const monthStr = useMemo(
    () => format(new Date(periodMonth + 'T00:00:00Z'), 'MMMM yyyy', { locale: getDateLocale(i18n.language) }),
    [periodMonth, i18n.language]
  );

  useMemo(() => {
    if (recap) {
      setHighlight(recap.highlight_text ?? '');
      setConcern(recap.concern_text ?? '');
      setPattern(recap.dominant_pattern ?? '');
    }
  }, [recap?.id, recap?.ai_generated_at]);

  return (
    <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{t('recap.monthly.cardTitle', { month: monthStr })}</span>
          </CardTitle>
          {isConfirmed && (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t('recap.monthly.confirmedBadge', { date: recap.confirmed_at ? format(new Date(recap.confirmed_at), 'dd/MM') : '' })}
            </Badge>
          )}
          {isDraft && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
              {t('recap.monthly.draftBadge')}
            </Badge>
          )}
        </div>
        {recap && (
          <p className="text-xs text-muted-foreground mt-1">
            {t('recap.monthly.basedOn', { feedbacks: recap.feedbacks_count, meetings: recap.meetings_count })}
          </p>
        )}
        {recap?.low_evidence && !isConfirmed && (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>
              {t('recap.monthly.lowEvidenceWarning', { count: (recap.feedbacks_count ?? 0) + (recap.meetings_count ?? 0) })}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isEmpty && (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">{t('recap.monthly.noRecapForMonth', { month: monthStr })}</p>
            <Button
              onClick={() => generate.mutate({ periodMonth })}
              disabled={generate.isPending}
              size="sm"
              className="rounded-xl"
            >
              {generate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('recap.monthly.generating')}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t('recap.monthly.generateButton')}
                </>
              )}
            </Button>
          </div>
        )}

        {recap && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('recap.monthly.labels.highlight')}
              </label>
              {isConfirmed ? (
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {highlight || <span className="italic text-muted-foreground">{t('recap.monthly.emptyHighlight')}</span>}
                </p>
              ) : (
                <Textarea
                  value={highlight}
                  onChange={(e) => setHighlight(e.target.value)}
                  placeholder={t('recap.monthly.placeholders.highlight')}
                  className="rounded-xl min-h-[68px] text-sm"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('recap.monthly.labels.concern')}
              </label>
              {isConfirmed ? (
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {concern || <span className="italic text-muted-foreground">{t('recap.monthly.emptyConcern')}</span>}
                </p>
              ) : (
                <Textarea
                  value={concern}
                  onChange={(e) => setConcern(e.target.value)}
                  placeholder={t('recap.monthly.placeholders.concern')}
                  className="rounded-xl min-h-[68px] text-sm"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('recap.monthly.labels.pattern')}
              </label>
              {isConfirmed ? (
                <p className="text-sm font-medium text-foreground/90 leading-relaxed">
                  {pattern || <span className="italic text-muted-foreground">{t('recap.monthly.emptyPattern')}</span>}
                </p>
              ) : (
                <Textarea
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder={t('recap.monthly.placeholders.pattern')}
                  className="rounded-xl min-h-[52px] text-sm"
                />
              )}
            </div>

            {!isConfirmed && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  className="rounded-xl"
                  onClick={() =>
                    confirm.mutate({
                      id: recap.id,
                      patch: {
                        highlight_text: highlight,
                        concern_text: concern,
                        dominant_pattern: pattern,
                      },
                    })
                  }
                  disabled={confirm.isPending}
                >
                  {confirm.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  {t('recap.monthly.confirm')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() =>
                    update.mutate({
                      id: recap.id,
                      patch: {
                        highlight_text: highlight,
                        concern_text: concern,
                        dominant_pattern: pattern,
                      },
                    })
                  }
                  disabled={update.isPending}
                >
                  {t('recap.monthly.saveDraft')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => generate.mutate({ periodMonth, regenerate: true })}
                  disabled={generate.isPending}
                >
                  {generate.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {t('recap.monthly.regenerate')}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function MonthlyRecapSection({ memberId }: Props) {
  const { t } = useTranslation('rhitmo');
  const { data: recaps = [], isLoading } = useMonthlyRecaps(memberId, 6);
  const months = buildLast6Months();
  const recapByMonth = useMemo(() => {
    const m = new Map<string, MonthlyRecap>();
    for (const r of recaps) m.set(r.period_month.slice(0, 10), r);
    return m;
  }, [recaps]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        {t('recap.monthly.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{t('recap.monthly.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('recap.monthly.subtitle')}</p>
      </div>
      <div className="grid gap-4">
        {months.map((m) => (
          <RecapCard key={m} memberId={memberId} periodMonth={m} recap={recapByMonth.get(m)} />
        ))}
      </div>
    </div>
  );
}
