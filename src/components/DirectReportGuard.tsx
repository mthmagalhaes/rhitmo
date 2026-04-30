import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Loader2 } from 'lucide-react';
import { LEADER_HOME, DIRECT_REPORT_HOME, resolvePersona } from '@/lib/navigation';

interface DirectReportGuardProps {
  children: React.ReactNode;
}

export function DirectReportGuard({ children }: DirectReportGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLinkedMember, isLeader, isHRAdmin, needsOnboarding, loading } = useAccount();
  const { isAdmin, loading: adminLoading } = useAdmin();

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
      const persona = resolvePersona({ isLinkedMember, isLeader, isHRAdmin });
      navigate(persona === 'leader' ? LEADER_HOME : DIRECT_REPORT_HOME, { replace: true });
    }
  }, [
    loading,
    adminLoading,
    isAdmin,
    isLinkedMember,
    isLeader,
    isHRAdmin,
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
