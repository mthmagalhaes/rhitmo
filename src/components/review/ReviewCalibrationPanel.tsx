import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Sparkles, Award, TrendingUp, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  CLASSIFICATIONS,
  type RecapClassification,
} from '@/lib/recapActions';

export type PromotionRecommendation = 'not_now' | 'in_1_2_cycles' | 'ready_now';
export type LossRisk = 'low' | 'medium' | 'high';
export type MeritRecommendation = 'none' | 'inflation_only' | 'inflation_plus_merit';

const CLASSIFICATION_LABELS: Record<RecapClassification, { title: string; sub: string }> = {
  precisa_subir: { title: 'Precisa subir a barra', sub: 'Gaps recorrentes em entrega ou comportamento.' },
  dentro_esperado: { title: 'Dentro do esperado', sub: 'Cumpre consistentemente, sem destaques.' },
  subindo_barra: { title: 'Subindo a barra', sub: 'Crescimento visível, entrega acima em vários aspectos.' },
  acima_esperado: { title: 'Acima do esperado', sub: 'Performance excepcional, padrão claro.' },
};

const PROMOTION_OPTIONS: { value: PromotionRecommendation; label: string; sub: string }[] = [
  { value: 'not_now', label: 'Não neste ciclo', sub: 'Mantém no nível atual.' },
  { value: 'in_1_2_cycles', label: 'Em 1-2 ciclos', sub: 'Está construindo a maturidade.' },
  { value: 'ready_now', label: 'Pronta agora', sub: 'Atende ao próximo nível.' },
];

const LOSS_RISK_OPTIONS: { value: LossRisk; label: string }[] = [
  { value: 'low', label: 'Baixo' },
  { value: 'medium', label: 'Médio' },
  { value: 'high', label: 'Alto' },
];

const MERIT_OPTIONS: { value: MeritRecommendation; label: string; sub: string }[] = [
  { value: 'none', label: 'Sem ajuste', sub: 'Sem mudança salarial neste ciclo.' },
  { value: 'inflation_only', label: 'Somente inflação', sub: 'Reposição do poder de compra.' },
  { value: 'inflation_plus_merit', label: 'Inflação + mérito', sub: 'Reconhecimento do desempenho.' },
];

interface Props {
  reviewId: string;
  initial: {
    classification: RecapClassification | null;
    promotion_recommendation: PromotionRecommendation | null;
    loss_risk: LossRisk | null;
    merit_recommendation: MeritRecommendation | null;
  };
  disabled?: boolean;
}

export function ReviewCalibrationPanel({ reviewId, initial, disabled }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [classification, setClassification] = useState<RecapClassification | null>(initial.classification);
  const [promotion, setPromotion] = useState<PromotionRecommendation | null>(initial.promotion_recommendation);
  const [risk, setRisk] = useState<LossRisk | null>(initial.loss_risk);
  const [merit, setMerit] = useState<MeritRecommendation | null>(initial.merit_recommendation);

  useEffect(() => {
    setClassification(initial.classification);
    setPromotion(initial.promotion_recommendation);
    setRisk(initial.loss_risk);
    setMerit(initial.merit_recommendation);
  }, [reviewId, initial.classification, initial.promotion_recommendation, initial.loss_risk, initial.merit_recommendation]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('performance_reviews')
        .update({
          classification,
          promotion_recommendation: promotion,
          loss_risk: risk,
          merit_recommendation: merit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['formal-review', reviewId] });
      qc.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast({ title: 'Calibração salva', description: 'Será considerada quando você compartilhar com o liderado.' });
    },
    onError: (e: any) => {
      toast({ title: 'Erro ao salvar calibração', description: e.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="text-sm text-foreground/80">
          <p className="font-medium">Bloco 6 — Calibração formal</p>
          <p className="text-xs text-muted-foreground mt-1">
            A IA sugere com base nos trimestrais confirmados. Você confirma. As escolhas alimentam o histórico longitudinal e ficam disponíveis para o RH no Enterprise.
          </p>
        </div>
      </div>

      {/* Classificação */}
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            Classificação de desempenho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CLASSIFICATIONS.map((c) => (
              <button
                key={c}
                type="button"
                disabled={disabled}
                onClick={() => setClassification(c)}
                className={cn(
                  'text-left rounded-xl p-3 border transition-all',
                  classification === c
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border hover:border-foreground/20',
                  disabled && 'opacity-70 cursor-not-allowed',
                )}
              >
                <div className="text-sm font-semibold">{CLASSIFICATION_LABELS[c].title}</div>
                <div className="text-xs text-muted-foreground">{CLASSIFICATION_LABELS[c].sub}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Promoção */}
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            Promoção
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PROMOTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => setPromotion(opt.value)}
                className={cn(
                  'text-left rounded-xl p-3 border transition-all',
                  promotion === opt.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border hover:border-foreground/20',
                  disabled && 'opacity-70 cursor-not-allowed',
                )}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.sub}</div>
              </button>
            ))}
          </div>

          {promotion === 'ready_now' && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Risco de perder se não promover
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {LOSS_RISK_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setRisk(r.value)}
                    className={cn(
                      'text-sm rounded-xl px-4 py-2 border transition-all',
                      risk === r.value ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-foreground/20',
                      disabled && 'opacity-70 cursor-not-allowed',
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mérito */}
      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Mérito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {MERIT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => setMerit(opt.value)}
                className={cn(
                  'text-left rounded-xl p-3 border transition-all',
                  merit === opt.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border hover:border-foreground/20',
                  disabled && 'opacity-70 cursor-not-allowed',
                )}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.sub}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumo da calibração */}
      {(classification || promotion || merit) && (
        <div className="rounded-2xl bg-muted/30 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumo da calibração</p>
          <div className="flex flex-wrap gap-2">
            {classification && (
              <Badge variant="outline" className="rounded-lg">
                {CLASSIFICATION_LABELS[classification].title}
              </Badge>
            )}
            {promotion && (
              <Badge variant="outline" className="rounded-lg">
                Promoção: {PROMOTION_OPTIONS.find((o) => o.value === promotion)?.label}
              </Badge>
            )}
            {promotion === 'ready_now' && risk && (
              <Badge variant="outline" className="rounded-lg">
                Risco: {LOSS_RISK_OPTIONS.find((o) => o.value === risk)?.label}
              </Badge>
            )}
            {merit && (
              <Badge variant="outline" className="rounded-lg">
                Mérito: {MERIT_OPTIONS.find((o) => o.value === merit)?.label}
              </Badge>
            )}
          </div>
        </div>
      )}

      {!disabled && (
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-xl gap-2"
        >
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar calibração
        </Button>
      )}
    </div>
  );
}
