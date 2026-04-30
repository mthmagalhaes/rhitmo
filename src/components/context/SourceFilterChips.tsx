// Sprint 8.3 — Multi-select pill filter for context_evidence source_table.
import { cn } from '@/lib/utils';
import { getSourceMeta } from './sourceMeta';

export const SOURCE_KEYS = [
  'feedbacks',
  'meeting_transcripts',
  'slack_ambient_evidence',
  'kudos',
  'member_prompts',
  'goals',
  'performance_reviews',
  'leader_nudges',
] as const;

export type SourceKey = typeof SOURCE_KEYS[number];

interface SourceFilterChipsProps {
  selected: SourceKey[];
  onToggle: (key: SourceKey) => void;
  onClear: () => void;
}

export function SourceFilterChips({ selected, onToggle, onClear }: SourceFilterChipsProps) {
  const hasSelection = selected.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={onClear}
        className={cn(
          'rounded-full px-3 py-1 text-[12px] font-medium transition-all',
          !hasSelection
            ? 'bg-foreground text-background shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            : 'bg-muted/60 text-foreground/70 hover:bg-muted',
        )}
      >
        Todas
      </button>
      {SOURCE_KEYS.map((key) => {
        const meta = getSourceMeta(key);
        const Icon = meta.icon;
        const active = selected.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-all',
              active
                ? meta.badgeClass + ' ring-1 ring-foreground/10 shadow-[0_2px_8px_rgba(0,0,0,0.05)]'
                : 'bg-muted/60 text-foreground/70 hover:bg-muted',
            )}
          >
            <Icon className="h-3 w-3" strokeWidth={2.5} />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
