import { useState } from 'react';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, X } from 'lucide-react';

interface LeaderSyncReminderProps {
  leaderSyncCompletedAt: string | null;
  onUpdate: () => void;
}

export function LeaderSyncReminder({ leaderSyncCompletedAt, onUpdate }: LeaderSyncReminderProps) {
  const [dismissed, setDismissed] = useState(() => {
    const until = localStorage.getItem('leader_sync_dismiss_until');
    if (until && new Date(until) > new Date()) return true;
    return false;
  });

  if (!leaderSyncCompletedAt || dismissed) return null;

  const daysSince = differenceInDays(new Date(), new Date(leaderSyncCompletedAt));
  if (daysSince < 180) return null;

  const handleDismiss = () => {
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 30);
    localStorage.setItem('leader_sync_dismiss_until', dismissUntil.toISOString());
    setDismissed(true);
  };

  return (
    <Card className="border-primary/20 bg-primary/5 p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Seu perfil de liderança foi preenchido há {Math.floor(daysSince / 30)} meses. 
            Que tal revisá-lo? Você provavelmente cresceu bastante desde então 💪
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={onUpdate} className="rounded-full gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar agora
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Agora não</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
