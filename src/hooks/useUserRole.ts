import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'hr_admin' | 'leader' | 'user';

interface UserRoleData {
  role: UserRole;
  isHRAdmin: boolean;
  isLeader: boolean;
  isUser: boolean;
  loading: boolean;
}

export function useUserRole(): UserRoleData {
  const { user, loading: authLoading } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async (): Promise<UserRole> => {
      if (!user) return 'user';

      const [hrResult, ownerResult, teamLeaderResult] = await Promise.all([
        supabase
          .from('workspaces')
          .select('id')
          .contains('hr_admin_ids', [user.id])
          .limit(1)
          .maybeSingle(),
        supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('teams')
          .select('id')
          .eq('leader_user_id', user.id)
          .limit(1)
          .maybeSingle(),
      ]);

      if (hrResult.error) console.warn('[useUserRole] HR check error:', hrResult.error.message);
      if (ownerResult.error) console.warn('[useUserRole] Owner check error:', ownerResult.error.message);
      if (teamLeaderResult.error) console.warn('[useUserRole] Team leader check error:', teamLeaderResult.error.message);

      if (hrResult.error && ownerResult.error && teamLeaderResult.error) {
        throw new Error('All role-check queries failed');
      }

      if (hrResult.data) return 'hr_admin';
      if (ownerResult.data || teamLeaderResult.data) return 'leader';
      return 'user';
    },
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  const stillLoading = authLoading || isLoading;

  // CRITICAL: Do not default to 'user' while still loading.
  // This prevents momentary "member" flashes for leaders.
  const resolvedRole: UserRole = stillLoading ? 'leader' : (role ?? 'user');

  return {
    role: resolvedRole,
    isHRAdmin: !stillLoading && resolvedRole === 'hr_admin',
    isLeader: stillLoading || resolvedRole === 'leader' || resolvedRole === 'hr_admin',
    isUser: !stillLoading && resolvedRole === 'user',
    loading: stillLoading,
  };
}
