import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyWorkspace {
  id: string;
  name: string;
  owner_id: string;
  is_active: boolean;
  plan_tier: string;
  hr_admin_ids: string[] | null;
  client_account: string | null;
  customer_segment: string | null;
  created_at: string;
  leader_sync_completed_at?: string | null;
}

export interface CompanyTeam {
  id: string;
  name: string;
  workspace_id: string;
  leader_user_id: string | null;
}

export interface CompanyMember {
  id: string;
  name: string;
  email: string | null;
  role: string;
  team_id: string;
  linked_user_id: string | null;
  work_style_data: any | null;
  skills_data: any | null;
}

export interface UserMeta {
  user_id: string;
  email: string | null;
  full_name: string | null;
}

export type PendingType =
  | 'no_account'
  | 'rhitmo_sync_member'
  | 'rhitmo_sync_leader'
  | 'team_no_leader'
  | 'workspace_mismatch';

export interface PendingRow {
  id: string;
  kind: 'member' | 'team' | 'leader';
  personName: string;
  email?: string | null;
  workspaceId: string;
  workspaceName: string;
  teamId?: string;
  teamName?: string;
  role?: string;
  pendings: PendingType[];
}

export interface CompanyHealth {
  totalMembers: number;
  totalTeams: number;
  linkedMembers: number;
  syncedMembers: number;
  teamsWithLeader: number;
  teamsWithoutLeader: number;
  ownerName: string;
}

export function useAdminCompaniesData() {
  const workspacesQ = useQuery({
    queryKey: ['admin-companies-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, owner_id, is_active, plan_tier, hr_admin_ids, client_account, customer_segment, created_at')
        .order('name');
      if (error) throw error;
      return data as CompanyWorkspace[];
    },
  });

  const teamsQ = useQuery({
    queryKey: ['admin-companies-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, workspace_id, leader_user_id')
        .order('name');
      if (error) throw error;
      return data as CompanyTeam[];
    },
  });

  const membersQ = useQuery({
    queryKey: ['admin-companies-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, email, role, team_id, linked_user_id, work_style_data, skills_data')
        .is('archived_at', null)
        .order('name');
      if (error) throw error;
      return data as CompanyMember[];
    },
  });

  const usersQ = useQuery({
    queryKey: ['admin-companies-users-meta'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users_with_metadata');
      if (error) throw error;
      return (data || []) as UserMeta[];
    },
  });

  const isLoading =
    workspacesQ.isLoading || teamsQ.isLoading || membersQ.isLoading || usersQ.isLoading;

  const userById = useMemo(() => {
    const m = new Map<string, UserMeta>();
    (usersQ.data || []).forEach((u) => m.set(u.user_id, u));
    return m;
  }, [usersQ.data]);

  // Owners that haven't completed Rhitmo leader sync yet (per workspace).
  const ownerSyncCompleted = useMemo(() => {
    const m = new Map<string, boolean>();
    (workspacesQ.data || []).forEach((w) => {
      if (!m.has(w.owner_id)) m.set(w.owner_id, false);
      if (w.leader_sync_completed_at) m.set(w.owner_id, true);
    });
    return m;
  }, [workspacesQ.data]);

  // (owner sync derived above as ownerSyncCompleted)


  const getUserLabel = (userId: string | null | undefined) => {
    if (!userId) return null;
    const u = userById.get(userId);
    return u?.full_name || u?.email || `${userId.slice(0, 8)}…`;
  };

  const healthByWorkspace = useMemo(() => {
    const out = new Map<string, CompanyHealth>();
    (workspacesQ.data || []).forEach((ws) => {
      const wsTeams = (teamsQ.data || []).filter((t) => t.workspace_id === ws.id);
      const wsTeamIds = new Set(wsTeams.map((t) => t.id));
      const wsMembers = (membersQ.data || []).filter((m) => wsTeamIds.has(m.team_id));
      const linked = wsMembers.filter((m) => !!m.linked_user_id).length;
      const synced = wsMembers.filter((m) => !!m.work_style_data).length;
      const withLeader = wsTeams.filter((t) => !!t.leader_user_id).length;
      out.set(ws.id, {
        totalMembers: wsMembers.length,
        totalTeams: wsTeams.length,
        linkedMembers: linked,
        syncedMembers: synced,
        teamsWithLeader: withLeader,
        teamsWithoutLeader: wsTeams.length - withLeader,
        ownerName: getUserLabel(ws.owner_id) || 'Sem owner',
      });
    });
    return out;
  }, [workspacesQ.data, teamsQ.data, membersQ.data, userById]);

  const pendingRows = useMemo<PendingRow[]>(() => {
    const wsById = new Map((workspacesQ.data || []).map((w) => [w.id, w] as const));
    const teamById = new Map((teamsQ.data || []).map((t) => [t.id, t] as const));
    const rows: PendingRow[] = [];

    // Times sem líder
    (teamsQ.data || []).forEach((t) => {
      if (!t.leader_user_id) {
        const ws = wsById.get(t.workspace_id);
        rows.push({
          id: `team:${t.id}`,
          kind: 'team',
          personName: t.name,
          workspaceId: t.workspace_id,
          workspaceName: ws?.name || '—',
          teamId: t.id,
          teamName: t.name,
          pendings: ['team_no_leader'],
        });
      }
    });

    // Líderes sem pesquisa Rhitmo
    const leaderIds = new Set(
      (teamsQ.data || []).map((t) => t.leader_user_id).filter(Boolean) as string[],
    );
    leaderIds.forEach((leaderId) => {
      const completed = leaderSyncByUser.get(leaderId);
      if (!completed) {
        const ws = (workspacesQ.data || []).find((w) =>
          (teamsQ.data || []).some((t) => t.workspace_id === w.id && t.leader_user_id === leaderId),
        );
        const team = (teamsQ.data || []).find((t) => t.leader_user_id === leaderId);
        rows.push({
          id: `leader:${leaderId}`,
          kind: 'leader',
          personName: getUserLabel(leaderId) || '—',
          email: userById.get(leaderId)?.email,
          workspaceId: ws?.id || '',
          workspaceName: ws?.name || '—',
          teamId: team?.id,
          teamName: team?.name,
          role: 'Líder',
          pendings: ['rhitmo_sync_leader'],
        });
      }
    });

    // Membros com pendências
    (membersQ.data || []).forEach((m) => {
      const team = teamById.get(m.team_id);
      const ws = team ? wsById.get(team.workspace_id) : null;
      const pendings: PendingType[] = [];
      if (!m.linked_user_id) pendings.push('no_account');
      if (m.linked_user_id && !m.work_style_data) pendings.push('rhitmo_sync_member');
      if (pendings.length === 0) return;
      rows.push({
        id: `member:${m.id}`,
        kind: 'member',
        personName: m.name,
        email: m.email,
        workspaceId: ws?.id || '',
        workspaceName: ws?.name || '—',
        teamId: team?.id,
        teamName: team?.name,
        role: m.role,
        pendings,
      });
    });

    return rows;
  }, [workspacesQ.data, teamsQ.data, membersQ.data, leaderSyncByUser, userById]);

  return {
    workspaces: workspacesQ.data || [],
    teams: teamsQ.data || [],
    members: membersQ.data || [],
    users: usersQ.data || [],
    userById,
    getUserLabel,
    healthByWorkspace,
    pendingRows,
    isLoading,
  };
}

export const PENDING_LABEL: Record<PendingType, string> = {
  no_account: 'Sem conta',
  rhitmo_sync_member: 'Rhitmo Sync pendente',
  rhitmo_sync_leader: 'Pesquisa Rhitmo pendente',
  team_no_leader: 'Time sem líder',
  workspace_mismatch: 'Workspace inconsistente',
};
