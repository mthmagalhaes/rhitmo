import { useState } from 'react';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar, CalendarOff, ExternalLink, FileText, ChevronDown, Mic, Loader2, CheckCircle2, Sparkles, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { AdHocBotDialog } from '@/components/dashboard/AdHocBotDialog';

const getTimeBadge = (startTime: string) => {
  try {
    const date = new Date(startTime);
    if (isNaN(date.getTime())) return { label: '--:--', className: 'bg-muted text-muted-foreground border-border' };
    if (isToday(date)) return { label: `Hoje ${format(date, 'HH:mm')}`, className: 'bg-primary/10 text-primary border-primary/20' };
    if (isTomorrow(date)) return { label: `Amanhã ${format(date, 'HH:mm')}`, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' };
    return { label: format(date, "dd/MM HH:mm", { locale: ptBR }), className: 'bg-muted text-muted-foreground border-border' };
  } catch {
    return { label: '--:--', className: 'bg-muted text-muted-foreground border-border' };
  }
};

const VISIBLE_COUNT = 3;

export const UpcomingMeetingsCard = () => {
  const {
    isConnected,
    checkingConnection,
    upcomingMeetings,
    loadingMeetings,
    isSyncing,
    isSyncError,
    syncError,
    connectCalendar,
    disconnectCalendar,
    autoTranscribe,
    toggleAutoTranscribe,
    toggleMeetingOptIn,
    scheduleBot,
    getBotStatus,
    syncDebug,
    refetchMeetings,
  } = useCalendarIntegration();
  const { canScheduleBot, botMeetingCount, limits } = usePlanLimits();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [schedulingMeetingId, setSchedulingMeetingId] = useState<string | null>(null);

  const sendAdHocBot = ({ meeting_url, member_id }: { meeting_url: string; member_id: string | null }) => {
    scheduleBot.mutate({
      meeting_url,
      member_id,
      meeting_id: null,
      start_time: new Date().toISOString(),
      trigger_source: 'manual_retroactive',
    });
  };

  // Not connected state
  if (!checkingConnection && !isConnected) {
    return (
      <div className="rounded-3xl bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6 min-h-[300px] flex flex-col items-center justify-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Calendar className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-foreground mb-2">
          Próximas 1:1s e Preparação Automatizada
        </h3>
        <p className="text-sm text-muted-foreground mb-5 max-w-[240px]">
          Conecte o Google Calendar para ver suas próximas reuniões com liderados e gerar evidências automáticas.
        </p>
        <Button
          onClick={connectCalendar}
          className="rounded-xl gap-2"
        >
          <Calendar className="h-4 w-4" />
          Conectar Google Calendar
        </Button>
      </div>
    );
  }

  // Loading state (initial load only)
  if (checkingConnection || loadingMeetings) {
    return (
      <div className="rounded-3xl bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6">
        <div className="flex items-center gap-2 mb-5">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Próximas 1:1s</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Sync button component
  const SyncButton = () => (
    <button
      onClick={() => refetchMeetings()}
      disabled={isSyncing}
      className="text-xs text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1 disabled:opacity-50"
    >
      <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
    </button>
  );

  // Error state
  if (isSyncError) {
    const errorMsg = String((syncError as any)?.message || '');
    const isAuthError = errorMsg.includes('401') || errorMsg.includes('reconnect') || errorMsg.includes('expired');
    return (
      <div className="rounded-3xl bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6 min-h-[200px] flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Próximas 1:1s</h3>
          </div>
          <div className="flex items-center gap-3">
            <SyncButton />
            <button
              onClick={disconnectCalendar}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Desconectar
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <AlertTriangle className="h-9 w-9 text-amber-500/50 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            {isAuthError ? 'Sessão do Google Calendar expirou' : 'Falha ao sincronizar calendário'}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {isAuthError
              ? 'Reconecte sua conta para continuar sincronizando reuniões.'
              : 'Tente sincronizar novamente ou reconecte sua conta.'}
          </p>
          {isAuthError ? (
            <Button onClick={connectCalendar} variant="outline" size="sm" className="rounded-xl gap-2">
              <Calendar className="h-3.5 w-3.5" />
              Reconectar
            </Button>
          ) : (
            <Button onClick={() => refetchMeetings()} variant="outline" size="sm" className="rounded-xl gap-2" disabled={isSyncing}>
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Tentar novamente
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (upcomingMeetings.length === 0) {
    const hasEvents = syncDebug && syncDebug.events_found > 0;
    return (
      <div className="rounded-3xl bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6 min-h-[200px] flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Próximas 1:1s</h3>
          </div>
          <div className="flex items-center gap-3">
            <SyncButton />
            <button
              onClick={disconnectCalendar}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Desconectar
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <CalendarOff className="h-9 w-9 text-muted-foreground mb-3" />
          {hasEvents ? (
            <>
              <p className="text-sm text-muted-foreground mb-1">
                {syncDebug.events_found} eventos encontrados, mas nenhum com liderados cadastrados
              </p>
              <p className="text-xs text-muted-foreground">
                Verifique se os e-mails dos liderados estão cadastrados corretamente no time
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma reunião nas próximas 48h
            </p>
          )}
          <div className="mt-4">
            <AdHocBotDialog
              onSubmit={sendAdHocBot}
              isPending={scheduleBot.isPending}
              disabled={!canScheduleBot}
              disabledReason="Limite de reuniões com bot atingido."
            />
          </div>
        </div>
      </div>
    );
  }

  // With meetings — show max VISIBLE_COUNT, collapsible
  const hasMore = upcomingMeetings.length > VISIBLE_COUNT;
  const visibleMeetings = expanded ? upcomingMeetings.slice(0, 8) : upcomingMeetings.slice(0, VISIBLE_COUNT);

  return (
    <div className="rounded-3xl bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Próximas 1:1s</h3>
          <Badge variant="secondary" className="text-xs rounded-full">
            {upcomingMeetings.length}
          </Badge>
          {!limits.isBetaUser && limits.maxBotMeetings > 0 && (
            <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0.5 text-muted-foreground">
              {botMeetingCount}/{limits.maxBotMeetings} bot
            </Badge>
          )}
          {isSyncing && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-3">
          <SyncButton />
          <button
            onClick={disconnectCalendar}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Desconectar
          </button>
        </div>
      </div>

      {/* Auto-transcribe toggle */}
      <div className="flex items-center justify-between px-1 py-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Transcrição automática</span>
        </div>
        <div className="flex items-center gap-3">
          <AdHocBotDialog
            onSubmit={sendAdHocBot}
            isPending={scheduleBot.isPending}
            disabled={!canScheduleBot}
            disabledReason="Limite de reuniões com bot atingido."
          />
          <Switch
            checked={autoTranscribe}
            onCheckedChange={(checked) => toggleAutoTranscribe.mutate(checked)}
            disabled={toggleAutoTranscribe.isPending}
            className="scale-90"
          />
        </div>
      </div>

      <div className="space-y-1">
        {visibleMeetings.map((meeting, index) => {
          const badge = getTimeBadge(meeting.start_time);
          const bot = meeting.id ? getBotStatus(meeting.id, meeting.meet_link) : undefined;
          const isAutoScheduled = autoTranscribe && bot?.status === 'scheduled';

          // Reunião está acontecendo agora? (start_time entre -45min e +5min de now)
          const startMs = new Date(meeting.start_time).getTime();
          const minutesSinceStart = (Date.now() - startMs) / 60_000;
          const isHappeningNow = minutesSinceStart >= -5 && minutesSinceStart <= 45;
          // Bot drifted? Foi agendado pro horário antigo (>5min depois do start real)
          // e por isso não vai entrar a tempo — tratar como "sem bot ativo".
          const botScheduledMs = bot?.scheduled_at ? new Date(bot.scheduled_at).getTime() : null;
          const botDriftedTooLate =
            bot?.status === 'scheduled' &&
            botScheduledMs !== null &&
            botScheduledMs - startMs > 5 * 60 * 1000;
          // Bot ainda recuperável? (sem bot ativo + dentro da janela retroativa)
          const noActiveBot = !bot || bot.status === 'error' || bot.status === 'skipped_no_leader' || bot.status === 'unrecoverable' || botDriftedTooLate;
          const canSendRetroactive = isHappeningNow && noActiveBot && !!meeting.meet_link;

          const triggerBot = (retroactive: boolean) => {
            if (!canScheduleBot) return;
            setSchedulingMeetingId(meeting.id);
            scheduleBot.mutate({
              meeting_id: meeting.id,
              meeting_url: meeting.meet_link!,
              member_id: meeting.member_id,
              start_time: meeting.start_time,
              trigger_source: retroactive ? 'manual_retroactive' : 'manual',
            }, {
              onSettled: () => setSchedulingMeetingId(null),
            });
          };

          return (
            <div key={meeting.id || meeting.member_id + meeting.start_time}>
              <div
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={() => meeting.id ? navigate(`/brief/${meeting.id}`) : navigate(`/member/${meeting.member_id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={`text-xs border rounded-full px-2.5 py-0.5 ${badge.className}`}
                    >
                      {badge.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] rounded-full px-2 py-0.5 text-muted-foreground border-border"
                    >
                      {meeting.meeting_type === 'team' ? 'Equipe' : '1:1'}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {meeting.member_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{meeting.title}</p>
                  {bot?.error_message && noActiveBot && (
                    <p className="text-xs text-destructive mt-1 line-clamp-2" title={bot.error_message}>
                      {bot.error_message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Recall bot status / schedule button */}
                  {meeting.meet_link && (() => {
                    if (bot?.status === 'done') {
                      return (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Transcrito
                        </span>
                      );
                    }
                    if (bot?.status === 'recording') {
                      return (
                        <span className="flex items-center gap-1 text-xs text-red-500 font-medium animate-pulse">
                          <Mic className="h-3.5 w-3.5" />
                          Gravando
                        </span>
                      );
                    }
                    if (bot?.status === 'scheduled' && !botDriftedTooLate) {
                      return (
                        <span className="flex items-center gap-1 text-xs font-medium">
                          {isAutoScheduled ? (
                            <>
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                              <span className="text-primary">Auto ✓</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Agendado</span>
                            </>
                          )}
                        </span>
                      );
                    }
                    if (bot?.status === 'joining' || bot?.status === 'processing') {
                      return (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {bot.status === 'processing' ? 'Processando' : 'Entrando'}
                        </span>
                      );
                    }
                    if (bot?.status === 'in_waiting_room') {
                      return (
                        <span
                          className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium"
                          title="O host precisa aceitar o Rhitmo na sala de espera do Google Meet."
                        >
                          <Clock className="h-3.5 w-3.5" />
                          Sala de espera
                        </span>
                      );
                    }
                    // Reunião rolando AGORA sem bot → botão de resgate.
                    if (canSendRetroactive) {
                      return (
                        <button
                          className="h-8 px-2.5 rounded-lg bg-red-500/10 flex items-center gap-1.5 hover:bg-red-500/20 transition-colors text-xs font-medium text-red-600 dark:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed animate-pulse"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirm('Enviar bot agora? Ele vai gravar a partir deste momento — o que já passou da reunião não pode ser recuperado.')) return;
                            triggerBot(true);
                          }}
                          disabled={schedulingMeetingId === meeting.id || !canScheduleBot}
                          title={!canScheduleBot ? 'Limite de reuniões com bot atingido.' : 'Bot não entrou — enviar agora'}
                        >
                          {schedulingMeetingId === meeting.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Mic className="h-3.5 w-3.5" />
                          )}
                          Enviar agora
                        </button>
                      );
                    }
                    // No bot — auto on: pendente; auto off: botão "Transcrever".
                    if (autoTranscribe) {
                      return (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                          <Sparkles className="h-3.5 w-3.5" />
                          Pendente
                        </span>
                      );
                    }
                    return (
                      <button
                        className="h-8 px-2.5 rounded-lg bg-primary/10 flex items-center gap-1.5 hover:bg-primary/20 transition-colors text-xs font-medium text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerBot(false);
                        }}
                        disabled={schedulingMeetingId === meeting.id || !canScheduleBot}
                        title={!canScheduleBot ? 'Limite de reuniões com bot atingido. Faça upgrade.' : undefined}
                      >
                        {schedulingMeetingId === meeting.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mic className="h-3.5 w-3.5" />
                        )}
                        Transcrever
                      </button>
                    );
                  })()}
                  {/* Botão discreto "Chamar bot agora" — sempre visível como fallback,
                      exceto quando bot já está gravando/transcrito. */}
                  {meeting.meet_link &&
                    bot?.status !== 'recording' &&
                    bot?.status !== 'done' &&
                    !canSendRetroactive && (
                      <button
                        className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={(e) => {
                          e.stopPropagation();
                          const isFuture = startMs - Date.now() > 5 * 60 * 1000;
                          const msg = isFuture
                            ? 'Enviar bot agora? Ele vai entrar na reunião imediatamente, mesmo antes do horário marcado.'
                            : 'Enviar bot agora? Ele vai gravar a partir deste momento — o que já passou da reunião não pode ser recuperado.';
                          if (!confirm(msg)) return;
                          triggerBot(true);
                        }}
                        disabled={schedulingMeetingId === meeting.id || !canScheduleBot}
                        title={!canScheduleBot ? 'Limite de reuniões com bot atingido.' : 'Chamar bot agora — útil se ele não entrou ou foi removido'}
                      >
                        {schedulingMeetingId === meeting.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          <Mic className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                        )}
                      </button>
                    )}
                  {meeting.meet_link && (
                    <a
                      href={meeting.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-primary" />
                    </a>
                  )}

                  <button
                    className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      meeting.id ? navigate(`/brief/${meeting.id}`) : navigate(`/member/${meeting.member_id}`);
                    }}
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
              {index < visibleMeetings.length - 1 && (
                <div className="mx-3 border-b border-border/50" />
              )}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors py-2"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Mostrar menos' : `Ver mais ${upcomingMeetings.length - VISIBLE_COUNT}`}
        </button>
      )}
    </div>
  );
};
