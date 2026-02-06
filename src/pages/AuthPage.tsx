import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Auth } from '@/components/Auth';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const AuthPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read URL params
  const mode = searchParams.get('mode') as 'login' | 'signup' | null;
  const emailParam = searchParams.get('email');

  // Detect invite flow
  const hasPendingInvite = typeof window !== 'undefined' && !!sessionStorage.getItem('pending_invite');
  const isInviteFlow = hasPendingInvite || mode === 'signup';

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return null;

  return (
    <Auth 
      defaultMode={isInviteFlow ? 'signup' : 'login'}
      defaultEmail={emailParam || undefined}
      isInviteFlow={isInviteFlow}
    />
  );
};

export default AuthPage;
