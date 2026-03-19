import { Bell, Check, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface SyncNotification {
  id: string;
  member_id: string;
  change_summary: string;
  changes: Record<string, { before: unknown; after: unknown }>;
  read_at: string | null;
  created_at: string;
  team_members: { name: string } | null;
}

const FIELD_LABELS: Record<string, string> = {
  chronotype: 'Cronotipo',
  feedback_style: 'Estilo de feedback',
  recognition_style: 'Estilo de reconhecimento',
  work_style_data: 'Estilo de trabalho',
  motivators: 'Motivadores',
  user_manual: 'Manual de instruções',
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(vazio)';
  if (typeof value === 'string') return value || '(vazio)';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function SyncNotificationSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['sync-notifications-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('rhitmo_sync_notifications')
        .select('id, member_id, change_summary, changes, read_at, created_at, team_members(name)')
        .order('created_at', { ascending: false })
        .limit(30);
      return (data as unknown as SyncNotification[]) || [];
    },
    enabled: open,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sync-notifications-list'] });
    queryClient.invalidateQueries({ queryKey: ['sync-notifications-unread'] });
  };

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from('rhitmo_sync_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
    },
    onSuccess: invalidate,
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('rhitmo_sync_notifications')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null);
    },
    onSuccess: invalidate,
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-primary" />
              Atualizações de Rhitmo Sync
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => markAllAsRead.mutate()}
              >
                <Check className="h-3 w-3" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
          <SheetDescription className="text-xs">
            Mudanças no perfil comportamental dos seus liderados
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma atualização ainda</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-6 py-4 transition-colors ${
                    !n.read_at
                      ? 'bg-accent/40'
                      : 'bg-background'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {n.team_members?.name || 'Membro'}
                        </p>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(n.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Atualizou: {n.change_summary}
                      </p>

                      {/* Expandable diff */}
                      <details className="mt-2">
                        <summary className="text-xs text-primary cursor-pointer hover:underline">
                          Ver mudanças
                        </summary>
                        <div className="mt-2 space-y-2 text-xs">
                          {Object.entries(n.changes).map(([field, change]) => (
                            <div
                              key={field}
                              className="rounded-lg bg-muted/50 p-2"
                            >
                              <p className="font-medium text-foreground mb-1">
                                {FIELD_LABELS[field] || field}
                              </p>
                              <div className="text-muted-foreground space-y-0.5">
                                <p>
                                  <span className="line-through opacity-60">
                                    {formatValue(change.before)}
                                  </span>
                                </p>
                                <p className="text-primary font-medium">
                                  → {formatValue(change.after)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>

                      {!n.read_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1 mt-2 h-7 px-2"
                          onClick={() => markAsRead.mutate(n.id)}
                        >
                          <Check className="h-3 w-3" />
                          Marcar como lida
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
