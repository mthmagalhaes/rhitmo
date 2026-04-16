import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation } from '@/hooks/useImpersonation';

export type AccountRole = 'hr_admin' | 'leader' | 'user';

interface AccountContextValue {
  /** Resolved workspace id, or null if none found */
  workspaceId: string | null;
  /** True while any account query is still loading */
  loading: boolean;
  /** True if workspace query returned an error (e.g. RLS failure) */
  hasError: boolean;
  /** Resolved role */
  role: AccountRole;
  isHRAdmin: boolean;
  isLeader: boolean;
  isUser: boolean;
  /** Linked member data (null if user is a leader/owner) */
  linkedMember: LinkedMemberData | null;
  isLinkedMember: boolean;
  needsOnboarding: boolean;
  /** Whether an invited member with matching email is pending link */
  hasPendingInviteByEmail: boolean;
  /** Refetch workspace (e.g. after onboarding completes) */
  refetchWorkspace: () => void;
}

interface LinkedMemberData {
  id: string;
  name: string;
  email: string | null;
  role: string;
  skills_data: {
    onboarding_completed?: boolean;
    role_tenure?: string;
    responsibilities?: string[];
    aspirations?: string;
    interests?: string[];
    completed_at?: string;
    ai_analysis?: {
      alignment_score: number;
      analysis_summary: string;
      key_gaps: string[];
      suggested_focus: string[];
      analyzed_at?: string;
    };
  } | null;
  work_style_data?: Record<string, unknown> | null;
  chronotype?: string | null;
  feedback_style?: string | null;
  recognition_style?: string | null;
  motivators?: unknown[] | null;
  user_manual?: Record<string, unknown> | null;
  updated_at?: string;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used within AccountProvider');
  return ctx;
}

/**
 * Ensures an active Supabase session exists before running RLS-dependent queries.
 * Throws to trigger react-query retry if session isn't ready yet.
 */
async function ensureSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No active session — will retry');
  return session;
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const enabled = !!user && !authLoading;

  // ── 1. Resolve workspace ──────────────────────────────────────────
  const {
    data: workspace,
    isLoading: workspaceLoading,
    error: workspaceError,
    refetch: refetchWorkspace,
  } = useQuery({
    queryKey: ['account-workspace', user?.id],
    queryFn: async () => {
      await ensureSession();

      // Check owned workspace
      const { data: owned, error: ownedErr } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user!.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (ownedErr) console.warn('[Account] owned ws error:', ownedErr.message);
      if (owned) return owned;

      // Check team leader → workspace
      const { data: leaderTeam } = await supabase
        .from('teams')
        .select('workspace_id')
        .eq('leader_user_id', user!.id)
        .limit(1)
        .maybeSingle();
      if (leaderTeam?.workspace_id) {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('id')
          .eq('id', leaderTeam.workspace_id)
          .eq('is_active', true)
          .maybeSingle();
        return ws;
      }
      return null;
    },
    enabled,
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  // ── 2. Resolve role ───────────────────────────────────────────────
  const { data: resolvedRole, isLoading: roleLoading } = useQuery({
    queryKey: ['account-role', user?.id],
    queryFn: async (): Promise<AccountRole> => {
      await ensureSession();

      const [hrResult, ownerResult, teamLeaderResult] = await Promise.all([
        supabase.from('workspaces').select('id').contains('hr_admin_ids', [user!.id]).limit(1).maybeSingle(),
        supabase.from('workspaces').select('id').eq('owner_id', user!.id).eq('is_active', true).limit(1).maybeSingle(),
        supabase.from('teams').select('id').eq('leader_user_id', user!.id).limit(1).maybeSingle(),
      ]);

      if (hrResult.error && ownerResult.error && teamLeaderResult.error) {
        throw new Error('All role-check queries failed');
      }

      if (hrResult.data) return 'hr_admin';
      if (ownerResult.data || teamLeaderResult.data) return 'leader';
      return 'user';
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  // ── 3. Resolve linked member ──────────────────────────────────────
  const isLeaderOrOwner = resolvedRole === 'hr_admin' || resolvedRole === 'leader';
  const { data: linkedMember, isLoading: linkedLoading } = useQuery({
    queryKey: ['account-linked-member', user?.id],
    queryFn: async (): Promise<LinkedMemberData | null> => {
      await ensureSession();

      // Leaders/owners are never linked members
      const [ownerCheck, leaderCheck] = await Promise.all([
        supabase.from('workspaces').select('id').eq('owner_id', user!.id).eq('is_active', true).limit(1).maybeSingle(),
        supabase.from('teams').select('id').eq('leader_user_id', user!.id).limit(1).maybeSingle(),
      ]);
      if (ownerCheck.data || leaderCheck.data) return null;

      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, email, role, skills_data, work_style_data, chronotype, feedback_style, recognition_style, motivators, user_manual, updated_at')
        .eq('linked_user_id', user!.id)
        .eq('invite_status', 'accepted')
        .maybeSingle();
      if (error) { console.error('[Account] linked member error:', error); return null; }
      return data as LinkedMemberData | null;
    },
    enabled: enabled && !roleLoading,
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  // ── 4. Check pending invite by email ──────────────────────────────
  const { data: hasPendingInviteByEmail, isLoading: pendingLoading } = useQuery({
    queryKey: ['account-pending-invite', user?.email],
    queryFn: async () => {
      if (!user?.email) return false;
      const { data } = await supabase
        .from('team_members')
        .select('id')
        .eq('email', user.email)
        .eq('invite_status', 'pending')
        .is('linked_user_id', null)
        .maybeSingle();
      return !!data;
    },
    enabled: enabled && !linkedMember,
    staleTime: 30_000,
  });

  // ── Derived state ─────────────────────────────────────────────────
  const loading = authLoading || workspaceLoading || roleLoading || linkedLoading || pendingLoading;

  const value = useMemo<AccountContextValue>(() => {
    const role: AccountRole = loading ? 'leader' : (resolvedRole ?? 'user');
    return {
      workspaceId: workspace?.id ?? null,
      loading,
      hasError: !!workspaceError,
      role,
      isHRAdmin: !loading && role === 'hr_admin',
      isLeader: loading || role === 'leader' || role === 'hr_admin',
      isUser: !loading && role === 'user',
      linkedMember: linkedMember ?? null,
      isLinkedMember: !!linkedMember,
      needsOnboarding: !!linkedMember && !linkedMember.skills_data?.onboarding_completed,
      hasPendingInviteByEmail: !!hasPendingInviteByEmail,
      refetchWorkspace: () => refetchWorkspace(),
    };
  }, [loading, resolvedRole, workspace, workspaceError, linkedMember, hasPendingInviteByEmail, refetchWorkspace]);

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
}
