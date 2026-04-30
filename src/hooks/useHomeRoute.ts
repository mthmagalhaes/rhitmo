import { useAccount } from '@/contexts/AccountContext';
import { getHomeRoute, LEADER_HOME } from '@/lib/navigation';

/**
 * Returns the persona-aware home route for the current authenticated user.
 * Falls back to the leader home while the account context is loading
 * (the DirectReportGuard upstream will redirect again if needed).
 */
export function useHomeRoute(): string {
  const { isLinkedMember, isLeader, isHRAdmin, loading } = useAccount();
  if (loading) return LEADER_HOME;
  return getHomeRoute({ isLinkedMember, isLeader, isHRAdmin });
}
