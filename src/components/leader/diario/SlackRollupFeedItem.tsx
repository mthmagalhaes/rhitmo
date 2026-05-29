// Item read-only do feed do Diário para mostrar atividade do Slack
// (context_evidence.evidence_type = 'slack_activity_rollup'). Não permite
// editar/excluir — é evidência derivada, não nota do líder.
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface SlackRollupItem {
  kind: 'slack_rollup';
  id: string;
  member_id: string;
  member_name: string;
  member_avatar: string | null;
  title: string;
  summary: string;
  occurred_at: string;
}

export function SlackRollupFeedItem({ item }: { item: SlackRollupItem }) {
  const [open, setOpen] = useState(false);
  const dateLabel = format(new Date(item.occurred_at), "dd/MM/yyyy", { locale: ptBR });

  return (
    <div
      className={cn(
        'group rounded-xl border border-border/40 bg-muted/20 px-3 py-2 transition-colors',
        'hover:bg-muted/40',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center gap-2 min-w-0"
      >
        <Badge
          variant="outline"
          className="shrink-0 rounded-md text-[10px] font-medium border-primary/30 text-primary/80 bg-primary/5"
        >
          Slack
        </Badge>
        <span className="text-sm text-foreground/90 truncate flex-1 min-w-0">
          {item.title}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">{item.member_name.split(' ')[0]}</span>
        <span className="text-xs text-muted-foreground shrink-0">·</span>
        <span className="text-xs text-muted-foreground shrink-0">{dateLabel}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {item.summary}
        </p>
      )}
    </div>
  );
}
