// Sprint 12 — Shared hook used by Master-Detail leader pages
// (1:1s, Diário, Objetivos) and the legacy MembersGrid. Returns the workspace,
// teams and members visible to the current effective user, plus the last
// feedback date per member.
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import type { Workspace, Team } from '@/types/team';

export interface LeaderMemberRow {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
  performance_score: number;
  created_at: string;
  feedback_count: number;
  last_feedback_date: string;
  team_id?: string | null;
  email?: string | null;
  linked_user_id?: string | null;
  invite_status?: string | null;
  invite_token?: string | null;
  archived_at?: string | null;
  archived_by?: string | null;
}

export interface UseLeaderMembersOptions {
  /** When true, includes soft-archived members in the result. Default: false. */
  includeArchived?: boolean;
}

// ── Query factories compartilhadas ──────────────────────────────────────────
// Exportadas para que o prefetch de rota (hover no menu) use exatamente as
// mesmas chaves e funções do hook — sem duplicar lógica nem chave de cache.
const LEADER_STALE_TIME = 5 * 60_000;

export function leaderWorkspaceQuery(effectiveUserId: string | null | undefined) {
  return {
    queryKey: ['workspace-leader-scope', effectiveUserId] as const,
    queryFn: async () => {
      if (!effectiveUserId) return null;
      const { data: leaderTeam } = await supabase
        .from('teams')
        .select('workspace_id')
        .eq('leader_user_id', effectiveUserId)
        .limit(1)
        .maybeSingle();
      if (!leaderTeam?.workspace_id) return null;
      const { data: ws } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', leaderTeam.workspace_id)
        .eq('is_active', true)
        .maybeSingle();
      return (ws as Workspace | null) ?? null;
    },
    staleTime: LEADER_STALE_TIME,
  };
}

export function leaderTeamsQuery(
  workspaceId: string | null | undefined,
  effectiveUserId: string | null | undefined,
) {
  return {
    queryKey: ['teams-leader-scope', workspaceId, effectiveUserId] as const,
    queryFn: async () => {
      if (!workspaceId || !effectiveUserId) return [] as Team[];
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('leader_user_id', effectiveUserId)
        .order('name');
      if (error) throw error;
      return (data ?? []) as Team[];
    },
    staleTime: LEADER_STALE_TIME,
  };
}

export function leaderMembersQuery(
  workspaceId: string | null | undefined,
  teamIds: string[],
  effectiveUserId: string | null | undefined,
  includeArchived: boolean,
) {
  return {
    queryKey: ['team-members-leader-scope', workspaceId, teamIds, includeArchived] as const,
    queryFn: async () => {
      if (!workspaceId || teamIds.length === 0) return [] as LeaderMemberRow[];
      // Defense-in-depth: inner-join + re-filter por leader_user_id.
      // A RLS de team_members libera leitura para Owners/HR Admins do workspace
      // (rls_check_member_read_access), então .in('team_id', teamIds) por si só
      // não é suficiente — precisamos amarrar ao mesmo predicado da seleção de
      // teams acima, garantindo que nenhum cache stale ou bug futuro vaze
      // liderados de outros líderes para alguém que também é Owner.
      let q = supabase
        .from('team_members')
        .select('*, teams!inner(leader_user_id)')
        .in('team_id', teamIds)
        .eq('teams.leader_user_id', effectiveUserId);
      if (!includeArchived) {
        q = q.is('archived_at', null);
      }
      const { data: rows, error } = await q.order('name');
      if (error) throw error;
      const ids = (rows ?? []).map((m: { id: string }) => m.id);
      const { data: feedbacks } = await supabase
        .from('feedbacks')
        .select('member_id, created_at')
        .in('member_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      return (rows ?? []).map((m: any) => {
        const fb = (feedbacks ?? []).filter((f) => f.member_id === m.id);
        const last = fb.length
          ? fb.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )[0].created_at
          : m.created_at;
        return {
          ...m,
          feedback_count: fb.length,
          last_feedback_date: last,
        } as LeaderMemberRow;
      });
    },
    staleTime: LEADER_STALE_TIME,
  };
}

export function useLeaderMembers(opts: UseLeaderMembersOptions = {}) {
  const { includeArchived = false } = opts;
  const { id: effectiveUserId } = useEffectiveUser();

  // Leader-only scope: resolve workspace strictly via teams.leader_user_id.
  // Owners that don't lead any team see an empty /lider/* view here —
  // full workspace visibility lives in /workspace/* (HRAdminGuard).
  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    ...leaderWorkspaceQuery(effectiveUserId),
    enabled: !!effectiveUserId,
    placeholderData: keepPreviousData,
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    ...leaderTeamsQuery(workspace?.id, effectiveUserId),
    enabled: !!workspace && !!effectiveUserId,
    placeholderData: keepPreviousData,
  });

  const teamIds = teams.map((t) => t.id);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    ...leaderMembersQuery(workspace?.id, teamIds, effectiveUserId, includeArchived),
    enabled: !!workspace && teamIds.length > 0,
    placeholderData: keepPreviousData,
  });

  return {
    workspace: workspace ?? null,
    teams,
    members,
    isLoading: workspaceLoading || teamsLoading || membersLoading,
  };
}

