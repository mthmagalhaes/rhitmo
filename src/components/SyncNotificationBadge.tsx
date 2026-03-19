import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface SyncNotificationBadgeProps {
  onClick: () => void;
}

export function SyncNotificationBadge({ onClick }: SyncNotificationBadgeProps) {
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['sync-notifications-unread'],
    queryFn: async () => {
      const { count } = await supabase
        .from('rhitmo_sync_notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null);
      return count || 0;
    },
    refetchInterval: 30000,
  });

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent"
      onClick={onClick}
      title="Notificações de Rhitmo Sync"
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
