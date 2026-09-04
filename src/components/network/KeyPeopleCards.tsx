// Pessoas-chave da rede: quem sustenta a colaboração.
// As definições seguem a literatura de ONA (grau, betweenness, eigenvector),
// mas o texto na tela é em linguagem simples.
import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { RankedPerson } from '@/lib/networkMetrics';

export interface KeyPeopleBlock {
  key: string;
  title: string;
  help: string;
  people: RankedPerson[];
  format?: (p: RankedPerson) => string;
}

interface Props {
  blocks: KeyPeopleBlock[];
  onSelect?: (id: string) => void;
}

export function KeyPeopleCards({ blocks, onSelect }: Props) {
  const visible = blocks.filter((b) => b.people.length > 0);
  if (visible.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visible.map((block) => (
        <Card
          key={block.key}
          className="rounded-2xl border-none shadow-[0_2px_20px_rgba(0,0,0,0.04)]"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
              {block.title}
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label={`Sobre ${block.title}`}>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">{block.help}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {block.people.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect?.(p.id)}
                className="w-full text-left space-y-1 rounded-lg px-1 py-0.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="text-muted-foreground shrink-0">
                    {block.format ? block.format(p) : `${Math.round(p.ratio * 100)}%`}
                  </span>
                </div>
                {p.teamName && (
                  <p className="text-[11px] text-muted-foreground truncate">{p.teamName}</p>
                )}
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${Math.max(6, Math.round(p.ratio * 100))}%` }}
                  />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
