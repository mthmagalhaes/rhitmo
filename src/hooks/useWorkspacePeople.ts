import { useQuery } from '@tanstack/react-query';
import { safeRpc } from '@/lib/supabaseSafe';
import { useAuth } from '@/hooks/useAuth';

export interface WorkspacePerson {
  user_id: string | null;
  member_id: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  roles: Array<'owner' | 'hr_admin' | 'leader' | 'member'>;
  team_id: string | null;
  team_name: string | null;
  team_count: number;
  leader_user_id: string | null;
  leader_name: string | null;
  status: 'active' | 'pending_invite';
  invite_status: string | null;
  has_sync: boolean;
  is_linked: boolean;
  last_activity_at: string | null;
  created_at: string | null;
}

export function useWorkspacePeople(workspaceId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    // user.id included so a session refresh re-issues the RPC with the new JWT
    queryKey: ['workspace-people', workspaceId, user?.id],
    queryFn: async () => {
      const rows = await safeRpc<WorkspacePerson[]>('get_workspace_people', {
        p_workspace_id: workspaceId,
      });
      return rows ?? [];
    },
    enabled: !!workspaceId && !!user?.id,
    staleTime: 60 * 1000,
    retry: (failureCount, error) => {
      // Retry once on "forbidden" — usually a transient JWT-hydration race.
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('forbidden') && failureCount < 2) return true;
      return failureCount < 1;
    },
  });
}
