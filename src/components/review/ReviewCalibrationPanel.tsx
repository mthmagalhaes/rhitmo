import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Sparkles, Award, TrendingUp, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CLASSIFICATIONS, type RecapClassification } from '@/lib/recapActions';

export type PromotionRecommendation = 'not_now' | 'in_1_2_cycles' | 'ready_now';
export type LossRisk = 'low' | 'medium' | 'high';
export type MeritRecommendation = 'none' | 'inflation_only' | 'inflation_plus_merit';

const PROMOTION_VALUES: PromotionRecommendation[] = ['not_now', 'in_1_2_cycles', 'ready_now'];
const LOSS_RISK_VALUES: LossRisk[] = ['low', 'medium', 'high'];
const MERIT_VALUES: MeritRecommendation[] = ['none', 'inflation_only', 'inflation_plus_merit'];

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
  const { t } = useTranslation('rhitmo');
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
      toast({ title: t('review.calibration.saved') });
    },
    onError: (e: any) => {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="text-sm text-foreground/80">
          <p className="font-medium">{t('review.calibration.title')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('review.calibration.intro')}</p>
        </div>
      </div>

      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            {t('review.calibration.classificationLabel')}
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
                <div className="text-sm font-semibold">{t(`recap.classifications.${c}`)}</div>
                <div className="text-xs text-muted-foreground">{t(`recap.classifications.${c}_sub`)}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            {t('review.calibration.promotionLabel')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PROMOTION_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                disabled={disabled}
                onClick={() => setPromotion(v)}
                className={cn(
                  'text-left rounded-xl p-3 border transition-all',
                  promotion === v
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border hover:border-foreground/20',
                  disabled && 'opacity-70 cursor-not-allowed',
                )}
              >
                <div className="text-sm font-semibold">{t(`review.calibration.promotion.${v}`)}</div>
                <div className="text-xs text-muted-foreground">{t(`review.calibration.promotion.${v}_sub`)}</div>
              </button>
            ))}
          </div>

          {promotion === 'ready_now' && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('review.calibration.lossRiskLabel')}
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {LOSS_RISK_VALUES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={disabled}
                    onClick={() => setRisk(r)}
                    className={cn(
                      'text-sm rounded-xl px-4 py-2 border transition-all',
                      risk === r ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-foreground/20',
                      disabled && 'opacity-70 cursor-not-allowed',
                    )}
                  >
                    {t(`recap.risks.${r}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            {t('review.calibration.meritLabel')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {MERIT_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                disabled={disabled}
                onClick={() => setMerit(v)}
                className={cn(
                  'text-left rounded-xl p-3 border transition-all',
                  merit === v
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border hover:border-foreground/20',
                  disabled && 'opacity-70 cursor-not-allowed',
                )}
              >
                <div className="text-sm font-semibold">{t(`review.calibration.merit.${v}`)}</div>
                <div className="text-xs text-muted-foreground">{t(`review.calibration.merit.${v}_sub`)}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {(classification || promotion || merit) && (
        <div className="rounded-2xl bg-muted/30 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('review.calibration.summary')}
          </p>
          <div className="flex flex-wrap gap-2">
            {classification && (
              <Badge variant="outline" className="rounded-lg">
                {t(`recap.classifications.${classification}`)}
              </Badge>
            )}
            {promotion && (
              <Badge variant="outline" className="rounded-lg">
                {t('review.calibration.promotionLabel')}: {t(`review.calibration.promotion.${promotion}`)}
              </Badge>
            )}
            {promotion === 'ready_now' && risk && (
              <Badge variant="outline" className="rounded-lg">
                {t('review.calibration.lossRiskLabel')}: {t(`recap.risks.${risk}`)}
              </Badge>
            )}
            {merit && (
              <Badge variant="outline" className="rounded-lg">
                {t('review.calibration.meritLabel')}: {t(`review.calibration.merit.${merit}`)}
              </Badge>
            )}
          </div>
        </div>
      )}

      {!disabled && (
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-xl gap-2">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('review.calibration.save')}
        </Button>
      )}
    </div>
  );
}
