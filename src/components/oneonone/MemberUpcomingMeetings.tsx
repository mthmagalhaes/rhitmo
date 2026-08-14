// Sprint 12.2 — Versão enxuta de "próximas 1:1s" filtrada por liderado.
// Reusa useCalendarIntegration mas remove toggles/badges pesados do dashboard:
// só lista até 3 reuniões deste membro com badge de tempo + link Meet + brief.
import { useNavigate } from 'react-router-dom';
import { Calendar, ExternalLink, FileText } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';

interface MemberUpcomingMeetingsProps {
  memberId: string;
  memberName: string;
}

function timeBadge(startTime: string) {
  try {
    const date = new Date(startTime);
    if (isNaN(date.getTime())) return { label: '--:--', className: 'bg-muted text-muted-foreground border-border' };
    if (isToday(date)) return { label: `Hoje ${format(date, 'HH:mm')}`, className: 'bg-primary/10 text-primary border-primary/20' };
    if (isTomorrow(date)) return { label: `Amanhã ${format(date, 'HH:mm')}`, className: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20' };
    return { label: format(date, "dd/MM 'às' HH:mm", { locale: ptBR }), className: 'bg-muted text-muted-foreground border-border' };
  } catch {
    return { label: '--:--', className: 'bg-muted text-muted-foreground border-border' };
  }
}

export function MemberUpcomingMeetings({ memberId, memberName }: MemberUpcomingMeetingsProps) {
  const {
    isConnected,
    checkingConnection,
    upcomingMeetings,
    loadingMeetings,
    connectCalendar,
  } = useCalendarIntegration();
  const navigate = useNavigate();

  // Calendar não conectado: linha discreta, sem ocupar muito espaço
  if (!checkingConnection && !isConnected) {
    return (
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground truncate">
            Conecte o Google Calendar para ver as próximas 1:1s deste liderado.
          </p>
        </div>
        <Button size="sm" variant="outline" className="rounded-xl text-xs h-8" onClick={connectCalendar}>
          Conectar
        </Button>
      </Card>
    );
  }

  if (checkingConnection || loadingMeetings) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
    );
  }

  const memberMeetings = upcomingMeetings
    .filter((m) => m.member_id === memberId)
    .slice(0, 3);

  if (memberMeetings.length === 0) {
    return (
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-4">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Nenhuma 1:1 agendada com {memberName.split(' ')[0]} nas próximas 48h.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <ul className="space-y-1.5">
      {memberMeetings.map((meeting) => {
        const badge = timeBadge(meeting.start_time);
        return (
          <li key={meeting.id || meeting.start_time}>
            <div
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer"
              onClick={() =>
                meeting.id ? navigate(`/brief/${meeting.id}`) : navigate(`/member/${meeting.member_id}`)
              }
            >
              <Badge
                variant="outline"
                className={`text-[11px] border rounded-full px-2.5 py-0.5 shrink-0 ${badge.className}`}
              >
                {badge.label}
              </Badge>
              <p className="text-sm text-foreground truncate flex-1">
                {meeting.title || '1:1'}
              </p>
              {meeting.meet_link && (
                <a
                  href={meeting.meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Abrir Meet"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              )}
              {meeting.id && (
                <button
                  className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/brief/${meeting.id}`);
                  }}
                  aria-label="Abrir brief"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
