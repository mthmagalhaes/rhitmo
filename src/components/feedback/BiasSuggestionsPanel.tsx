import { AlertTriangle, Sparkles, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BiasMatch } from '@/lib/biasDetection';
// NEUTRAL_ALTERNATIVES import removed — not needed here

interface BiasSuggestionsPanelProps {
  matches: BiasMatch[];
  onApply: (match: BiasMatch) => void;
  onApplyAll: () => void;
  onDismiss: () => void;
}

export function BiasSuggestionsPanel({ matches, onApply, onApplyAll, onDismiss }: BiasSuggestionsPanelProps) {
  if (matches.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/10 p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-xs font-semibold text-foreground">
            {matches.length} {matches.length === 1 ? 'termo com possível viés' : 'termos com possível viés'}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-1.5">
        {matches.map((match, i) => (
          <div key={`${match.word}-${match.from}-${i}`} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Badge
                variant="outline"
                className={
                  match.type === 'feminine'
                    ? 'border-rose-300 text-rose-700 dark:text-rose-400 text-[10px] px-1.5 py-0'
                    : 'border-amber-300 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0'
                }
              >
                {match.type === 'feminine' ? 'fem' : 'masc'}
              </Badge>
              <span className="text-muted-foreground truncate">
                "<span className="font-medium text-foreground">{match.word}</span>" → {match.suggestion}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] gap-1 shrink-0 text-primary hover:text-primary"
              onClick={() => onApply(match)}
            >
              <Check className="h-3 w-3" />
              Aplicar
            </Button>
          </div>
        ))}
      </div>

      {matches.length > 1 && (
        <div className="flex justify-end pt-1 border-t border-amber-200/60 dark:border-amber-800/30">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 text-primary hover:text-primary"
            onClick={onApplyAll}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Aplicar todas
          </Button>
        </div>
      )}
    </div>
  );
}
