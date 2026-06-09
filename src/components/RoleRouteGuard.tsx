import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAccount } from '@/contexts/AccountContext';
import { useActiveMode } from '@/hooks/useActiveMode';
import { resolvePersona, getHomeRoute } from '@/lib/navigation';

interface Props {
  /** Which persona the route tree is intended for. */
  expects: 'leader' | 'direct_report';
  children: React.ReactNode;
}

/**
 * Guards a subtree of routes by persona. If the resolved persona doesn't match
 * the expected one, redirects to the persona's home route.
 *
 * Note: super-admin / impersonation flows are handled upstream by AdminGuard
 * and DirectReportGuard. This guard runs only for already-authenticated users.
 *
 * HR Admins (non-owner) resolve to persona='hr_admin' and are redirected to /hr
 * if they hit a /lider/* route directly. Owners that are also HR Admins keep
 * persona='leader' and can still browse /lider/*.
 */
export function RoleRouteGuard({ expects, children }: Props) {
  const { loading, isLeader, isHRAdmin, isLinkedMember, isWorkspaceOwner } = useAccount();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const persona = resolvePersona({ isLinkedMember, isLeader, isHRAdmin, isWorkspaceOwner });

  if (persona !== expects) {
    const target = getHomeRoute({ isLinkedMember, isLeader, isHRAdmin, isWorkspaceOwner });
    if (location.pathname !== target) {
      return <Navigate to={target} replace />;
    }
  }

  return <>{children}</>;
}
