// Rhitmo 2.0 — Grade de calibração do time.
// Uma linha por liderado, IA sugere à esquerda, líder decide à direita.
// Nada entra no histórico sem confirmação explícita.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Sparkles, AlertTriangle, FileText, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { CLASSIFICATIONS } from '@/lib/recapActions';
import type {
  CalibrationGridRow, CalibrationSession, CalibClassification,
  CalibPromotion, CalibRisk, CalibMerit,
} from '@/hooks/useCalibration';

const PROMOTIONS: CalibPromotion[] = ['not_now', 'in_1_2_cycles', 'ready_now'];
const RISKS: CalibRisk[] = ['low', 'medium', 'high'];
const MERITS: CalibMerit[] = ['none', 'inflation_only', 'inflation_plus_merit'];

const CLASS_TONE: Record<CalibClassification, string> = {
  precisa_subir: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  dentro_esperado: 'bg-muted text-muted-foreground border-border',
  subindo_barra: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  acima_esperado: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
};

const RISK_TONE: Record<CalibRisk, string> = {
  low: 'bg-muted text-muted-foreground border-border',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  high: 'bg-destructive/10 text-destructive border-destructive/20',
};

interface Props {
  session: CalibrationSession;
  rows: CalibrationGridRow[];
  readOnly?: boolean;
  onSave: (memberId: string, patch: Record<string, unknown>) => void;
  saving?: boolean;
}

export function CalibrationGrid({ session, rows, readOnly, onSave, saving }: Props) {
  const { t } = useTranslation('rhitmo');
  const [detail, setDetail] = useState<CalibrationGridRow | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const classLabel = (c: CalibClassification | null) =>
    c ? t(`recap.classifications.${c}`) : null;

  const distribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const c = r.decision_classification ?? r.ai_classification;
      if (c) counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  }, [rows]);

  const confirmedCount = rows.filter((r) => r.decision_confirmed_at).length;
  const noEvidence = rows.filter(
    (r) => r.quarterly_confirmed_count === 0 && r.monthly_confirmed_count === 0,
  ).length;

  const openDetail = (row: CalibrationGridRow) => {
    setDetail(row);
    setNoteDraft(row.decision_note ?? '');
  };

  return (
    <div className="space-y-5">
      {/* Distribuição */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Distribuição do ciclo
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {confirmedCount} de {rows.length} pessoas confirmadas
              {noEvidence > 0 && ` • ${noEvidence} sem trimestral ou mensal no período`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CLASSIFICATIONS.map((c) => (
              <Badge key={c} variant="outline" className={cn('rounded-xl font-normal', CLASS_TONE[c])}>
                {t(`recap.classifications.${c}`)} · {distribution[c] ?? 0}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Grade */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium text-xs text-muted-foreground">Pessoa</th>
                <th className="px-4 py-3 font-medium text-xs text-muted-foreground">IA sugere</th>
                <th className="px-4 py-3 font-medium text-xs text-muted-foreground">Base</th>
                <th className="px-4 py-3 font-medium text-xs text-muted-foreground">Classificação</th>
                <th className="px-4 py-3 font-medium text-xs text-muted-foreground">Promoção</th>
                <th className="px-4 py-3 font-medium text-xs text-muted-foreground">Risco</th>
                <th className="px-4 py-3 font-medium text-xs text-muted-foreground">Mérito</th>
                <th className="px-4 py-3 font-medium text-xs text-muted-foreground text-right">Ata</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const thin = r.quarterly_confirmed_count === 0 && r.monthly_confirmed_count === 0;
                return (
                  <tr key={r.member_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openDetail(r)}
                        className="text-left hover:underline"
                      >
                        <span className="font-medium">{r.member_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {r.member_role || r.team_name}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {r.ai_classification ? (
                        <Badge variant="outline" className={cn('rounded-xl font-normal', CLASS_TONE[r.ai_classification])}>
                          <Sparkles className="h-3 w-3 mr-1" />
                          {classLabel(r.ai_classification)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">sem trimestral</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs', thin ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                        {thin && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                        {r.monthly_confirmed_count}M · {r.quarterly_confirmed_count}T · {r.feedbacks_count} notas
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        disabled={readOnly}
                        value={r.decision_classification ?? undefined}
                        onValueChange={(v) =>
                          onSave(r.member_id, {
                            classification: v,
                            ai_suggested_classification: r.ai_classification,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-[168px] rounded-xl text-xs">
                          <SelectValue placeholder={r.ai_classification ? 'Aceitar sugestão' : 'Escolher'} />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASSIFICATIONS.map((c) => (
                            <SelectItem key={c} value={c}>{t(`recap.classifications.${c}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        disabled={readOnly}
                        value={r.decision_promotion ?? undefined}
                        onValueChange={(v) => onSave(r.member_id, { promotion_recommendation: v })}
                      >
                        <SelectTrigger className="h-8 w-[140px] rounded-xl text-xs">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROMOTIONS.map((p) => (
                            <SelectItem key={p} value={p}>{t(`review.calibration.promotion.${p}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        disabled={readOnly}
                        value={r.decision_loss_risk ?? undefined}
                        onValueChange={(v) => onSave(r.member_id, { loss_risk: v })}
                      >
                        <SelectTrigger className={cn('h-8 w-[104px] rounded-xl text-xs', r.decision_loss_risk && RISK_TONE[r.decision_loss_risk])}>
                          <SelectValue placeholder={r.ai_turnover_risk ? t(`recap.risks.${r.ai_turnover_risk}`) + ' (IA)' : '—'} />
                        </SelectTrigger>
                        <SelectContent>
                          {RISKS.map((x) => (
                            <SelectItem key={x} value={x}>{t(`recap.risks.${x}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        disabled={readOnly}
                        value={r.decision_merit ?? undefined}
                        onValueChange={(v) => onSave(r.member_id, { merit_recommendation: v })}
                      >
                        <SelectTrigger className="h-8 w-[150px] rounded-xl text-xs">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {MERITS.map((m) => (
                            <SelectItem key={m} value={m}>{t(`review.calibration.merit.${m}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.decision_confirmed_at ? (
                        <Badge variant="outline" className="rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-normal">
                          <Check className="h-3 w-3 mr-1" /> Registrado
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl h-8"
                          disabled={readOnly || saving || !r.decision_classification}
                          onClick={() => onSave(r.member_id, { confirmed: true })}
                        >
                          Registrar
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    <Users className="h-5 w-5 mx-auto mb-2 opacity-50" />
                    Nenhum liderado ativo no período desta sessão.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pré-read por pessoa */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="font-serif tracking-tight">{detail.member_name}</SheetTitle>
                <SheetDescription>
                  {detail.member_role || detail.team_name} • ciclo {session.cycle_label}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80 mb-2">
                    Pré-read
                  </p>
                  <p className="text-sm">
                    {detail.ai_classification
                      ? <>A IA sugere <strong>{classLabel(detail.ai_classification)}</strong>
                        {detail.ai_turnover_risk && <> com risco de saída <strong>{t(`recap.risks.${detail.ai_turnover_risk}`)}</strong></>}.</>
                      : 'Sem trimestral confirmado no período — a sugestão da IA fica indisponível para esta pessoa.'}
                  </p>
                  {detail.evolution_vs_previous && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Versus o ciclo anterior: {detail.evolution_vs_previous}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Mensais confirmados', detail.monthly_confirmed_count],
                    ['Trimestrais confirmados', detail.quarterly_confirmed_count],
                    ['Anotações no período', detail.feedbacks_count],
                    ['1:1s no período', detail.meetings_count],
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded-2xl border border-border/60 p-3">
                      <p className="text-xl font-semibold">{value as number}</p>
                      <p className="text-xs text-muted-foreground">{label as string}</p>
                    </div>
                  ))}
                </div>

                {detail.last_review_classification && (
                  <div className="rounded-2xl border border-border/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Última avaliação formal
                    </p>
                    <p className="text-sm">{classLabel(detail.last_review_classification)}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                    Observação da calibração
                  </p>
                  <Textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    disabled={readOnly}
                    rows={4}
                    className="rounded-xl"
                    placeholder="O que foi discutido e por que a decisão ficou assim..."
                  />
                  <Button
                    size="sm"
                    className="rounded-xl mt-3"
                    disabled={readOnly || saving}
                    onClick={() => onSave(detail.member_id, { note: noteDraft })}
                  >
                    Salvar observação
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
