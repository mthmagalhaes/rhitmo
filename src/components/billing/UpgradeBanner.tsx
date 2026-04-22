import { useNavigate } from 'react-router-dom';
import { useEnforcedLimits } from '@/hooks/useEnforcedLimits';
import { Button } from '@/components/ui/button';
import { ArrowUpRight } from 'lucide-react';

export const UpgradeBanner = () => {
  const navigate = useNavigate();
  const {
    limits,
    memberCount,
    teamCount,
    reviewCount,
    botMeetingCount,
    mentorMessageCount,
    recordingHoursUsed,
    checkLimit,
  } = useEnforcedLimits();

  if (limits.isBetaUser) return null;

  const nearLimits: { name: string; current: string; max: string }[] = [];

  const memberStatus = checkLimit(memberCount, limits.maxMembers);
  if (memberStatus !== 'allowed') {
    nearLimits.push({ name: 'Liderados', current: String(memberCount), max: String(limits.maxMembers) });
  }

  const teamStatus = checkLimit(teamCount, limits.maxTeams);
  if (teamStatus !== 'allowed') {
    nearLimits.push({ name: 'Times', current: String(teamCount), max: String(limits.maxTeams) });
  }

  const reviewStatus = checkLimit(reviewCount, limits.maxReviews);
  if (reviewStatus !== 'allowed') {
    nearLimits.push({ name: 'Avaliações/mês', current: String(reviewCount), max: String(limits.maxReviews) });
  }

  // Mentor Chat — primeira feature usada por novos usuários no Pulse (cap 20/mês).
  // checkLimit já trata Infinity, então só renderiza quando faz sentido.
  const mentorStatus = checkLimit(mentorMessageCount, limits.maxMentorMessages);
  if (mentorStatus !== 'allowed') {
    nearLimits.push({
      name: 'Mensagens Mentor Chat',
      current: String(mentorMessageCount),
      max: String(limits.maxMentorMessages),
    });
  }

  // Horas de transcrição (gravação manual + bot Recall). Só faz sentido quando há cap real.
  if (limits.maxRecordingHours > 0 && limits.maxRecordingHours !== Infinity) {
    const recordingStatus = checkLimit(recordingHoursUsed, limits.maxRecordingHours);
    if (recordingStatus !== 'allowed') {
      nearLimits.push({
        name: 'Horas de transcrição',
        current: recordingHoursUsed.toFixed(1),
        max: String(limits.maxRecordingHours),
      });
    }
  }

  if (limits.maxBotMeetings > 0) {
    const botStatus = checkLimit(botMeetingCount, limits.maxBotMeetings);
    if (botStatus !== 'allowed') {
      nearLimits.push({ name: 'Reuniões com bot', current: String(botMeetingCount), max: String(limits.maxBotMeetings) });
    }
  }

  if (nearLimits.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Próximo do limite — {limits.planName}
        </p>
        <div className="flex flex-wrap gap-3 mt-1">
          {nearLimits.map((limit) => (
            <span key={limit.name} className="text-xs text-muted-foreground">
              {limit.current}/{limit.max} {limit.name}
            </span>
          ))}
        </div>
      </div>
      <Button
        size="sm"
        className="rounded-xl gap-1.5 shrink-0"
        onClick={() => navigate('/billing')}
      >
        Upgrade
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
