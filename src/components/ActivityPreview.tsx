import { Bell, AlertCircle, Lightbulb, User, ArrowRight, Inbox } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

interface ActivityItem {
  id: string;
  type: 'nudge' | 'sync';
  message: string;
  severity?: string | null;
  created_at: string;
}

interface ActivityPreviewProps {
  onOpenSheet: () => void;
}

export function ActivityPreview({ onOpenSheet }: ActivityPreviewProps) {
  const { data: items = [] } = useQuery({
    queryKey: ['activity-preview'],
    queryFn: async () => {
      const [nudgesRes, syncRes] = await Promise.all([
        supabase
          .from('leader_nudges')
          .select('id, message, severity, created_at')
          .is('dismissed_at', null)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('rhitmo_sync_notifications')
          .select('id, change_summary, created_at, team_members(name)')
          .is('read_at', null)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      const nudges: ActivityItem[] = (nudgesRes.data || []).map((n) => ({
        id: n.id,
        type: 'nudge' as const,
        message: n.message,
        severity: n.severity,
        created_at: n.created_at || '',
      }));

      const syncs: ActivityItem[] = (syncRes.data || []).map((s: any) => ({
        id: s.id,
        type: 'sync' as const,
        message: `${s.team_members?.name || 'Membro'} atualizou: ${s.change_summary}`,
        severity: null,
        created_at: s.created_at || '',
      }));

      return [...nudges, ...syncs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
    },
    refetchInterval: 30000,
  });

  // Empty state — subtle micro card
  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Atividade recente</h3>
        </div>
        <div className="flex flex-col items-center text-center py-4">
          <Inbox className="h-8 w-8 text-muted-foreground/25 mb-2" />
          <p className="text-xs text-muted-foreground">Tudo em dia — sem alertas pendentes</p>
        </div>
      </div>
    );
  }

  const getIcon = (item: ActivityItem) => {
    if (item.type === 'sync') return <User className="h-3.5 w-3.5 text-primary" />;
    if (item.severity === 'urgent') return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    return <Lightbulb className="h-3.5 w-3.5 text-amber-500" />;
  };

  const getSeverityBar = (item: ActivityItem) => {
    if (item.type === 'sync') return 'bg-primary';
    if (item.severity === 'urgent') return 'bg-destructive';
    if (item.severity === 'warning') return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <div className="rounded-2xl bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Atividade recente</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-primary gap-1 h-7 px-2 hover:bg-primary/5"
          onClick={onOpenSheet}
        >
          Ver todas
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      <div className="divide-y divide-border/50">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 px-5 py-3 hover:bg-accent/30 transition-colors cursor-pointer"
            onClick={onOpenSheet}
          >
            <div className={`w-0.5 h-8 rounded-full shrink-0 ${getSeverityBar(item)}`} />
            <div className="shrink-0">{getIcon(item)}</div>
            <p className="text-sm text-foreground truncate flex-1">{item.message}</p>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
