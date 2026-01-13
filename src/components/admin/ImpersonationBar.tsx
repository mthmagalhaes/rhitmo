import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export function ImpersonationBar() {
  const { impersonatedUser, isImpersonating, stopImpersonation, loading } = useImpersonation();

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground py-2 px-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">
            View Mode: Visualizando como <strong>{impersonatedUser.email}</strong>
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={stopImpersonation}
          disabled={loading}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Exit View Mode
        </Button>
      </div>
    </div>
  );
}
