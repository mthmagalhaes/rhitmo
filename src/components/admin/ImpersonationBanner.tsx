import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useImpersonation } from '@/hooks/useImpersonation';

export const ImpersonationBanner = () => {
  const { isImpersonating, impersonatedEmail, stopImpersonation } = useImpersonation();

  if (!isImpersonating) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-yellow-500 px-4 py-2 text-yellow-950 text-sm font-medium">
      <Eye className="h-4 w-4" />
      <span>Visualizando como: <strong>{impersonatedEmail}</strong></span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 border-yellow-700 bg-yellow-600 text-yellow-950 hover:bg-yellow-700 ml-2"
        onClick={stopImpersonation}
      >
        <X className="h-3 w-3 mr-1" />
        Encerrar
      </Button>
    </div>
  );
};
