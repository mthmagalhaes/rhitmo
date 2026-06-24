// RelationshipSignalsCard
// ------------------------------------------------------------------
// "Sinais da relação" — Fase 1+2 da Camada de Ambiente.
// Mostra ao líder padrões objetivos do liderado ao longo das últimas
// reuniões 1:1 (talk-time, perguntas, palavras por turno, sentimento)
// e destaca drift em relação ao baseline pessoal.
//
// Privacidade: somente o líder dono vê (RLS no `meeting_signals` +
// ownership check no RPC `get_member_signals_trend`). Liderado NUNCA acessa.

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, MessageCircleQuestion, TrendingDown, TrendingUp, Minus, Info, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RelationshipSignalsCardProps {
  memberId: string;
  memberName: string;
}

interface SignalRow {
  id: string;
  occurred_at: string;
  recall_bot_id: string;
  participant_name: string | null;
  talk_pct: number | null;
  questions_asked: number | null;
  avg_turn_words: number | null;
  interruptions_made: number | null;
  sentiment_score: number | null;
  sentiment_label: string | null;
  sentiment_summary: string | null;
  meeting_seconds: number | null;
  baseline_talk_pct: number | null;
  baseline_questions: number | null;
  baseline_avg_turn_words: number | null;
  baseline_sentiment: number | null;
  drift_flags: number | null;
}

function deltaDirection(current: number | null | undefined, baseline: number | null | undefined): 'up' | 'down' | 'flat' | null {
  if (current == null || baseline == null) return null;
  const diff = current - baseline;
  const pct = Math.abs(baseline) > 0.01 ? diff / Math.abs(baseline) : diff;
  if (Math.abs(pct) < 0.1) return 'flat';
  return diff > 0 ? 'up' : 'down';
}

function DeltaIcon({ dir }: { dir: ReturnType<typeof deltaDirection> }) {
  if (dir === 'up') return <TrendingUp className="h-3 w-3 text-emerald-600" />;
  if (dir === 'down') return <TrendingDown className="h-3 w-3 text-amber-600" />;
  if (dir === 'flat') return <Minus className="h-3 w-3 text-muted-foreground" />;
  return null;
}

function sentimentColor(label: string | null): string {
  if (!label) return 'text-muted-foreground';
  const l = label.toLowerCase();
  if (l.includes('positiv')) return 'text-emerald-700 dark:text-emerald-400';
  if (l.includes('negativ') || l.includes('tens')) return 'text-rose-700 dark:text-rose-400';
  return 'text-muted-foreground';
}

export function RelationshipSignalsCard({ memberId, memberName }: RelationshipSignalsCardProps) {
  const { data: rows, isLoading } = useQuery({
    queryKey: ['member-signals-trend', memberId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_member_signals_trend', {
        p_member_id: memberId,
        p_limit: 12,
      });
      if (error) throw error;
      return (data ?? []) as SignalRow[];
    },
    enabled: !!memberId,
    staleTime: 30_000,
  });

  // Latest first
  const latest = rows?.[0];

  const summary = useMemo(() => {
    if (!latest) return null;
    const items: Array<{ label: string; tone: 'down' | 'up' | 'flat'; text: string }> = [];
    const talkDir = deltaDirection(latest.talk_pct, latest.baseline_talk_pct);
    if (talkDir === 'down' && latest.baseline_talk_pct != null) {
      items.push({ label: 'Tempo de fala', tone: 'down', text: `caiu vs. média (${Math.round(latest.talk_pct ?? 0)}% nesta sessão, baseline ${Math.round(latest.baseline_talk_pct)}%)` });
    } else if (talkDir === 'up' && latest.baseline_talk_pct != null) {
      items.push({ label: 'Tempo de fala', tone: 'up', text: `subiu vs. média (${Math.round(latest.talk_pct ?? 0)}% nesta sessão, baseline ${Math.round(latest.baseline_talk_pct)}%)` });
    }
    const qDir = deltaDirection(latest.questions_asked, latest.baseline_questions);
    if (qDir === 'down' && latest.baseline_questions != null) {
      items.push({ label: 'Perguntas', tone: 'down', text: `menos perguntas do que o normal (${latest.questions_asked} vs. ~${Math.round(latest.baseline_questions)})` });
    }
    const sDir = deltaDirection(latest.sentiment_score, latest.baseline_sentiment);
    if (sDir === 'down' && latest.baseline_sentiment != null) {
      items.push({ label: 'Tom', tone: 'down', text: `tom mais reservado do que o normal` });
    } else if (sDir === 'up' && latest.baseline_sentiment != null) {
      items.push({ label: 'Tom', tone: 'up', text: `tom mais aberto do que o normal` });
    }
    return items;
  }, [latest]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
        <div className="h-20 bg-muted/30 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed bg-muted/20 shadow-none">
        <CardContent className="py-5 text-center space-y-1.5">
          <Activity className="h-5 w-5 text-muted-foreground mx-auto" />
          <p className="text-sm text-foreground">Ainda sem sinais para {memberName.split(' ')[0]}.</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A partir das próximas 1:1s gravadas pelo bot, o Rhitmo passa a mostrar padrões objetivos (tempo de fala, perguntas, tom) e variações em relação ao baseline pessoal.
          </p>
        </CardContent>
      </Card>
    );
  }

  const driftFlags = latest?.drift_flags ?? 0;

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold inline-flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Sinais da relação
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs leading-relaxed">
                    Padrões objetivos extraídos das 1:1s gravadas: tempo de fala, perguntas, ritmo e tom. Comparamos cada sessão com o baseline pessoal de {memberName.split(' ')[0]} para sinalizar mudanças. Só você vê — o liderado não.
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Últimas {rows.length} {rows.length === 1 ? 'sessão' : 'sessões'} com {memberName.split(' ')[0]}
              </p>
            </div>
            {driftFlags >= 3 && (
              <Badge className="text-[11px] h-5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                Mudança relevante
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Última sessão — destaque */}
          {latest && (
            <div className="rounded-xl bg-muted/30 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Última sessão
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(latest.occurred_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Metric
                  label="Tempo de fala"
                  value={latest.talk_pct != null ? `${Math.round(latest.talk_pct)}%` : '—'}
                  baseline={latest.baseline_talk_pct != null ? `~${Math.round(latest.baseline_talk_pct)}%` : null}
                  dir={deltaDirection(latest.talk_pct, latest.baseline_talk_pct)}
                />
                <Metric
                  label="Perguntas"
                  value={String(latest.questions_asked ?? 0)}
                  baseline={latest.baseline_questions != null ? `~${Math.round(latest.baseline_questions)}` : null}
                  dir={deltaDirection(latest.questions_asked, latest.baseline_questions)}
                  icon={<MessageCircleQuestion className="h-3 w-3" />}
                />
                <Metric
                  label="Palavras/turno"
                  value={latest.avg_turn_words != null ? Math.round(latest.avg_turn_words).toString() : '—'}
                  baseline={latest.baseline_avg_turn_words != null ? `~${Math.round(latest.baseline_avg_turn_words)}` : null}
                  dir={deltaDirection(latest.avg_turn_words, latest.baseline_avg_turn_words)}
                />
                <Metric
                  label="Tom"
                  value={latest.sentiment_label ?? '—'}
                  baseline={null}
                  dir={deltaDirection(latest.sentiment_score, latest.baseline_sentiment)}
                  valueClassName={sentimentColor(latest.sentiment_label)}
                />
              </div>

              {latest.sentiment_summary && (
                <p className="text-xs text-muted-foreground italic leading-relaxed pt-1 border-t border-border/50">
                  <Sparkles className="h-3 w-3 inline mr-1 text-primary/60" />
                  {latest.sentiment_summary}
                </p>
              )}
            </div>
          )}

          {/* Drift summary */}
          {summary && summary.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                O que mudou
              </p>
              <ul className="space-y-1">
                {summary.map((s, i) => (
                  <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                    <DeltaIcon dir={s.tone} />
                    <span>
                      <span className="font-medium">{s.label}:</span>{' '}
                      <span className="text-muted-foreground">{s.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mini-sparkline: últimas N sessões */}
          {rows.length >= 2 && (
            <div className="space-y-1.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Tempo de fala — últimas {rows.length} sessões
              </p>
              <Sparkline
                values={[...rows].reverse().map((r) => r.talk_pct ?? 0)}
              />
            </div>
          )}

          {rows.length < 4 && (
            <p className="text-[11px] text-muted-foreground italic leading-relaxed">
              Baseline ainda em formação. Os sinais ficam mais confiáveis depois de ~4 sessões.
            </p>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

function Metric({
  label,
  value,
  baseline,
  dir,
  icon,
  valueClassName,
}: {
  label: string;
  value: string;
  baseline: string | null;
  dir: ReturnType<typeof deltaDirection>;
  icon?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-base font-semibold tracking-tight ${valueClassName ?? 'text-foreground'}`}>
          {value}
        </span>
        <DeltaIcon dir={dir} />
        {baseline && <span className="text-[10px] text-muted-foreground">{baseline}</span>}
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 240;
  const h = 36;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary/70"
      />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === values.length - 1 ? 2.5 : 1.5}
            className={i === values.length - 1 ? 'fill-primary' : 'fill-primary/50'}
          />
        );
      })}
    </svg>
  );
}
