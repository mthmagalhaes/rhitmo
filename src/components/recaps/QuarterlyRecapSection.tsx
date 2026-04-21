import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, CheckCircle2, RefreshCw, BarChart3, AlertTriangle } from 'lucide-react';
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

interface Props {
  memberId: string;
}

const CLASSIFICATION_LABELS: Record<RecapClassification, { title: string; sub: string }> = {
  precisa_subir: { title: 'Precisa subir a barra', sub: 'Gaps recorrentes em entrega ou comportamento.' },
  dentro_esperado: { title: 'Dentro do esperado', sub: 'Cumpre consistentemente, sem destaques.' },
  subindo_barra: { title: 'Subindo a barra', sub: 'Crescimento visível, entrega acima em vários aspectos.' },
  acima_esperado: { title: 'Acima do esperado', sub: 'Performance excepcional, padrão claro.' },
};

const RISK_LABELS: Record<RecapTurnoverRisk, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
};

const ACTION_LABELS: Record<string, string> = {
  improvement_plan_30_60_90: 'Montar plano de melhoria 30/60/90',
  direct_conversation: 'Conversa direta sobre o que precisa mudar',
  increase_1on1_frequency: 'Aumentar frequência de 1:1 para semanal',
  define_new_challenge: 'Definir um desafio novo para evitar estagnação',
  public_recognition: 'Reconhecer publicamente uma entrega específica',
  growth_conversation: 'Perguntar o que falta para ela querer crescer mais',
  high_visibility_project: 'Dar projeto de maior visibilidade ou complexidade',
  promotion_path_conversation: 'Iniciar conversa sobre próximo nível e promoção',
  stakeholder_exposure: 'Apresentar a stakeholders que ainda não a conhecem',
  anticipate_promotion: 'Antecipar conversa de promoção ou movimentação',
  protect_from_overload: 'Proteger o tempo dela de demandas que não condizem com o nível',
  external_mentorship: 'Conectar com mentores externos ou oportunidades de aprendizado',
};

function quarterLabel(periodQuarter: string) {
  const d = new Date(periodQuarter + 'T00:00:00Z');
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} ${d.getUTCFullYear()}`;
}

function getCurrentQuarterStart(): string {
  const d = new Date();
  const qStartMonth = Math.floor(d.getUTCMonth() / 3) * 3;
  return format(new Date(Date.UTC(d.getUTCFullYear(), qStartMonth - 3, 1)), 'yyyy-MM-01');
}

function QuarterCard({ memberId, recap, periodQuarter }: { memberId: string; recap: QuarterlyRecap | undefined; periodQuarter: string }) {
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
    <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Rhitmo Trimestral — {quarterLabel(periodQuarter)}
          </CardTitle>
          {isConfirmed && (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Confirmado
            </Badge>
          )}
          {recap?.status === 'draft' && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
              Rascunho
            </Badge>
          )}
        </div>
        {recap && (
          <p className="text-xs text-muted-foreground mt-1">
            Baseado em {recap.source_monthly_recap_ids.length} mensa{recap.source_monthly_recap_ids.length === 1 ? 'l' : 'is'} confirmado{recap.source_monthly_recap_ids.length === 1 ? '' : 's'} • {recap.source_feedbacks_count} notas • {recap.source_meetings_count} 1:1s
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {!recap && (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Confirme ao menos um Rhitmo Mensal do trimestre para gerar a calibração trimestral.
            </p>
            <Button
              onClick={() => generate.mutate({ periodQuarter })}
              disabled={generate.isPending}
              size="sm"
              className="rounded-xl"
            >
              {generate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar trimestral com IA
                </>
              )}
            </Button>
          </div>
        )}

        {recap && (
          <>
            {/* Highlights */}
            {recap.highlights.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Destaques do trimestre</h3>
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

            {/* Patterns */}
            {recap.recurring_patterns.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Padrões recorrentes</h3>
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
                <span className="text-xs font-semibold uppercase tracking-wider text-primary mr-1">vs trimestre anterior:</span>
                {recap.evolution_vs_previous}
              </div>
            )}

            {/* Classification */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Classificação {recap.ai_suggested_classification && <span className="ml-1 normal-case text-foreground/50">(IA sugere: {CLASSIFICATION_LABELS[recap.ai_suggested_classification].title})</span>}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CLASSIFICATIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={isConfirmed}
                    onClick={() => {
                      setClassification(c);
                      // reset action if it doesn't belong to new classification
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
                    <div className="text-sm font-semibold">{CLASSIFICATION_LABELS[c].title}</div>
                    <div className="text-xs text-muted-foreground">{CLASSIFICATION_LABELS[c].sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Turnover risk */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Risco de turnover
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
                    {RISK_LABELS[r]}
                  </button>
                ))}
              </div>
              {!isConfirmed && (
                <Textarea
                  value={riskReason}
                  onChange={(e) => setRiskReason(e.target.value)}
                  placeholder="Motivo (1 linha) — opcional mas recomendado se risco médio/alto"
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
                Próxima ação para o trimestre
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
                      {ACTION_LABELS[key]}
                      {recap.ai_suggested_next_action_key === key && (
                        <span className="ml-2 text-xs text-primary">(IA sugere)</span>
                      )}
                    </button>
                  ))}
                  {!isConfirmed && (
                    <Textarea
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="Observação (opcional)"
                      className="rounded-xl min-h-[52px] text-sm mt-2"
                    />
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Escolha uma classificação acima para ver as ações sugeridas.</p>
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
                  Confirmar trimestral
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
                  Regerar com IA
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function QuarterlyRecapSection({ memberId }: Props) {
  const { data: recaps = [], isLoading } = useQuarterlyRecaps(memberId, 4);
  const lastQuarter = getCurrentQuarterStart();
  const recapForLastQuarter = recaps.find((r) => r.period_quarter.slice(0, 10) === lastQuarter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando trimestrais...
      </div>
    );
  }

  // Show: last quarter (always — even if no recap, so the leader can generate it),
  // plus all previous recaps.
  const previous = recaps.filter((r) => r.period_quarter.slice(0, 10) !== lastQuarter);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Rhitmo Trimestral</h2>
        <p className="text-sm text-muted-foreground">
          A cada 3 meses, a IA junta os mensais e sugere classificação, risco e próxima ação. Você calibra em ~5 min.
        </p>
      </div>
      <QuarterCard memberId={memberId} periodQuarter={lastQuarter} recap={recapForLastQuarter} />
      {previous.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">
            Trimestres anteriores
          </h3>
          {previous.map((r) => (
            <QuarterCard key={r.id} memberId={memberId} periodQuarter={r.period_quarter.slice(0, 10)} recap={r} />
          ))}
        </div>
      )}
    </div>
  );
}
