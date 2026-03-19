import { Lightbulb, X, ChevronDown, ChevronUp, Highlighter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface BiasAlertProps {
  detectedWords: string[];
  suggestions: string[];
  explanation: string;
  onDismiss: () => void;
  onHighlightWords?: () => void;
}

export function BiasAlert({ detectedWords, suggestions, explanation, onDismiss, onHighlightWords }: BiasAlertProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-blue-50 dark:bg-blue-900/15 border-l-4 border-blue-500 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-1.5 mt-0.5">
            <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              💡 Sugestão de linguagem mais neutra
            </p>
            <p className="text-xs text-muted-foreground">
              Detectamos {detectedWords.length} palavras que podem indicar viés de gênero.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-xs gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 p-0 h-auto"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? 'Ocultar sugestões' : 'Ver sugestões'}
      </Button>

      {expanded && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <ul className="space-y-1.5 pl-1">
            {suggestions.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                {s.startsWith('Considere') ? (
                  <span className="italic">{s}</span>
                ) : (
                  <span>• {s}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground/80 italic border-t border-blue-200 dark:border-blue-800 pt-2">
            {explanation}
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {onHighlightWords && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={onHighlightWords}
          >
            <Highlighter className="h-3.5 w-3.5" />
            Destacar no texto
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-xs" onClick={onDismiss}>
          Entendi, ignorar
        </Button>
      </div>
    </div>
  );
}
