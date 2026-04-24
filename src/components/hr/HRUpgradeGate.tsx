import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HRUpgradeGateProps {
  title: string;
  description: string;
}

export function HRUpgradeGate({ title, description }: HRUpgradeGateProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-card rounded-3xl border shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-8 text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            Recurso Enterprise
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
        <Button className="rounded-xl" onClick={() => navigate('/enterprise')}>
          Conhecer upgrade Enterprise
        </Button>
      </div>
    </div>
  );
}
