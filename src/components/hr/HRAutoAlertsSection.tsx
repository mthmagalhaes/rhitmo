import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { Bell, X, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useHRRiskAlerts } from '@/hooks/useHRRiskAlerts';

export function HRAutoAlertsSection() {
  const { t, i18n } = useTranslation();
  const { alerts, isLoading, dismiss } = useHRRiskAlerts();

  if (isLoading) return null;

  const dateLocale = i18n.language?.startsWith('en') ? enUS : i18n.language?.startsWith('es') ? es : ptBR;

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
        <Bell className="h-3 w-3" />
        {t('hrAlerts.sectionTitle')}
        {alerts.length > 0 && (
          <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
            {alerts.length}
          </span>
        )}
      </p>
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t('hrAlerts.empty')}
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const Icon =
                alert.severity === 'critical'
                  ? ShieldAlert
                  : alert.severity === 'warning'
                    ? AlertTriangle
                    : Info;
              const sevClass =
                alert.severity === 'critical'
                  ? 'text-destructive bg-destructive/5 border-destructive/20'
                  : alert.severity === 'warning'
                    ? 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40'
                    : 'text-primary bg-primary/5 border-primary/20';

              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${sevClass}`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{alert.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(alert.created_at), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => dismiss(alert.id)}
                    className="h-6 w-6 shrink-0 hover:bg-background/50"
                    aria-label={t('hrAlerts.dismiss')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
