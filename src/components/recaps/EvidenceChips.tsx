import { useTranslation } from 'react-i18next';
import { ScrollText, MessageSquare, Loader2 } from 'lucide-react';
import { formatEvidenceDate } from '@/lib/dateLocale';
import { useEvidenceResolver, type EvidenceRef } from '@/hooks/useEvidenceResolver';

interface Props {
  evidence: EvidenceRef[] | null | undefined;
  /** Function to scroll/open the evidence in context (e.g., Diário de Bordo). */
  onOpen?: (ref: { type: 'feedback' | 'meeting'; id: string }) => void;
}

export function EvidenceChips({ evidence, onOpen }: Props) {
  const { t, i18n } = useTranslation('rhitmo');
  const refs = Array.isArray(evidence) ? evidence : [];
  const { data: resolved, isLoading } = useEvidenceResolver(refs);

  if (refs.length === 0) return null;

  if (isLoading) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{t('recap.monthly.evidence.loading')}</span>
      </div>
    );
  }

  const items = resolved ?? [];
  if (items.length === 0) return null;

  // UTC-locked — date-fns `format` would shift YYYY-MM-DD by one day in BRT.
  const formatChipDate = (iso: string) => formatEvidenceDate(iso, i18n.language);

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((it) => {
        const Icon = it.type === 'feedback' ? ScrollText : MessageSquare;
        const typeLabel = t(`recap.monthly.evidence.${it.type}`);
        const dateLabel = formatChipDate(it.date);
        const clickable = !!onOpen && it.found;
        const baseClasses =
          'inline-flex items-center gap-1.5 max-w-full rounded-xl bg-muted/50 px-2.5 py-1 text-xs text-foreground/80 border border-transparent transition-all';
        const interactive = clickable
          ? 'hover:border-primary/30 hover:bg-primary/5 hover:text-foreground cursor-pointer'
          : 'opacity-80';
        const content = (
          <>
            <Icon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium uppercase tracking-wider text-[10px] text-muted-foreground">
              {typeLabel}
            </span>
            <span className="truncate max-w-[280px]">{it.label}</span>
            {dateLabel && (
              <span className="text-muted-foreground tabular-nums flex-shrink-0">· {dateLabel}</span>
            )}
          </>
        );
        if (clickable) {
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onOpen!({ type: it.type, id: it.id })}
              className={`${baseClasses} ${interactive}`}
              title={it.label}
            >
              {content}
            </button>
          );
        }
        return (
          <span key={it.key} className={`${baseClasses} ${interactive}`} title={it.label}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
