import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Slack, UserPlus, Hash, CalendarDays, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSlackConnection } from '@/hooks/useSlackConnection';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useSlackChannels } from '@/hooks/useSlackChannels';
import { cn } from '@/lib/utils';

interface Props {
  workspaceId: string | null;
  memberCount: number;
  onOpenInvite: () => void;
}

interface SetupCard {
  id: 'slack' | 'invite' | 'channels' | 'calendar';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  pendingDescription: string;
  doneDescription: string;
  done: boolean;
  loading?: boolean;
  onAction: () => void;
  actionLabel: string;
  helpHref?: string;
}

export function AccountSetupBento({ workspaceId, memberCount, onOpenInvite }: Props) {
  const navigate = useNavigate();
  const slack = useSlackConnection();
  const calendar = useCalendarIntegration();
  const channelsQuery = useSlackChannels();

  const dismissKey = workspaceId ? `rhitmo:home:account-setup-dismissed:${workspaceId}` : null;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!dismissKey) return;
    setDismissed(localStorage.getItem(dismissKey) === '1');
  }, [dismissKey]);

  const connectedChannelsCount = useMemo(() => {
    const list = channelsQuery.data?.channels ?? [];
    return list.filter((c) => c.is_member && !c.is_excluded).length;
  }, [channelsQuery.data]);

  const cards: SetupCard[] = useMemo(
    () => [
      {
        id: 'slack',
        icon: Slack,
        title: 'Conectar Slack',
        pendingDescription: 'Receba briefs e converse com a Rhitmo direto do Slack.',
        doneDescription: 'Conta conectada ao Slack.',
        done: slack.isConnected,
        loading: slack.isLoading,
        onAction: () => slack.connectSlack(),
        actionLabel: 'Conectar',
      },
      {
        id: 'invite',
        icon: UserPlus,
        title: 'Convidar liderados',
        pendingDescription: 'Adicione seu time para começar a registrar 1:1s e feedbacks.',
        doneDescription:
          memberCount === 1 ? '1 liderado ativo' : `${memberCount} liderados ativos`,
        done: memberCount > 0,
        onAction: onOpenInvite,
        actionLabel: 'Convidar',
      },
      {
        id: 'channels',
        icon: Hash,
        title: 'Adicionar canais Slack',
        pendingDescription: 'Conecte canais para a Rhitmo capturar contexto do seu time.',
        doneDescription:
          connectedChannelsCount === 1
            ? '1 canal conectado'
            : `${connectedChannelsCount} canais conectados`,
        done: slack.isConnected && connectedChannelsCount > 0,
        loading: channelsQuery.isLoading,
        onAction: () => navigate('/slack-channels'),
        actionLabel: 'Adicionar canais',
      },
      {
        id: 'calendar',
        icon: CalendarDays,
        title: 'Conectar Google Calendar',
        pendingDescription: 'Sincronize 1:1s da agenda e ative briefs antes das reuniões.',
        doneDescription: calendar.connectionData?.calendar_email ?? 'Agenda conectada',
        done: calendar.isConnected,
        loading: calendar.checkingConnection,
        onAction: () => calendar.connectCalendar(),
        actionLabel: 'Conectar',
      },
    ],
    [
      slack.isConnected,
      slack.isLoading,
      slack.connectSlack,
      memberCount,
      onOpenInvite,
      connectedChannelsCount,
      channelsQuery.isLoading,
      calendar.isConnected,
      calendar.checkingConnection,
      calendar.connectionData,
      calendar.connectCalendar,
      navigate,
    ]
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    if (dismissKey) localStorage.setItem(dismissKey, '1');
    setDismissed(true);
  };

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Account Setup
          </p>
        </div>
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
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={cn(
                'group relative flex flex-col rounded-2xl border border-border/50 bg-card p-5',
                'shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-all',
                'hover:-translate-y-0.5 hover:shadow-[0_4px_28px_rgba(0,0,0,0.06)]'
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={cn(
                    'h-9 w-9 rounded-xl flex items-center justify-center',
                    card.done
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {card.done && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Conectado
                  </span>
                )}
              </div>

              <h3 className="text-sm font-semibold tracking-tight text-foreground mb-1.5">
                {card.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1 line-clamp-3">
                {card.done ? card.doneDescription : card.pendingDescription}
              </p>

              {!card.done && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl"
                  onClick={card.onAction}
                  disabled={card.loading}
                >
                  {card.actionLabel}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
