// Sprint 9.2 — Botão trigger reutilizável que abre o SendPulseModal.
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SendPulseModal } from './SendPulseModal';
import { cn } from '@/lib/utils';

interface SendPulseButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  label?: string;
}

export function SendPulseButton({
  variant = 'default',
  size = 'sm',
  className,
  label = 'Enviar Pulse',
}: SendPulseButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={cn('rounded-xl gap-2', className)}
      >
        <Sparkles className="h-4 w-4" />
        {label}
      </Button>
      <SendPulseModal open={open} onOpenChange={setOpen} />
    </>
  );
}
