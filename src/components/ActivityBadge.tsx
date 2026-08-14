import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useLinkedMember } from '@/hooks/useLinkedMember';

interface ActivityBadgeProps {
  onClick: () => void;
}

export function ActivityBadge({ onClick }: ActivityBadgeProps) {
  const { isLinkedMember } = useLinkedMember();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['activity-unread-count', isLinkedMember],
    queryFn: async () => {
      if (isLinkedMember) {
        // Direct reports: placeholder — 0 for now
        return 0;
      }

      // Leaders: count unread sync notifications + undismissed nudges
      const [syncResult, nudgesResult] = await Promise.all([
        supabase
          .from('rhitmo_sync_notifications')
          .select('*', { count: 'exact', head: true })
          .is('read_at', null),
        supabase
          .from('leader_nudges')
          .select('*', { count: 'exact', head: true })
          .is('dismissed_at', null),
      ]);

      return (syncResult.count || 0) + (nudgesResult.count || 0);
    },
    refetchInterval: 180_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  return (
    <Button
      variant="ghost"
      size="icon" aria-label="Abrir notificações"
      className="relative h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent"
      onClick={onClick}
      title="Atividade"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );
}
