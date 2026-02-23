import { useState, useMemo } from 'react';
import { AlertTriangle, ChevronDown, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface BiasFlag {
  phrase: string;
  type: 'generalizacao' | 'personalidade' | 'genero' | 'comparacao' | 'rotulo';
  suggestion: string;
}

interface BiasAlertStructured {
  detected: boolean;
  summary: string;
  flags: BiasFlag[];
}

interface BiasDetectionPanelProps {
  biasAlert: string | null;
}

const typeLabels: Record<string, string> = {
  generalizacao: 'Generalização',
  personalidade: 'Personalidade',
  genero: 'Gênero',
  comparacao: 'Comparação',
  rotulo: 'Rótulo',
};

export const BiasDetectionPanel = ({ biasAlert }: BiasDetectionPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const parsed = useMemo((): BiasAlertStructured | string | null => {
    if (!biasAlert) return null;
    try {
      const obj = JSON.parse(biasAlert);
      if (typeof obj === 'object' && 'detected' in obj) {
        return obj as BiasAlertStructured;
      }
      return biasAlert;
    } catch {
      return biasAlert;
    }
  }, [biasAlert]);

  // Legacy string handling
  if (typeof parsed === 'string') {
    const lower = parsed.toLowerCase();
    if (lower.includes('nenhum') || lower.includes('não') || lower.includes('none') || lower.trim() === '') {
      return null;
    }
    // Show legacy string as simple alert
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700/30 p-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300">{parsed}</p>
      </div>
    );
  }

  if (!parsed || !parsed.detected || !parsed.flags || parsed.flags.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-2 rounded-xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700/30 p-3 hover:bg-amber-50/80 dark:hover:bg-amber-950/30 transition-colors cursor-pointer">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Atenção ao tipo de linguagem
          </span>
          <Badge variant="outline" className="text-xs border-amber-400/50 text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/30">
            {parsed.flags.length} {parsed.flags.length === 1 ? 'ponto' : 'pontos'}
          </Badge>
          <ChevronDown className={cn(
            "h-4 w-4 text-amber-500 ml-auto shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border border-t-0 border-amber-300/50 dark:border-amber-700/30 rounded-b-xl bg-amber-50/30 dark:bg-amber-950/10 px-4 py-3 space-y-3">
          {parsed.summary && (
            <p className="text-xs text-muted-foreground">{parsed.summary}</p>
          )}

          {parsed.flags.map((flag, index) => (
            <div key={index}>
              {index > 0 && <Separator className="my-3 bg-amber-200/50 dark:bg-amber-800/30" />}
              <div className="space-y-2">
                {/* Original phrase */}
                <div className="border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-r-lg px-3 py-2">
                  <p className="text-sm text-amber-800 dark:text-amber-300 italic">"{flag.phrase}"</p>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs border-amber-400/50 text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/30">
                    {typeLabels[flag.type] || flag.type}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  {/* Suggestion */}
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200/50 dark:border-green-800/30 rounded-lg px-3 py-1.5 flex-1 min-w-0">
                    <p className="text-sm text-green-800 dark:text-green-300">{flag.suggestion}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <p className="text-[11px] text-muted-foreground/70 pt-1">
            Sugestões geradas por IA para apoiar feedback mais objetivo. Revise antes de usar.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
