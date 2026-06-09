import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Loader2 } from 'lucide-react';
import { getHomeRoute } from '@/lib/navigation';
import { useActiveMode } from '@/hooks/useActiveMode';

interface DirectReportGuardProps {
  children: React.ReactNode;
}

export function DirectReportGuard({ children }: DirectReportGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLinkedMember, isLeader, isHRAdmin, isWorkspaceOwner, isTeamLeader, needsOnboarding, loading } = useAccount();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { mode: activeMode } = useActiveMode();

  useEffect(() => {
    if (location.pathname === '/onboarding') return;

    // Super admin (not impersonating) → /admin
    if (!adminLoading && isAdmin) {
      navigate('/admin', { replace: true });
      return;
    }

    if (loading) return;

    // Linked members needing onboarding go through wizard.
    if (isLinkedMember && needsOnboarding) {
      navigate('/onboarding', { replace: true });
      return;
    }

    // Smart redirect from legacy /dashboard → role-based home.
    if (location.pathname === '/dashboard') {
      navigate(
        getHomeRoute({ isLinkedMember, isLeader, isHRAdmin, isWorkspaceOwner, isTeamLeader, activeMode }),
        { replace: true },
      );
    }
  }, [
    loading,
    adminLoading,
    isAdmin,
    isLinkedMember,
    isLeader,
    isHRAdmin,
    isWorkspaceOwner,
    needsOnboarding,
    location.pathname,
    navigate,
  ]);

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm mx-auto px-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (isAdmin) return null;

  return <>{children}</>;
}
