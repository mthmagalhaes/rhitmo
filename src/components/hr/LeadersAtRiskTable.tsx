import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ShieldAlert, Bell, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RiskRow {
  manager_id: string;
  manager_name: string;
  manager_email: string | null;
  members_without_note_30d: number;
  last_mentor_chat_at: string | null;
  last_activity_at: string | null;
  risk_reason: string;
}

interface LeadersAtRiskTableProps {
  workspaceId: string;
}

const getInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export function LeadersAtRiskTable({ workspaceId }: LeadersAtRiskTableProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [sendingId, setSendingId] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery<RiskRow[]>({
    queryKey: ['leaders-at-risk', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leaders_at_risk', { _workspace_id: workspaceId });
      if (error) throw error;
      return (data || []) as RiskRow[];
    },
    enabled: !!workspaceId,
  });

  const handleSendNudge = async (row: RiskRow) => {
    setSendingId(row.manager_id);
    try {
      const message =
        row.risk_reason === 'no_notes_and_no_mentor'
          ? t('hr.leadersAtRisk.nudgeMessageBoth')
          : row.risk_reason === 'no_notes_30d'
          ? t('hr.leadersAtRisk.nudgeMessageNotes', { count: row.members_without_note_30d })
          : t('hr.leadersAtRisk.nudgeMessageMentor');
      const { error } = await (supabase.from as any)('leader_nudges').insert({
        leader_id: row.manager_id,
        nudge_type: 'hr_recommendation',
        message,
        severity: 'warning',
      });
      if (error) throw error;
      toast.success(t('hr.leadersAtRisk.nudgeSent'));
      queryClient.invalidateQueries({ queryKey: ['leaders-at-risk', workspaceId] });
    } catch (err: unknown) {
      console.error('[LeadersAtRiskTable] Failed to send nudge:', err);
      toast.error(t('hr.leadersAtRisk.nudgeError'));
    } finally {
      setSendingId(null);
    }
  };

  const reasonLabel = (reason: string) => {
    switch (reason) {
      case 'no_notes_and_no_mentor':
        return t('hr.leadersAtRisk.reason.both');
      case 'no_notes_30d':
        return t('hr.leadersAtRisk.reason.noNotes');
      case 'no_mentor_14d':
        return t('hr.leadersAtRisk.reason.noMentor');
      default:
        return reason;
    }
  };

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
        <ShieldAlert className="h-3 w-3 inline mr-1" />
        {t('hr.leadersAtRisk.title')}
      </p>
      <Card className="rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-6">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t('hr.leadersAtRisk.empty')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-3 font-medium">{t('hr.leadersAtRisk.col.leader')}</th>
                  <th className="pb-3 font-medium text-center">{t('hr.leadersAtRisk.col.staleMembers')}</th>
                  <th className="pb-3 font-medium text-center">{t('hr.leadersAtRisk.col.reason')}</th>
                  <th className="pb-3 font-medium text-right">{t('hr.leadersAtRisk.col.action')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.manager_id} className="border-b border-border/50 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(row.manager_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-foreground font-medium">{row.manager_name}</span>
                          {row.manager_email && (
                            <span className="text-xs text-muted-foreground">{row.manager_email}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      {row.members_without_note_30d > 0 ? (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          {row.members_without_note_30d}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-xs text-muted-foreground">{reasonLabel(row.risk_reason)}</span>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={sendingId === row.manager_id}
                        onClick={() => handleSendNudge(row)}
                      >
                        {sendingId === row.manager_id ? (
                          <MessageCircle className="h-3 w-3 animate-pulse" />
                        ) : (
                          <Bell className="h-3 w-3" />
                        )}
                        {t('hr.leadersAtRisk.sendNudge')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}
