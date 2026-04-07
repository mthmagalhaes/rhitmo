import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Clock, RefreshCw, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PendingInvite {
  id: string;
  member_id: string;
  slack_user_id: string;
  member_has_account: boolean;
  status: string;
  reminded_at: string | null;
  created_at: string;
  member_name?: string;
  member_email?: string;
}

interface PendingInvitesSectionProps {
  workspaceId: string;
  compact?: boolean;
}

export const PendingInvitesSection = ({ workspaceId, compact = false }: PendingInvitesSectionProps) => {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadInvites();
  }, [workspaceId]);

  const loadInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_slack_invites' as any)
        .select('*')
        .eq('status', 'sent');

      if (error) throw error;
      if (!data || data.length === 0) {
        setInvites([]);
        return;
      }

      const memberIds = (data as any[]).map((d: any) => d.member_id);
      const { data: members } = await supabase
        .from('team_members')
        .select('id, name, email')
        .in('id', memberIds);

      const memberMap = new Map((members || []).map(m => [m.id, m]));

      const enriched = (data as any[]).map((inv: any) => {
        const member = memberMap.get(inv.member_id);
        return {
          ...inv,
          member_name: member?.name || 'Membro',
          member_email: member?.email || '',
        };
      });

      setInvites(enriched);
    } catch (err) {
      console.error('Error loading pending invites:', err);
    }
  };

  const handleResend = async (invite: PendingInvite) => {
    setResending(invite.id);
    try {
      const { data, error } = await supabase.functions.invoke('invite-member-slack', {
        body: {
          member_id: invite.member_id,
          member_name: invite.member_name,
          member_email: invite.member_email,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Convite reenviado!',
          description: `Novo convite enviado para ${invite.member_name} via Slack.`,
        });
        loadInvites();
      } else if (data?.reason === 'not_in_workspace') {
        toast({
          title: 'Email não encontrado no Slack',
          description: 'Verifique se a pessoa está no workspace Slack.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao reenviar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setResending(null);
    }
  };

  // Compact mode: inline in dashboard
  if (compact) {
    if (invites.length === 0) {
      return (
        <div className="rounded-3xl bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3 flex items-center gap-2">
            📨 Convites Pendentes
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Todos conectados!</span>
          </div>
        </div>
      );
    }

    const visibleInvites = invites.slice(0, 3);

    return (
      <div className="rounded-3xl bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-5">
        <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3 flex items-center gap-2">
          📨 Convites Pendentes
          <Badge variant="secondary" className="text-xs rounded-full">{invites.length}</Badge>
        </h3>
        <div className="space-y-2">
          {visibleInvites.map((invite) => {
            const daysSince = differenceInDays(new Date(), new Date(invite.created_at));
            return (
              <div
                key={invite.id}
                className="flex items-center gap-2 rounded-xl bg-muted/30 p-2.5"
              >
                <Badge
                  variant="secondary"
                  className={`h-2 w-2 p-0 rounded-full shrink-0 ${
                    invite.member_has_account
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                />
                <span className="text-sm text-foreground truncate flex-1">{invite.member_name}</span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {daysSince === 0 ? 'Hoje' : `${daysSince}d`}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => handleResend(invite)}
                  disabled={resending === invite.id}
                >
                  <RefreshCw className={`h-3 w-3 ${resending === invite.id ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            );
          })}
        </div>
        {invites.length > 3 && (
          <button className="text-xs text-primary mt-2 hover:underline">
            Ver todos ({invites.length})
          </button>
        )}
      </div>
    );
  }

  // Full mode (original)
  if (invites.length === 0) return null;

  return (
    <Card className="mb-6 rounded-3xl border-0 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <CardHeader
        className="cursor-pointer pb-2"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Clock className="h-4 w-4 text-amber-500" />
            <span>⏳ {invites.length} convite{invites.length !== 1 ? 's' : ''} pendente{invites.length !== 1 ? 's' : ''}</span>
          </CardTitle>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 pt-0">
          {invites.map((invite) => {
            const daysSince = differenceInDays(new Date(), new Date(invite.created_at));

            return (
              <div
                key={invite.id}
                className="flex items-center gap-3 rounded-2xl bg-muted/30 p-3"
              >
                <MemberAvatar
                  memberId={invite.member_id}
                  memberName={invite.member_name || ''}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {invite.member_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant="secondary"
                      className={`text-xs rounded-full ${
                        invite.member_has_account
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}
                    >
                      {invite.member_has_account ? 'Aguardando conexão' : 'Aguardando cadastro'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {daysSince === 0 ? 'Hoje' : `Há ${daysSince}d`}
                    </span>
                    {invite.reminded_at && (
                      <Badge variant="outline" className="text-xs rounded-full">
                        Lembrete enviado
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleResend(invite)}
                  disabled={resending === invite.id}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${resending === invite.id ? 'animate-spin' : ''}`} />
                  Reenviar
                </Button>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
};
