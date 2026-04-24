import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Loader2 } from 'lucide-react';

interface DirectReportGuardProps {
  children: React.ReactNode;
}

function readPersona(): 'leader' | 'hr_admin' | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem('signup_persona');
    return v === 'leader' || v === 'hr_admin' ? v : null;
  } catch {
    return null;
  }
}

export function DirectReportGuard({ children }: DirectReportGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLinkedMember, needsOnboarding, loading } = useAccount();
  // isAdmin is false during impersonation by design — that lets the admin
  // navigate the regular app while impersonating without being kicked back.
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [persona, setPersona] = useState<'leader' | 'hr_admin' | null>(() => readPersona());

  useEffect(() => {
    if (location.pathname === '/onboarding') return;
    // Super admin (not impersonating) should never see the leader dashboard
    if (!adminLoading && isAdmin) {
      navigate('/admin', { replace: true });
      return;
    }
    if (!loading && isLinkedMember && needsOnboarding) {
      navigate('/onboarding', { replace: true });
    }
  }, [loading, adminLoading, isAdmin, isLinkedMember, needsOnboarding, location.pathname, navigate]);

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
