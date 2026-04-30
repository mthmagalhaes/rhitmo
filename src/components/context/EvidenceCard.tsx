// Sprint 8.3 — Card item for the unified context feed (`/lider/contexto`).
// Click → dispatches `rhitmo:open-evidence` so the global EvidenceDrawer opens.
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getSourceMeta } from './sourceMeta';
import { openEvidence } from './CitationChip';
import type { TimelineRow } from '@/hooks/useTeamTimeline';

interface EvidenceCardProps {
  row: TimelineRow;
}

function initials(name: string | null | undefined) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function EvidenceCard({ row }: EvidenceCardProps) {
  const meta = getSourceMeta(row.source_table);
  const Icon = meta.icon;

  const when = (() => {
    try {
      return formatDistanceToNow(new Date(row.occurred_at), { addSuffix: true, locale: ptBR });
    } catch {
      return '';
    }
  })();

  const headline = row.title?.trim() || row.summary?.trim() || meta.label;
  const snippet = row.title && row.summary && row.summary !== row.title ? row.summary : null;

  return (
    <button
      type="button"
      onClick={() => openEvidence(row.id)}
      className={cn(
        'group w-full text-left rounded-2xl bg-card border border-border/50',
        'shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]',
        'hover:-translate-y-0.5 transition-all duration-200',
        'p-4 sm:p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="h-7 w-7 ring-1 ring-border/40">
            {row.member_avatar ? <AvatarImage src={row.member_avatar} alt={row.member_name ?? ''} /> : null}
            <AvatarFallback className="text-[11px] font-medium bg-muted text-foreground/70">
              {initials(row.member_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground truncate">
            {row.member_name ?? 'Liderado'}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
              'text-[10.5px] font-medium leading-none whitespace-nowrap',
              meta.badgeClass,
            )}
          >
            <Icon className="h-3 w-3" strokeWidth={2.5} />
            {meta.label}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground/80 whitespace-nowrap">{when}</span>
      </div>

      <div className="space-y-1">
        <p className="text-[15px] tracking-tight font-medium text-foreground line-clamp-2 leading-snug">
          {headline}
        </p>
        {snippet && (
          <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">
            {snippet}
          </p>
        )}
      </div>
    </button>
  );
}
