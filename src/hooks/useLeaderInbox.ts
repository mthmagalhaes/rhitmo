import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from './useEffectiveUser';

export interface LeaderInboxData {
  oneOnOnesToday: number;
  membersWithoutNote14d: Array<{ id: string; name: string; days: number }>;
  draftReviews: number;
  pendingNudges: number;
  isLoading: boolean;
}

export function useLeaderInbox(workspaceId?: string): LeaderInboxData {
  const { id: userId } = useEffectiveUser();
  const enabled = !!userId && !!workspaceId;

  const results = useQueries({
    queries: [
      // 1:1s today (calendar meetings whose title hints 1:1 or matches a member)
      {
        queryKey: ['inbox-meetings-today', userId],
        enabled,
        staleTime: 60_000,
        queryFn: async () => {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setHours(23, 59, 59, 999);
          const { data } = await supabase
            .from('upcoming_meetings')
            .select('id, member_id')
            .eq('user_id', userId!)
            .gte('start_time', start.toISOString())
            .lte('start_time', end.toISOString());
          return (data || []).length;
        },
      },
      // Members without note in 14 days
      {
        queryKey: ['inbox-stale-members', userId, workspaceId],
        enabled,
        staleTime: 60_000,
        queryFn: async () => {
          const { data: teams } = await supabase
            .from('teams')
            .select('id')
            .eq('workspace_id', workspaceId!)
            .eq('leader_user_id', userId!);
          const teamIds = (teams || []).map((t) => t.id);
          if (teamIds.length === 0) return [];
          const { data: members } = await supabase
            .from('team_members')
            .select('id, name')
            .in('team_id', teamIds);
          const memberList = members || [];
          if (memberList.length === 0) return [];
          const { data: latest } = await supabase
            .from('feedbacks')
            .select('member_id, occurred_at')
            .in('member_id', memberList.map((m) => m.id))
            .order('occurred_at', { ascending: false });
          const latestByMember = new Map<string, string>();
          (latest || []).forEach((f) => {
            if (!latestByMember.has(f.member_id)) latestByMember.set(f.member_id, f.occurred_at);
          });
          const now = Date.now();
          return memberList
            .map((m) => {
              const last = latestByMember.get(m.id);
              const days = last ? Math.floor((now - new Date(last).getTime()) / 86_400_000) : 999;
              return { id: m.id, name: m.name, days };
            })
            .filter((m) => m.days >= 14)
            .slice(0, 10);
        },
      },
      // Draft reviews waiting to send
      {
        queryKey: ['inbox-draft-reviews', userId, workspaceId],
        enabled,
        staleTime: 60_000,
        queryFn: async () => {
          const { data: teams } = await supabase
            .from('teams')
            .select('id')
            .eq('workspace_id', workspaceId!)
            .eq('leader_user_id', userId!);
          const teamIds = (teams || []).map((t) => t.id);
          if (teamIds.length === 0) return 0;
          const { data: members } = await supabase
            .from('team_members')
            .select('id')
            .in('team_id', teamIds);
          const ids = (members || []).map((m) => m.id);
          if (ids.length === 0) return 0;
          const { count } = await supabase
            .from('performance_reviews')
            .select('*', { count: 'exact', head: true })
            .in('member_id', ids)
            .eq('shared_with_member', false);
          return count || 0;
        },
      },
      // Pending nudges
      {
        queryKey: ['inbox-nudges', userId],
        enabled,
        staleTime: 60_000,
        queryFn: async () => {
          const { count } = await supabase
            .from('leader_nudges')
            .select('*', { count: 'exact', head: true })
            .eq('leader_id', userId!)
            .is('dismissed_at', null);
          return count || 0;
        },
      },
    ],
  });

  return {
    oneOnOnesToday: (results[0].data as number) ?? 0,
    membersWithoutNote14d: (results[1].data as Array<{ id: string; name: string; days: number }>) ?? [],
    draftReviews: (results[2].data as number) ?? 0,
    pendingNudges: (results[3].data as number) ?? 0,
    isLoading: results.some((r) => r.isLoading),
  };
}
