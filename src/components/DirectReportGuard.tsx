import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { Loader2 } from 'lucide-react';

interface DirectReportGuardProps {
  children: React.ReactNode;
}

export function DirectReportGuard({ children }: DirectReportGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLinkedMember, needsOnboarding, loading } = useAccount();

  useEffect(() => {
    if (location.pathname === '/onboarding') return;
    if (!loading && isLinkedMember && needsOnboarding) {
      navigate('/onboarding', { replace: true });
    }
  }, [loading, isLinkedMember, needsOnboarding, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
