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
  wordCount?: number;
}

const typeLabels: Record<string, string> = {
  generalizacao: 'Generalização',
  personalidade: 'Personalidade',
  genero: 'Gênero',
  comparacao: 'Comparação',
  rotulo: 'Rótulo',
};

export const BiasDetectionPanel = ({ biasAlert, wordCount }: BiasDetectionPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const parsed = useMemo((): BiasAlertStructured | null => {
    if (!biasAlert) return null;
    try {
      const obj = JSON.parse(biasAlert);
      if (typeof obj === 'object' && 'detected' in obj) {
        return obj as BiasAlertStructured;
      }
      return null;
    } catch {
      return null;
    }
  }, [biasAlert]);

  if (wordCount !== undefined && wordCount < 50) return null;
  if (!parsed || !parsed.detected || !parsed.flags || parsed.flags.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl p-3 hover:bg-amber-100/60 transition-colors cursor-pointer">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-sm font-medium text-amber-800">
            Atenção ao tipo de linguagem
          </span>
          <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300 rounded-full px-2 py-0.5">
            {parsed.flags.length} {parsed.flags.length === 1 ? 'ponto' : 'pontos'}
          </Badge>
          <ChevronDown className={cn(
            "h-4 w-4 text-amber-500 ml-auto shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border border-t-0 border-amber-200 rounded-b-2xl bg-amber-50/50 px-4 py-3 space-y-2">
          {parsed.summary && (
            <p className="text-xs text-amber-700 mb-3">{parsed.summary}</p>
          )}

          {parsed.flags.map((flag, index) => (
            <div key={index}>
              {index > 0 && <Separator className="my-3 bg-amber-200/60" />}
              <div className="bg-card border-l-2 border-warning rounded-r-xl p-3 space-y-2">
                <div className="bg-amber-50 rounded px-2 py-1 inline-block">
                  <p className="text-sm text-amber-900 font-medium italic">"{flag.phrase}"</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-600 border-amber-300 rounded-full px-2 py-0.5">
                    {typeLabels[flag.type] || flag.type}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 flex-1 min-w-0">
                    <p className="text-sm text-emerald-700">{flag.suggestion}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <p className="text-xs text-amber-600/70 mt-3 italic text-center">
            Sugestões de IA para apoiar feedback mais objetivo. Revise antes de usar.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
