import { TeamMember } from '@/types/team';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MessageSquare, Settings } from 'lucide-react';

interface TeamMemberCardProps {
  member: TeamMember;
  teamName?: string;
  onClick: () => void;
  onEdit?: () => void;
}

export const TeamMemberCard = ({ member, teamName, onClick, onEdit }: TeamMemberCardProps) => {
  return (
    <Card 
      className="group cursor-pointer rounded-3xl border-0 bg-card shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <div className="ring-2 ring-offset-2 ring-primary/10 rounded-full">
            <MemberAvatar 
              memberId={member.id}
              memberName={member.name}
              size="lg"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold tracking-tight text-lg text-foreground truncate">{member.name}</h3>
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
      </CardContent>
    </Card>
  );
};
