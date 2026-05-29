// Card consolidado de atividade semanal no Slack, mostrado dentro do feed do
// Diário. Read-only (evidência derivada, não nota do líder). Visual alinhado
// ao protótipo aprovado: ícone Slack monocromático, título "Semana de DD/MM
// — {Nome} no Slack" e até 3 bullets temáticos extraídos do summary.
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlackIcon } from '@/components/icons/SlackIcon';

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

/** Extrai até 3 bullets do summary, tolerando narrativa em parágrafo único. */
function extractBullets(summary: string): { bullets: string[]; rest: string } {
  if (!summary) return { bullets: [], rest: '' };
  // Tenta marcadores comuns (•, -, *, numeração)
  const lines = summary
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bulletLines = lines
    .filter((l) => /^([•\-*]|\d+[.)])\s+/.test(l))
    .map((l) => l.replace(/^([•\-*]|\d+[.)])\s+/, ''));
  if (bulletLines.length >= 2) {
    return { bullets: bulletLines.slice(0, 3), rest: '' };
  }
  // Fallback: divide por frases (período + espaço) e usa as 3 primeiras.
  const sentences = summary
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length >= 2) {
    return { bullets: sentences.slice(0, 3), rest: '' };
  }
  return { bullets: [], rest: summary };
}

export function SlackRollupFeedItem({ item }: { item: SlackRollupItem }) {
  const [open, setOpen] = useState(false);
  const weekLabel = format(new Date(item.occurred_at), 'dd/MM', { locale: ptBR });
  const firstName = item.member_name.split(' ')[0];
  const { bullets, rest } = extractBullets(item.summary);

  return (
    <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <SlackIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-foreground tracking-tight truncate">
              Semana de {weekLabel} — {firstName} no Slack
            </h4>
            <p className="text-xs text-muted-foreground">
              Consolidação automática de atividade
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground shrink-0">
          {item.member_name} · {format(new Date(item.occurred_at), 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      </div>

      {bullets.length > 0 ? (
        <ul className="space-y-2 pl-[44px]">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
              <span className="text-primary/60 mt-1 shrink-0">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="pl-[44px] text-left flex items-start gap-2 text-sm text-muted-foreground leading-relaxed hover:text-foreground transition-colors w-full"
        >
          <span className={cn('flex-1', !open && 'line-clamp-2')}>{rest}</span>
          <ChevronDown className={cn('h-3.5 w-3.5 mt-1 shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}
