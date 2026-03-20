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

      // Check HR admin and leader in parallel
      const [hrResult, leaderResult] = await Promise.all([
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
      ]);

      if (hrResult.data) return 'hr_admin';
      if (leaderResult.data) return 'leader';
      return 'user';
    },
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  const resolvedRole = role ?? 'user';

  return {
    role: resolvedRole,
    isHRAdmin: resolvedRole === 'hr_admin',
    isLeader: resolvedRole === 'leader' || resolvedRole === 'hr_admin',
    isUser: resolvedRole === 'user',
    loading: authLoading || isLoading,
  };
}
