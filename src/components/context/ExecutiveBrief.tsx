// Sprint 13.1 — Briefing Executivo: 4 blocos curtos com chips clicáveis para EvidenceDrawer.
import { TrendingUp, AlertTriangle, Target, MessageCircle, RefreshCcw, Loader2, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { openEvidence } from '@/components/context/CitationChip';
import type { BriefItem, BriefWindow, ContextBrief } from '@/hooks/useContextBrief';
import { cn } from '@/lib/utils';

interface BlockSpec {
  key: keyof Pick<ContextBrief, 'wins' | 'risks' | 'in_motion' | 'conversations'>;
  label: string;
  icon: typeof TrendingUp;
  iconClass: string;
}

const BLOCKS: BlockSpec[] = [
  { key: 'wins', label: 'Ganhos', icon: TrendingUp, iconClass: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'risks', label: 'Riscos', icon: AlertTriangle, iconClass: 'text-amber-600 dark:text-amber-400' },
  { key: 'in_motion', label: 'Em movimento', icon: Target, iconClass: 'text-indigo-600 dark:text-indigo-400' },
  { key: 'conversations', label: 'Conversas recentes', icon: MessageCircle, iconClass: 'text-sky-600 dark:text-sky-400' },
];

interface ExecutiveBriefProps {
  brief: ContextBrief | null;
  isLoading: boolean;
  isRefreshing: boolean;
  windowDays: BriefWindow;
  onWindowChange: (w: BriefWindow) => void;
  onRefresh: () => void;
}

function EvidenceChips({ ids }: { ids: string[] }) {
  if (!ids.length) return null;
  return (
    <span className="ml-1.5 inline-flex items-center gap-1">
      {ids.slice(0, 3).map((id, idx) => (
        <button
          key={id}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openEvidence(id);
          }}
          className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded text-[10px] font-medium bg-muted text-muted-foreground hover:bg-foreground hover:text-background transition-colors"
          aria-label="Ver evidência"
        >
          {idx + 1}
        </button>
      ))}
      {ids.length > 3 && (
        <span className="text-[10px] text-muted-foreground/70">+{ids.length - 3}</span>
      )}
    </span>
  );
}

function BriefBlock({ spec, items }: { spec: BlockSpec; items: BriefItem[] }) {
  const Icon = spec.icon;
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-3.5 w-3.5', spec.iconClass)} strokeWidth={2.5} />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {spec.label}
        </h3>
        <span className="text-[10px] text-muted-foreground/60">
          {items.length === 0 ? 'sem sinais' : `${items.length}`}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground/60 italic pl-5">—</p>
      ) : (
        <ul className="space-y-1.5 pl-5">
          {items.map((it, i) => (
            <li key={i} className="text-[14px] text-foreground leading-relaxed">
              <span className="text-muted-foreground/50 mr-2">·</span>
              {it.text}
              <EvidenceChips ids={it.evidence_ids} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ExecutiveBrief({
  brief,
  isLoading,
  isRefreshing,
  windowDays,
  onWindowChange,
  onRefresh,
}: ExecutiveBriefProps) {
  const total =
    (brief?.wins.length ?? 0) +
    (brief?.risks.length ?? 0) +
    (brief?.in_motion.length ?? 0) +
    (brief?.conversations.length ?? 0);

  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-border/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded-lg bg-primary/10 p-1.5 shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Briefing Executivo
            </p>
            {brief && (
              <p className="text-[11px] text-muted-foreground/70 truncate">
                {brief.evidence_count} {brief.evidence_count === 1 ? 'evidência' : 'evidências'} ·
                gerado {formatDistanceToNow(new Date(brief.generated_at), { addSuffix: true, locale: ptBR })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Select
            value={String(windowDays)}
            onValueChange={(v) => onWindowChange(Number(v) as BriefWindow)}
          >
            <SelectTrigger className="h-7 w-[88px] rounded-lg text-[11px] bg-background border-border/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-lg"
            onClick={onRefresh}
            disabled={isRefreshing || isLoading}
            aria-label="Atualizar agora"
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 sm:px-6 py-5">
        {isLoading ? (
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        ) : !brief || total === 0 ? (
          <div className="py-8 text-center">
            <Sparkles className="h-7 w-7 mx-auto text-muted-foreground/40 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-foreground mb-1">
              Sem sinais nos últimos {windowDays} dias
            </p>
            <p className="text-[13px] text-muted-foreground max-w-sm mx-auto">
              Quando houver notas no diário, 1:1s, kudos, metas ou respostas de Pulse,
              o Briefing aparece aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {BLOCKS.map((spec) => (
              <BriefBlock key={spec.key} spec={spec} items={brief[spec.key]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
