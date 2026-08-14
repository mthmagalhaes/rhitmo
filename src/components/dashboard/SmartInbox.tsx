import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, FileText, Bell, ChevronRight, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeaderInbox } from '@/hooks/useLeaderInbox';
import { cn } from '@/lib/utils';

interface SmartInboxProps {
  workspaceId?: string;
}

export function SmartInbox({ workspaceId }: SmartInboxProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inbox = useLeaderInbox(workspaceId);

  if (inbox.isLoading) {
    return (
      <Card className="rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6 mb-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  const items = [
    {
      key: 'meetings',
      icon: Calendar,
      label: t('smartInbox.meetingsToday'),
      value: inbox.oneOnOnesToday,
      tone: inbox.oneOnOnesToday > 0 ? 'primary' : 'muted',
      onClick: () => navigate('/'),
    },
    {
      key: 'stale',
      icon: Clock,
      label: t('smartInbox.staleMembers'),
      value: inbox.membersWithoutNote14d.length,
      tone: inbox.membersWithoutNote14d.length > 0 ? 'amber' : 'muted',
      onClick: () => {
        if (inbox.membersWithoutNote14d[0]) {
          navigate(`/member/${inbox.membersWithoutNote14d[0].id}`);
        }
      },
    },
    {
      key: 'reviews',
      icon: FileText,
      label: t('smartInbox.draftReviews'),
      value: inbox.draftReviews,
      tone: inbox.draftReviews > 0 ? 'primary' : 'muted',
      onClick: () => navigate('/'),
    },
    {
      key: 'nudges',
      icon: Bell,
      label: t('smartInbox.pendingNudges'),
      value: inbox.pendingNudges,
      tone: inbox.pendingNudges > 0 ? 'primary' : 'muted',
      onClick: () => navigate('/'),
    },
  ];

  const total = items.reduce((acc, i) => acc + (typeof i.value === 'number' ? i.value : 0), 0);

  return (
    <Card className="rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-base font-bold tracking-tight text-foreground">
            {t('smartInbox.title')}
          </h2>
        </div>
        {total === 0 && (
          <span className="text-xs text-emerald-600">{t('smartInbox.allClear')}</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          const interactive = item.value > 0;
          return (
            <button
              key={item.key}
              type="button"
              onClick={interactive ? item.onClick : undefined}
              disabled={!interactive}
              className={cn(
                'relative rounded-xl p-4 text-left transition-all border',
                interactive
                  ? 'bg-background hover:bg-accent/50 hover:-translate-y-0.5 cursor-pointer border-border'
                  : 'bg-muted/30 cursor-default border-transparent',
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon
                  className={cn(
                    'h-4 w-4',
                    item.tone === 'primary' && 'text-primary',
                    item.tone === 'amber' && 'text-amber-500',
                    item.tone === 'muted' && 'text-muted-foreground',
                  )}
                />
                {interactive && <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />}
              </div>
              <p
                className={cn(
                  'text-2xl font-bold tracking-tight',
                  item.tone === 'amber' ? 'text-amber-600' : 'text-foreground',
                )}
              >
                {item.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.label}</p>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
