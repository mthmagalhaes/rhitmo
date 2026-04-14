import { TeamMember } from '@/types/team';
import { Card } from '@/components/ui/card';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Settings, Eye } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

interface PendingInviteInfo {
  status: string;
  member_has_account: boolean;
  created_at: string;
}

interface TeamMemberCardProps {
  member: TeamMember;
  teamName?: string;
  onClick: () => void;
  onEdit?: () => void;
  pendingInvite?: PendingInviteInfo | null;
  onSendInvite?: () => void;
}

export const TeamMemberCard = ({ member, teamName, onClick, onEdit, pendingInvite, onSendInvite }: TeamMemberCardProps) => {
  const { t } = useTranslation();
  const daysSince = member.lastFeedback ? differenceInDays(new Date(), new Date(member.lastFeedback)) : null;

  let healthColor: string;
  let healthTextColor: string;
  let statusMessage: string;

  if (member.feedbackCount === 0 || daysSince === null) {
    healthColor = 'bg-muted-foreground/40';
    healthTextColor = 'text-muted-foreground';
    statusMessage = t('teamMember.noNotes');
  } else if (daysSince <= 7) {
    healthColor = 'bg-emerald-500';
    healthTextColor = 'text-emerald-600 dark:text-emerald-400';
    statusMessage = daysSince === 0 ? t('teamMember.today') : daysSince === 1 ? t('teamMember.oneDayAgo') : t('teamMember.daysAgo', { count: daysSince });
  } else if (daysSince <= 14) {
    healthColor = 'bg-yellow-500';
    healthTextColor = 'text-amber-600 dark:text-amber-400';
    statusMessage = t('teamMember.daysAgo', { count: daysSince });
  } else {
    healthColor = 'bg-destructive';
    healthTextColor = 'text-destructive';
    statusMessage = t('teamMember.daysAgo', { count: daysSince });
  }

  return (
    <Card 
      className="group relative cursor-pointer rounded-3xl border-0 bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-300 aspect-[3/4] flex flex-col p-6"
      onClick={onClick}
    >
      {/* Top-right: Edit + Pending invite indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        {!(member as any).linked_user_id && pendingInvite && pendingInvite.status === 'sent' && (
          <span className="relative flex h-6 w-6 items-center justify-center" title={pendingInvite.member_has_account ? t('teamMember.awaitingConnection') : t('teamMember.awaitingSignup')}>
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400/30 animate-ping" />
            <MessageSquare className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 relative" />
          </span>
        )}
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Avatar + Info */}
      <div className="flex-1 flex flex-col items-center text-center pt-2">
        <div className="mb-4">
          <MemberAvatar 
            memberId={member.id}
            memberName={member.name}
            avatarUrl={(member as any).avatar}
            size="lg"
          />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-foreground leading-tight line-clamp-2 mb-1">
          {member.name}
        </h3>
        <p className="text-sm text-muted-foreground">{member.role}</p>
        {teamName && (
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-normal mt-2">
            {teamName}
          </Badge>
        )}
      </div>

      {/* Health indicator */}
      <div className="mt-auto space-y-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center gap-2">
                <span className={`h-2 w-2 rounded-full shrink-0 ${healthColor}`} />
                <span className={`text-xs font-medium ${healthTextColor}`}>
                  {statusMessage}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {member.feedbackCount === 0 ? t('teamMember.noNotesRecorded') : t('teamMember.lastNote', { status: statusMessage.toLowerCase() })}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {t('teamMember.notesCount', { count: member.feedbackCount })}
          </span>
          {(member as any).linked_user_id && (
            <Badge variant="secondary" className="text-[10px] rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0">
              Slack ✓
            </Badge>
          )}
        </div>

        {/* Send invite button */}
        {!(member as any).linked_user_id && (member as any).email && onSendInvite && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 rounded-xl"
            onClick={(e) => {
              e.stopPropagation();
              onSendInvite();
            }}
          >
            {(member as any).invite_status === 'pending' && (member as any).invite_token ? t('teamMember.viewInvite') : t('teamMember.sendInvite')}
          </Button>
        )}

        {/* Ver button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-xl text-xs h-8 gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <Eye className="h-3 w-3" />
          {t('common.view')}
        </Button>
      </div>
    </Card>
  );
};
