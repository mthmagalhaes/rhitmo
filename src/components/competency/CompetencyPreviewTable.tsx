import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';

interface LevelDesc {
  seniority_level: string;
  description: string;
  examples: string[] | null;
}

interface CompetencyRow {
  name: string;
  levels: LevelDesc[];
}

const LEVEL_ORDER = ['junior', 'pleno', 'senior', 'especialista'];
const LEVEL_LABELS: Record<string, string> = {
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
  especialista: 'Especialista',
};

export const CompetencyPreviewTable = ({ competencies }: { competencies: CompetencyRow[] }) => {
  const [open, setOpen] = useState(false);

  if (!competencies.length) return null;

  return (
    <div className="bg-card rounded-3xl shadow-sm overflow-hidden">
      <Button
        variant="ghost"
        className="w-full justify-between px-6 py-4 h-auto text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-foreground">Visão Geral do Framework</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>

      {open && (
        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 pr-4 font-medium text-muted-foreground w-40">Competência</th>
                {LEVEL_ORDER.map(l => (
                  <th key={l} className="text-left py-3 px-2 font-medium text-muted-foreground">{LEVEL_LABELS[l]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {competencies.map((comp, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground align-top">{comp.name}</td>
                  {LEVEL_ORDER.map(level => {
                    const desc = comp.levels.find(l => l.seniority_level === level);
                    const text = desc?.description || '—';
                    const truncated = text.length > 80 ? text.slice(0, 80) + '…' : text;
                    const examples = (desc?.examples as string[] | null) || [];

                    return (
                      <td key={level} className="py-3 px-2 align-top">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help text-xs leading-relaxed">
                              {truncated}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-sm">
                            <p className="text-sm">{text}</p>
                            {examples.length > 0 && (
                              <ul className="mt-2 text-xs list-disc pl-4 space-y-1">
                                {examples.map((ex, j) => <li key={j}>{ex}</li>)}
                              </ul>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
