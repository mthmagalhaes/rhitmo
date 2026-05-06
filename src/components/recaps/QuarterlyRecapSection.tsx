import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
// (date-fns format no longer needed — quarter math is done in plain JS UTC)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Sparkles, CheckCircle2, RefreshCw, BarChart3, AlertTriangle, Clock, Zap, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  useQuarterlyRecaps,
  useGenerateQuarterlyRecap,
  useConfirmQuarterlyRecap,
  type QuarterlyRecap,
} from '@/hooks/useRecaps';
import {
  ACTIONS_BY_CLASSIFICATION,
  CLASSIFICATIONS,
  TURNOVER_RISKS,
  type RecapClassification,
  type RecapTurnoverRisk,
} from '@/lib/recapActions';
import { GenerateQuarterlyDialog } from './GenerateQuarterlyDialog';

interface Props {
  memberId: string;
}

function quarterLabel(periodQuarter: string) {
  const d = new Date(periodQuarter + 'T00:00:00Z');
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} ${d.getUTCFullYear()}`;
}

// First day (UTC) of the CURRENT quarter — the one in progress. Used only for
// the read-only "Em andamento" card; never sent to the edge function (it would
// 422 because there are no confirmed monthlies inside an unfinished quarter).
function getCurrentQuarterStart(): string {
  const d = new Date();
  const qStartMonth = Math.floor(d.getUTCMonth() / 3) * 3;
  const m = String(qStartMonth + 1).padStart(2, '0');
  return `${d.getUTCFullYear()}-${m}-01`;
}

// First day (UTC) of the LAST CLOSED quarter — the one the leader can actually
// generate the trimestral for (the previous one is finished, so the 3 monthlies
// inside it can be confirmed). On April 22, 2026 → "2026-01-01" (Q1 2026).
// Handles year rollover: if current quarter starts at month 0 (Q1), subtracting
// 3 lands at month -3 → wrap to month 9 (Q4) of the previous year.
function getLastClosedQuarterStart(): string {
  const d = new Date();
  const qStartMonth = Math.floor(d.getUTCMonth() / 3) * 3;
  const prev = qStartMonth - 3;
  const year = prev < 0 ? d.getUTCFullYear() - 1 : d.getUTCFullYear();
  const month = ((prev % 12) + 12) % 12;
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

// First day of the month AFTER the quarter ends (when monthlies become
// confirmable and the trimestral can be generated). Q2 2026 (Apr-Jun) closes
// on 01/07/2026, displayed as "01/07".
function quarterClosingDate(periodQuarter: string): string {
  const [y, m] = periodQuarter.split('-').map((x) => parseInt(x, 10));
  const closing = new Date(Date.UTC(y, m - 1 + 3, 1));
  const dd = String(closing.getUTCDate()).padStart(2, '0');
  const mm = String(closing.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${closing.getUTCFullYear()}`;
}

function CurrentQuarterCard({ periodQuarter }: { periodQuarter: string }) {
  const { t } = useTranslation('rhitmo');
  const closingDate = useMemo(() => quarterClosingDate(periodQuarter), [periodQuarter]);
  return (
    <Card className="rounded-2xl border-dashed border-border/70 bg-muted/20 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{t('recap.quarterly.inProgressTitle', { quarter: quarterLabel(periodQuarter) })}</span>
          </CardTitle>
          <Badge variant="outline" className="border-border text-muted-foreground">
            {t('recap.quarterly.inProgressBadge')}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t('recap.quarterly.inProgressDesc', { date: closingDate })}
        </p>
      </CardHeader>
    </Card>
  );
}

function QuarterCard({ memberId, recap, periodQuarter, defaultOpen = false }: { memberId: string; recap: QuarterlyRecap | undefined; periodQuarter: string; defaultOpen?: boolean }) {
  const { t } = useTranslation('rhitmo');
  const generate = useGenerateQuarterlyRecap(memberId);
  const confirm = useConfirmQuarterlyRecap(memberId);

  const [classification, setClassification] = useState<RecapClassification | null>(recap?.classification ?? recap?.ai_suggested_classification ?? null);
  const [risk, setRisk] = useState<RecapTurnoverRisk | null>(recap?.turnover_risk ?? null);
  const [riskReason, setRiskReason] = useState(recap?.turnover_risk_reason ?? '');
  const [actionKey, setActionKey] = useState<string | null>(recap?.next_action_key ?? recap?.ai_suggested_next_action_key ?? null);
  const [actionNote, setActionNote] = useState(recap?.next_action_note ?? '');

  useEffect(() => {
    if (recap) {
      setClassification(recap.classification ?? recap.ai_suggested_classification ?? null);
      setRisk(recap.turnover_risk ?? null);
      setRiskReason(recap.turnover_risk_reason ?? '');
      setActionKey(recap.next_action_key ?? recap.ai_suggested_next_action_key ?? null);
      setActionNote(recap.next_action_note ?? '');
    }
  }, [recap?.id, recap?.ai_generated_at]);

  const isConfirmed = recap?.status === 'confirmed';
  const availableActions = classification ? ACTIONS_BY_CLASSIFICATION[classification] : [];
  const canConfirm = !!classification && !!risk && !!actionKey;

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-border/60 overflow-hidden">
        <CollapsibleTrigger className="group w-full text-left">
          <CardHeader className="pb-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                {t('recap.quarterly.cardTitle', { quarter: quarterLabel(periodQuarter) })}
              </CardTitle>
              <div className="flex items-center gap-2">
                {isConfirmed && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t('recap.quarterly.confirmedBadge')}
                  </Badge>
                )}
                {recap?.status === 'draft' && (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
                    {t('recap.quarterly.draftBadge')}
                  </Badge>
                )}
                {!recap && (
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    Sem rascunho
                  </Badge>
                )}
                {recap?.generation_mode === 'from_raw' && (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/5">
                    <Zap className="h-3 w-3 mr-1" />
                    Modo rápido
                  </Badge>
                )}
              </div>
            </div>
            {recap && (
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                {t('recap.quarterly.basedOn', {
                  count: recap.source_monthly_recap_ids.length,
                  feedbacks: recap.source_feedbacks_count,
                  meetings: recap.source_meetings_count,
                })}
              </p>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
      <CardContent className="space-y-5">
        {!recap && (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">{t('recap.quarterly.needConfirmedMonthly')}</p>
            <div className="flex flex-col items-center gap-2">
              <Button
                onClick={() => generate.mutate({ periodQuarter, mode: 'auto' })}
                disabled={generate.isPending}
                size="sm"
                className="rounded-xl"
              >
                {generate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('recap.monthly.generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t('recap.quarterly.generateButton')}
                  </>
                )}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-xs text-muted-foreground hover:text-foreground"
                    disabled={generate.isPending}
                  >
                    <Zap className="h-3 w-3 mr-1.5" />
                    Gerar em modo rápido (sem mensais)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-600" />
                      Modo rápido — atalho com ressalvas
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2 pt-2">
                      <span className="block">
                        Esse modo gera o trimestral direto dos feedbacks e 1:1s brutos do trimestre, <strong>sem a curadoria mensal</strong>.
                      </span>
                      <span className="block">
                        A qualidade tende a ser menor: padrões isolados podem pesar mais e a IA tem menos contexto editorial. O recap fica marcado com badge <strong>"Modo rápido"</strong> permanentemente, para auditoria.
                      </span>
                      <span className="block text-xs">
                        Recomendado só quando você não confirmou nenhum mensal e precisa destravar o trimestral agora.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl"
                      onClick={() => generate.mutate({ periodQuarter, mode: 'from_raw' })}
                    >
                      Gerar mesmo assim
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {recap && (
          <>
            {recap.highlights.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('recap.quarterly.highlights')}</h3>
                <ul className="space-y-2">
                  {recap.highlights.map((h, i) => (
                    <li key={i} className="text-sm bg-muted/40 rounded-xl p-3">
                      <span className="font-medium">{h.title}</span>
                      <span className="text-muted-foreground"> — {h.detail}</span>
                      <span className="text-xs text-muted-foreground ml-1">({h.source_month})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recap.recurring_patterns.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('recap.quarterly.patterns')}</h3>
                <ul className="space-y-1.5">
                  {recap.recurring_patterns.map((p, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className={cn('h-2 w-2 rounded-full mt-1.5 flex-shrink-0', p.polarity === 'positive' ? 'bg-emerald-500' : 'bg-amber-500')} />
                      <span>
                        {p.pattern} <span className="text-xs text-muted-foreground">— {p.frequency_note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recap.evolution_vs_previous && (
              <div className="text-sm bg-primary/5 rounded-xl p-3 border border-primary/10">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary mr-1">{t('recap.quarterly.evolutionPrefix')}</span>
                {recap.evolution_vs_previous}
              </div>
            )}

            {/* Sprint 16 — Vozes de pares (peer feedback do trimestre) */}
            {recap.peer_voices && recap.peer_voices.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Vozes de pares no trimestre
                </h3>
                <ul className="space-y-2">
                  {recap.peer_voices.map((v) => (
                    <li key={v.request_id} className="text-sm bg-teal-500/5 border border-teal-500/15 rounded-xl p-3">
                      <div className="text-xs font-medium text-teal-700 dark:text-teal-300 mb-1">
                        {v.peer_name}
                        <span className="text-muted-foreground font-normal ml-1">
                          · {new Date(v.responded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-foreground/90 italic">"{v.text}"</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sprint 16 — Contexto de rede (sinais ONA do trimestre) */}
            {recap.network_context && recap.network_context.signals && recap.network_context.signals.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  Contexto de rede
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recap.network_context.signals.map((s) => (
                    <Badge
                      key={s.id}
                      variant="outline"
                      className={cn(
                        'text-xs font-normal',
                        s.severity === 'high' && 'border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-300',
                        s.severity === 'medium' && 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300',
                        s.severity === 'low' && 'border-muted-foreground/30 bg-muted/30',
                      )}
                    >
                      {s.signal_type.replace(/_/g, ' ')}
                      <span className="ml-1 text-muted-foreground">
                        · {new Date(s.detected_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Classification */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('recap.quarterly.classification')}{' '}
                {recap.ai_suggested_classification && (
                  <span className="ml-1 normal-case text-foreground/50">
                    ({t('recap.quarterly.aiSuggests')}: {t(`recap.classifications.${recap.ai_suggested_classification}`)})
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CLASSIFICATIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={isConfirmed}
                    onClick={() => {
                      setClassification(c);
                      if (actionKey && !ACTIONS_BY_CLASSIFICATION[c].includes(actionKey)) setActionKey(null);
                    }}
                    className={cn(
                      'text-left rounded-xl p-3 border transition-all',
                      classification === c
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border hover:border-foreground/20',
                      isConfirmed && 'opacity-70 cursor-not-allowed',
                    )}
                  >
                    <div className="text-sm font-semibold">{t(`recap.classifications.${c}`)}</div>
                    <div className="text-xs text-muted-foreground">{t(`recap.classifications.${c}_sub`)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Turnover risk */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                {t('recap.quarterly.turnoverRisk')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {TURNOVER_RISKS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={isConfirmed}
                    onClick={() => setRisk(r)}
                    className={cn(
                      'text-sm rounded-xl px-4 py-2 border transition-all',
                      risk === r ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-foreground/20',
                      isConfirmed && 'opacity-70 cursor-not-allowed',
                    )}
                  >
                    {t(`recap.risks.${r}`)}
                  </button>
                ))}
              </div>
              {!isConfirmed && (
                <Textarea
                  value={riskReason}
                  onChange={(e) => setRiskReason(e.target.value)}
                  placeholder={t('recap.quarterly.riskReasonPlaceholder')}
                  className="rounded-xl min-h-[52px] text-sm"
                />
              )}
              {isConfirmed && riskReason && (
                <p className="text-sm text-muted-foreground italic">"{riskReason}"</p>
              )}
            </div>

            {/* Next action */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('recap.quarterly.nextAction')}
              </h3>
              {classification ? (
                <div className="space-y-2">
                  {availableActions.map((key) => (
                    <button
                      key={key}
                      type="button"
                      disabled={isConfirmed}
                      onClick={() => setActionKey(key)}
                      className={cn(
                        'w-full text-left rounded-xl px-3 py-2.5 border text-sm transition-all',
                        actionKey === key ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-foreground/20',
                        isConfirmed && 'opacity-70 cursor-not-allowed',
                      )}
                    >
                      {t(`recap.actions.${key}`)}
                      {recap.ai_suggested_next_action_key === key && (
                        <span className="ml-2 text-xs text-primary">({t('recap.quarterly.aiSuggests')})</span>
                      )}
                    </button>
                  ))}
                  {!isConfirmed && (
                    <Textarea
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder={t('recap.quarterly.actionNotePlaceholder')}
                      className="rounded-xl min-h-[52px] text-sm mt-2"
                    />
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">{t('recap.quarterly.chooseClassificationFirst')}</p>
              )}
            </div>

            {!isConfirmed && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                <Button
                  size="sm"
                  className="rounded-xl"
                  disabled={!canConfirm || confirm.isPending}
                  onClick={() =>
                    confirm.mutate({
                      id: recap.id,
                      patch: {
                        classification: classification ?? undefined,
                        turnover_risk: risk ?? undefined,
                        turnover_risk_reason: riskReason || null,
                        next_action_key: actionKey,
                        next_action_note: actionNote || null,
                      },
                    })
                  }
                >
                  {confirm.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  {t('recap.quarterly.confirm')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => generate.mutate({ periodQuarter, regenerate: true })}
                  disabled={generate.isPending}
                >
                  {generate.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {t('recap.quarterly.regenerate')}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function QuarterlyRecapSection({ memberId }: Props) {
  const { t } = useTranslation('rhitmo');
  const { data: recaps = [], isLoading } = useQuarterlyRecaps(memberId, 12);
  const currentQuarter = getCurrentQuarterStart();
  const lastClosedQuarter = getLastClosedQuarterStart();
  const recapForLastClosed = recaps.find(
    (r) => r.period_quarter && r.period_quarter.slice(0, 10) === lastClosedQuarter,
  );

  // Sprint 17: dialog on-demand
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const suggestQuarterly = params.get('suggest') === 'quarterly';
  const suggestStart = params.get('start') ?? undefined;
  const suggestEnd = params.get('end') ?? undefined;
  const [dialogOpen, setDialogOpen] = useState(suggestQuarterly);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        {t('recap.quarterly.loading')}
      </div>
    );
  }

  // Anything that's neither the current nor the last closed civil quarter shows
  // up under "Trimestres anteriores" — including on-demand recaps (period_quarter null).
  const previous = recaps.filter((r) => {
    if (!r.period_quarter) return true;
    const q = r.period_quarter.slice(0, 10);
    return q !== currentQuarter && q !== lastClosedQuarter;
  });

  return (
    <div className="space-y-4" id="rhitmo-quarterly">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{t('recap.quarterly.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('recap.quarterly.subtitle')}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl"
          onClick={() => setDialogOpen(true)}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Gerar Trimestral
        </Button>
      </div>
      <CurrentQuarterCard periodQuarter={currentQuarter} />
      <QuarterCard
        memberId={memberId}
        periodQuarter={lastClosedQuarter}
        recap={recapForLastClosed}
        defaultOpen={!recapForLastClosed || recapForLastClosed.status !== 'confirmed'}
      />
      {previous.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">
            {t('recap.quarterly.previousQuarters')}
          </h3>
          {previous.map((r) => (
            <QuarterCard
              key={r.id}
              memberId={memberId}
              periodQuarter={(r.period_quarter ?? r.period_start ?? r.created_at).slice(0, 10)}
              recap={r}
            />
          ))}
        </div>
      )}

      <GenerateQuarterlyDialog
        memberId={memberId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultStart={suggestStart}
        defaultEnd={suggestEnd}
      />
    </div>
  );
}
