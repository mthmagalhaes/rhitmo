import { useQuery } from '@tanstack/react-query';
import { safeRpc } from '@/lib/supabaseSafe';

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
  return useQuery({
    queryKey: ['workspace-people', workspaceId],
    queryFn: async () => {
      const rows = await safeRpc<WorkspacePerson[]>('get_workspace_people', {
        p_workspace_id: workspaceId,
      });
      return rows ?? [];
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
  });
}
