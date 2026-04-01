import { useState } from 'react';
import { Bell, Check, User, Lightbulb, AlertTriangle, AlertCircle, ArrowRight, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLinkedMember } from '@/hooks/useLinkedMember';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

// ── Types ──

interface SyncNotification {
  id: string;
  member_id: string;
  change_summary: string;
  changes: Record<string, { before: unknown; after: unknown }>;
  read_at: string | null;
  created_at: string;
  team_members: { name: string } | null;
}

interface Nudge {
  id: string;
  message: string;
  action_url: string | null;
  severity: string;
  nudge_type: string;
  created_at: string;
  dismissed_at: string | null;
}

type ActivityItem =
  | { kind: 'sync'; data: SyncNotification }
  | { kind: 'nudge'; data: Nudge };

// ── Helpers ──

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

const nudgeIcon: Record<string, { Icon: typeof Bell; className: string }> = {
  urgent: { Icon: AlertCircle, className: 'text-destructive' },
  warning: { Icon: AlertTriangle, className: 'text-amber-500' },
  info: { Icon: Lightbulb, className: 'text-primary' },
};

const nudgeBorder: Record<string, string> = {
  urgent: 'border-l-destructive',
  warning: 'border-l-amber-500',
  info: 'border-l-primary/50',
};

// ── Component ──

export function ActivitySheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isLinkedMember } = useLinkedMember();
  const [tab, setTab] = useState('all');

  // ── Queries (leaders only for now) ──

  const { data: syncNotifications = [] } = useQuery({
    queryKey: ['activity-sync-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('rhitmo_sync_notifications')
        .select('id, member_id, change_summary, changes, read_at, created_at, team_members(name)')
        .order('created_at', { ascending: false })
        .limit(30);
      return (data as unknown as SyncNotification[]) || [];
    },
    enabled: open && !isLinkedMember,
  });

  const { data: nudges = [] } = useQuery({
    queryKey: ['activity-nudges-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leader_nudges')
        .select('id, message, action_url, severity, nudge_type, created_at, dismissed_at')
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(30);
      return (data as Nudge[]) || [];
    },
    enabled: open && !isLinkedMember,
  });

  // ── Merge into unified timeline ──

  const allItems: ActivityItem[] = [
    ...syncNotifications.map((s) => ({ kind: 'sync' as const, data: s })),
    ...nudges.map((n) => ({ kind: 'nudge' as const, data: n })),
  ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime());

  const filteredItems = allItems.filter((item) => {
    if (tab === 'all') return true;
    if (tab === 'alerts') return item.kind === 'nudge';
    if (tab === 'profile') return item.kind === 'sync';
    return true;
  });

  // ── Mutations ──

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['activity-sync-list'] });
    queryClient.invalidateQueries({ queryKey: ['activity-nudges-list'] });
    queryClient.invalidateQueries({ queryKey: ['activity-unread-count'] });
  };

  const markSyncRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from('rhitmo_sync_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
    },
    onSuccess: invalidateAll,
  });

  const markAllSyncRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('rhitmo_sync_notifications')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null);
    },
    onSuccess: invalidateAll,
  });

  const dismissNudge = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from('leader_nudges')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', id);
    },
    onSuccess: invalidateAll,
  });

  const dismissAllNudges = useMutation({
    mutationFn: async () => {
      await supabase
        .from('leader_nudges')
        .update({ dismissed_at: new Date().toISOString() })
        .is('dismissed_at', null);
    },
    onSuccess: invalidateAll,
  });

  const handleMarkAllRead = () => {
    markAllSyncRead.mutate();
    dismissAllNudges.mutate();
  };

  const unreadCount =
    syncNotifications.filter((n) => !n.read_at).length + nudges.length;

  // ── Render helpers ──

  function renderNudgeItem(nudge: Nudge) {
    const config = nudgeIcon[nudge.severity] || nudgeIcon.info;
    const border = nudgeBorder[nudge.severity] || nudgeBorder.info;
    const { Icon } = config;

    return (
      <div
        key={nudge.id}
        className={`px-6 py-4 bg-accent/40 border-l-4 ${border}`}
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ${config.className}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-foreground line-clamp-2">{nudge.message}</p>
              <div className="flex items-center gap-1 shrink-0">
                {nudge.action_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 h-7 px-2 text-primary"
                    onClick={() => {
                      navigate(nudge.action_url!);
                      dismissNudge.mutate(nudge.id);
                      onOpenChange(false);
                    }}
                  >
                    Ver
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => dismissNudge.mutate(nudge.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(nudge.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  function renderSyncItem(n: SyncNotification) {
    return (
      <div
        key={n.id}
        className={`px-6 py-4 transition-colors ${!n.read_at ? 'bg-accent/40' : 'bg-background'}`}
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

            <details className="mt-2">
              <summary className="text-xs text-primary cursor-pointer hover:underline">
                Ver mudanças
              </summary>
              <div className="mt-2 space-y-2 text-xs">
                {Object.entries(n.changes).map(([field, change]) => (
                  <div key={field} className="rounded-lg bg-muted/50 p-2">
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
                onClick={() => markSyncRead.mutate(n.id)}
              >
                <Check className="h-3 w-3" />
                Marcar como lida
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ──

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-primary" />
              Atividade
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={handleMarkAllRead}
              >
                <Check className="h-3 w-3" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
          <SheetDescription className="text-xs">
            Notificações e atualizações recentes
          </SheetDescription>

          {/* Tab filters — leaders */}
          {!isLinkedMember && (
            <Tabs value={tab} onValueChange={setTab} className="mt-3">
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3 h-6">
                  Todas
                </TabsTrigger>
                <TabsTrigger value="alerts" className="text-xs px-3 h-6">
                  Alertas
                </TabsTrigger>
                <TabsTrigger value="profile" className="text-xs px-3 h-6">
                  Perfil
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          {isLinkedMember ? (
            // Direct report placeholder
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma atividade ainda</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma atividade ainda</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredItems.map((item) =>
                item.kind === 'nudge'
                  ? renderNudgeItem(item.data)
                  : renderSyncItem(item.data)
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
