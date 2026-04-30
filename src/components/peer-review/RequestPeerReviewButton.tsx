// Sprint 10.3 — Botão trigger reutilizável que abre o RequestPeerReviewModal.
import { useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequestPeerReviewModal } from './RequestPeerReviewModal';
import { cn } from '@/lib/utils';

interface RequestPeerReviewButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  label?: string;
}

export function RequestPeerReviewButton({
  variant = 'outline',
  size = 'sm',
  className,
  label = 'Solicitar avaliação de pares',
}: RequestPeerReviewButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={cn('rounded-xl gap-2', className)}
      >
        <Users className="h-4 w-4" />
        {label}
      </Button>
      <RequestPeerReviewModal open={open} onOpenChange={setOpen} />
    </>
  );
}
