import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation } from '@/hooks/useImpersonation';
import { trackFunnel } from '@/lib/analytics';

export type AccountRole = 'hr_admin' | 'leader' | 'user';

interface AccountContextValue {
  workspaceId: string | null;
  loading: boolean;
  hasError: boolean;
  isLoadingDelayed: boolean;
  isSlowLoad: boolean;
  role: AccountRole;
  isHRAdmin: boolean;
  isWorkspaceOwner: boolean;
  isLeader: boolean;
  isTeamLeader: boolean;
  isUser: boolean;
  linkedMember: LinkedMemberData | null;
  isLinkedMember: boolean;
  needsOnboarding: boolean;
  hasPendingInviteByEmail: boolean;
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

interface AccountContextRPCResult {
  workspace_id: string | null;
  role: AccountRole;
  is_workspace_owner?: boolean;
  is_team_leader?: boolean;
  linked_member: LinkedMemberData | null;
  has_pending_invite: boolean;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used within AccountProvider');
  return ctx;
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isImpersonating, impersonatedUserId, impersonatedEmail, isLoading: impersonationLoading } = useImpersonation();

  const effectiveUserId = isImpersonating && impersonatedUserId ? impersonatedUserId : user?.id ?? null;
  const effectiveEmail = isImpersonating && impersonatedEmail ? impersonatedEmail : user?.email ?? null;
  const enabled = !!effectiveUserId && !authLoading && !impersonationLoading;

  // ── Single consolidated query (replaces 4 parallel queries) ──
  const {
    data,
    isLoading: contextLoading,
    error: contextError,
    refetch,
  } = useQuery({
    queryKey: ['account-context', effectiveUserId, effectiveEmail],
    queryFn: async (): Promise<AccountContextRPCResult> => {
      const { data, error } = await supabase.rpc('get_account_context', {
        p_user_id: effectiveUserId!,
        p_user_email: effectiveEmail,
      });
      if (error) throw error;
      return data as unknown as AccountContextRPCResult;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // role/workspace rarely change within a session
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 2000),
    refetchOnWindowFocus: false,
  });

  const loading = authLoading || impersonationLoading || contextLoading;

  // Two-level escalation: at 3s show inline banner, at 8s escalate to
  // full-screen <AccountLoadingSlow />. Avoids "stuck spinner" perception.
  const [isLoadingDelayed, setIsLoadingDelayed] = useState(false);
  const [isSlowLoad, setIsSlowLoad] = useState(false);
  useEffect(() => {
    if (!loading) {
      setIsLoadingDelayed(false);
      setIsSlowLoad(false);
      return;
    }
    const t1 = window.setTimeout(() => {
      setIsLoadingDelayed(true);
      trackFunnel('account_load_delayed');
    }, 3000);
    const t2 = window.setTimeout(() => {
      setIsSlowLoad(true);
      trackFunnel('account_load_slow');
    }, 8000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [loading]);

  // Telemetry on hard error
  useEffect(() => {
    if (contextError) trackFunnel('account_load_failed', { payload: { message: String(contextError) } });
  }, [contextError]);

  const value = useMemo<AccountContextValue>(() => {
    const role: AccountRole = loading ? 'leader' : (data?.role ?? 'user');
    const linkedMember = data?.linked_member ?? null;
    return {
      workspaceId: data?.workspace_id ?? null,
      loading,
      hasError: !!contextError,
      isLoadingDelayed,
      isSlowLoad,
      role,
      isHRAdmin: !loading && role === 'hr_admin',
      isWorkspaceOwner: !loading && !!data?.is_workspace_owner,
      isLeader: loading || role === 'leader' || role === 'hr_admin',
      isUser: !loading && role === 'user',
      linkedMember,
      isLinkedMember: !!linkedMember,
      needsOnboarding: !!linkedMember && !linkedMember.skills_data?.onboarding_completed,
      hasPendingInviteByEmail: !!data?.has_pending_invite,
      refetchWorkspace: () => refetch(),
    };
  }, [loading, data, contextError, refetch, isLoadingDelayed, isSlowLoad]);

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
}
