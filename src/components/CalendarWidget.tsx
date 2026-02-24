import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Calendar, ExternalLink } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const getDayBadge = (startTime: string) => {
  const date = new Date(startTime);
  if (isToday(date)) return { label: 'Hoje', color: 'bg-amber-100 text-amber-700' };
  if (isTomorrow(date)) return { label: 'Amanhã', color: 'bg-blue-100 text-blue-700' };
  return { label: format(date, 'EEE', { locale: ptBR }), color: 'bg-slate-100 text-slate-600' };
};

export const CalendarWidget = () => {
  const {
    isConnected,
    checkingConnection,
    upcomingMeetings,
    loadingMeetings,
    connectCalendar,
    disconnectCalendar,
  } = useCalendarIntegration();
  const navigate = useNavigate();

  if (checkingConnection) return null;

  // STATE 1: Not connected
  if (!isConnected) {
    return (
      <div className="rounded-2xl bg-card/60 border border-border/50 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">
              Conecte o Google Calendar para ver suas próximas 1:1s
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={connectCalendar}
            className="rounded-xl shrink-0 gap-2"
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Conectar Google Calendar</span>
            <span className="sm:hidden">Conectar</span>
          </Button>
        </div>
      </div>
    );
  }

  // STATE 2: Loading
  if (loadingMeetings) {
    return (
      <div className="rounded-2xl bg-card/60 border border-border/50 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Próximas reuniões</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          <Skeleton className="min-w-[220px] h-[88px] rounded-xl" />
          <Skeleton className="min-w-[220px] h-[88px] rounded-xl" />
        </div>
      </div>
    );
  }

  // STATE 3: Connected, no meetings
  if (upcomingMeetings.length === 0) {
    return (
      <div className="rounded-2xl bg-card/60 border border-border/50 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhuma reunião com liderados nas próximas 48h
            </p>
          </div>
          <button
            onClick={disconnectCalendar}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Desconectar
          </button>
        </div>
      </div>
    );
  }

  // STATE 4: Connected, with meetings
  return (
    <div className="rounded-2xl bg-card/60 border border-border/50 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Próximas reuniões</span>
          <Badge variant="secondary" className="text-xs">
            {upcomingMeetings.length}
          </Badge>
        </div>
        <button
          onClick={disconnectCalendar}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Desconectar
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {upcomingMeetings.map((meeting) => {
          const badge = getDayBadge(meeting.start_time);

          return (
            <div
              key={meeting.id || meeting.member_id + meeting.start_time}
              className="min-w-[220px] rounded-xl bg-card p-3 shadow-sm border border-border/50 shrink-0 hover:-translate-y-0.5 transition-transform cursor-pointer"
              onClick={() => meeting.id ? navigate(`/brief/${meeting.id}`) : navigate(`/member/${meeting.member_id}`)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(meeting.start_time), 'HH:mm', { locale: ptBR })}
                </span>
                <Badge variant="outline" className={`text-xs border-transparent ${badge.color}`}>
                  {badge.label}
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground truncate">
                {meeting.member_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">{meeting.title}</p>
              {meeting.meet_link && (
                <a
                  href={meeting.meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Meet
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
