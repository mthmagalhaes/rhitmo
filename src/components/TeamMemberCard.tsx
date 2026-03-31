import { TeamMember } from '@/types/team';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MessageSquare, Settings } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

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
  const daysSince = member.lastFeedback ? differenceInDays(new Date(), new Date(member.lastFeedback)) : null;

  let statusColor: string;
  let statusMessage: string;

  if (member.feedbackCount === 0 || daysSince === null) {
    statusColor = 'bg-muted-foreground/40';
    statusMessage = 'Sem notas registradas';
  } else if (daysSince === 0) {
    statusColor = 'bg-emerald-500';
    statusMessage = 'Última nota hoje';
  } else if (daysSince === 1) {
    statusColor = 'bg-emerald-500';
    statusMessage = 'Última nota há 1 dia';
  } else if (daysSince <= 7) {
    statusColor = 'bg-emerald-500';
    statusMessage = `Última nota há ${daysSince} dias`;
  } else if (daysSince <= 14) {
    statusColor = 'bg-yellow-500';
    statusMessage = `Última nota há ${daysSince} dias`;
  } else {
    statusColor = 'bg-destructive';
    statusMessage = `Última nota há ${daysSince} dias`;
  }

  return (
    <Card 
      className="group relative cursor-pointer rounded-3xl border-0 bg-card shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
      onClick={onClick}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`absolute top-4 right-4 h-2 w-2 rounded-full ${statusColor}`} />
          </TooltipTrigger>
          <TooltipContent>{statusMessage}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <div className="ring-2 ring-offset-2 ring-primary/10 rounded-full">
            <MemberAvatar 
              memberId={member.id}
              memberName={member.name}
              size="lg"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold tracking-tight text-lg text-foreground break-words">{member.name}</h3>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{member.role}</p>
            {teamName && (
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-normal mt-1">
                {teamName}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <MessageSquare className="h-4 w-4" />
          <span>{member.feedbackCount} notas</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Última nota: {new Date(member.lastFeedback).toLocaleDateString('pt-BR')}</span>
        </div>
        {/* Slack invite status */}
        {!member.linkedUserId && pendingInvite && pendingInvite.status === 'sent' && (
          <div className="mt-3">
            <Badge
              variant="secondary"
              className={`text-xs rounded-full ${
                pendingInvite.member_has_account
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}
            >
              {pendingInvite.member_has_account ? '⏳ Aguardando conexão' : '⏳ Aguardando cadastro'}
            </Badge>
          </div>
        )}
        {!member.linkedUserId && !pendingInvite && member.email && onSendInvite && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 rounded-xl"
              onClick={(e) => {
                e.stopPropagation();
                onSendInvite();
              }}
            >
              📧 Enviar Convite
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
