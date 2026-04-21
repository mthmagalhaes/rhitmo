import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, BarChart3, Calendar, Clock, Loader2 } from 'lucide-react';
import { format, addMonths, startOfMonth } from 'date-fns';
import { getDateLocale } from '@/lib/dateLocale';
import { useMonthlyRecaps, useQuarterlyRecaps } from '@/hooks/useRecaps';

interface Props {
  memberId: string;
  /** Optional: when provided, summary buttons switch the parent sub-tab instead of just scrolling. */
  onSwitchSection?: (section: 'quarterly' | 'monthly') => void;
}

function smoothScrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getCurrentQuarterStart(): string {
  const d = new Date();
  const qStartMonth = Math.floor(d.getUTCMonth() / 3) * 3;
  return format(new Date(Date.UTC(d.getUTCFullYear(), qStartMonth - 3, 1)), 'yyyy-MM-01');
}

export function RhitmoTabSummary({ memberId, onSwitchSection }: Props) {
  const { t, i18n } = useTranslation('rhitmo');
  const { data: monthly = [], isLoading: mLoading } = useMonthlyRecaps(memberId, 12);
  const { data: quarterly = [], isLoading: qLoading } = useQuarterlyRecaps(memberId, 4);

  const handleJump = (section: 'quarterly' | 'monthly') => {
    if (onSwitchSection) {
      onSwitchSection(section);
    } else {
      smoothScrollTo(section === 'quarterly' ? 'rhitmo-quarterly' : 'rhitmo-monthly');
    }
  };

  const currentMonthLabel = useMemo(
    () => format(new Date(), 'MMMM', { locale: getDateLocale(i18n.language) }),
    [i18n.language]
  );
  const closingDateLabel = useMemo(() => {
    const next = addMonths(startOfMonth(new Date()), 1);
    next.setDate(2);
    return format(next, 'dd/MM');
  }, []);

  if (mLoading || qLoading) {
    return (
      <Card className="rounded-2xl p-4 border-border/60 shadow-[0_2px_20px_rgba(0,0,0,0.04)] flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('summary.loading')}
      </Card>
    );
  }

  const draftMonthly = monthly.filter((m) => m.status === 'draft').length;
  const confirmedMonthly = monthly.filter((m) => m.status === 'confirmed').length;
  const draftQuarterly = quarterly.filter((q) => q.status === 'draft').length;
  const confirmedQuarterly = quarterly.filter((q) => q.status === 'confirmed').length;
  const lastQuarter = getCurrentQuarterStart();
  const hasLastQuarter = quarterly.some((q) => q.period_quarter.slice(0, 10) === lastQuarter);
  const hasConfirmedMonthlyInLastQuarter = monthly.some((m) => {
    if (m.status !== 'confirmed') return false;
    const ym = m.period_month.slice(0, 7);
    const [qy, qm] = lastQuarter.split('-').map((x) => parseInt(x, 10));
    const startMonth = qm;
    const months = [startMonth, startMonth + 1, startMonth + 2].map((x) => `${qy}-${String(x).padStart(2, '0')}`);
    return months.includes(ym);
  });
  const quarterlyReady = !hasLastQuarter && hasConfirmedMonthlyInLastQuarter;

  return (
    <Card className="rounded-2xl p-4 sm:p-5 border-border/60 shadow-[0_2px_20px_rgba(0,0,0,0.04)] bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Quarterly */}
        <button
          type="button"
          onClick={() => handleJump('quarterly')}
          className="text-left rounded-xl p-3 -m-1 hover:bg-foreground/[0.03] transition-colors flex flex-col gap-1.5"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('summary.quarterly')}
            </span>
          </div>
          <div className="text-lg font-bold tracking-tight">
            {confirmedQuarterly + draftQuarterly === 0
              ? t('summary.noQuarterlyYet')
              : t('summary.quarterlyCount', { count: confirmedQuarterly + draftQuarterly, confirmed: confirmedQuarterly })}
          </div>
          {quarterlyReady && (
            <Badge className="self-start bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">
              <ArrowDown className="h-3 w-3 mr-1" />
              {t('summary.quarterlyReady')}
            </Badge>
          )}
        </button>

        {/* Monthly */}
        <button
          type="button"
          onClick={() => handleJump('monthly')}
          className="text-left rounded-xl p-3 -m-1 hover:bg-foreground/[0.03] transition-colors flex flex-col gap-1.5"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('summary.monthly')}
            </span>
          </div>
          <div className="text-lg font-bold tracking-tight">
            {t('summary.monthlyCount', { count: monthly.length, confirmed: confirmedMonthly })}
          </div>
          {draftMonthly > 0 && (
            <Badge variant="outline" className="self-start border-amber-500/40 text-amber-700 dark:text-amber-400">
              {t('summary.monthlyDraftPending', { count: draftMonthly })}
            </Badge>
          )}
        </button>

        {/* Current month */}
        <div className="rounded-xl p-3 -m-1 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('summary.inProgress')}
            </span>
          </div>
          <div className="text-lg font-bold tracking-tight capitalize">{currentMonthLabel}</div>
          <p className="text-xs text-muted-foreground">
            {t('summary.autoCloseHint', { date: closingDateLabel })}
          </p>
        </div>
      </div>

      {quarterlyReady && (
        <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-foreground/80">{t('summary.quarterlyHint')}</p>
          <Button size="sm" variant="outline" className="rounded-xl gap-2" onClick={() => handleJump('quarterly')}>
            {t('summary.goToQuarterly')}
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </Card>
  );
}
