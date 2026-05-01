// Sprint 10.4 — Hook leve para descobrir o líder do liderado a partir do team_members.id.
// Sprint 10.5 — escopo opcional por workspace para evitar nome cruzado em multi-tenant.
// Retorna { leaderUserId, leaderName } ou null se o liderado não estiver vinculado a um time com líder.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';

export interface LeaderInfo {
  leaderUserId: string;
  leaderName: string | null;
  teamId: string;
}

export function useLeaderInfo(memberId: string | undefined) {
  const { workspaceId } = useAccount();

  return useQuery<LeaderInfo | null>({
    queryKey: ['leader-info', memberId, workspaceId],
    enabled: !!memberId,
    queryFn: async () => {
      if (!memberId) return null;

      // 1. Resolve team_id e leader_user_id via team_members → teams
      const { data: tm, error: tmErr } = await supabase
        .from('team_members')
        .select('team_id, teams:team_id(id, leader_user_id, name)')
        .eq('id', memberId)
        .maybeSingle();

      if (tmErr) {
        console.error('[useLeaderInfo] team_members', tmErr);
        return null;
      }

      const team = (tm as any)?.teams;
      const leaderUserId: string | null = team?.leader_user_id ?? null;
      if (!team || !leaderUserId) return null;

      // 2. Tenta resolver o nome do líder via team_members. Em multi-workspace,
      // restringimos ao workspace ativo para evitar pegar o nome do líder em outro tenant.
      let leaderName: string | null = null;
      const leaderQuery = supabase
        .from('team_members')
        .select('name')
        .eq('linked_user_id', leaderUserId);

      const scoped = workspaceId ? leaderQuery.eq('workspace_id', workspaceId) : leaderQuery;

      const { data: leaderAsMember } = await scoped.limit(1).maybeSingle();

      if (leaderAsMember?.name) {
        leaderName = leaderAsMember.name as string;
      }

      return {
        leaderUserId,
        leaderName,
        teamId: team.id,
      };
    },
  });
}
