import { Navigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { Loader2 } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard = ({ children }: AdminGuardProps) => {
  // Use isRealAdmin so admin can still access /admin even while impersonating
  // (e.g. to stop impersonation). isAdmin is false during impersonation by design.
  const { isRealAdmin, loading } = useAdmin();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isRealAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
