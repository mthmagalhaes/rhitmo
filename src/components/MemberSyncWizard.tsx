import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface MemberSyncWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  initialData: {
    chronotype?: string | null;
    feedback_style?: string | null;
    recognition_style?: string | null;
    motivators?: string[] | null;
    user_manual?: Record<string, unknown> | null;
    work_style_data?: Record<string, unknown> | null;
  };
}

interface FormState {
  chronotype: string;
  energy_drainers: string;
  energy_boosters: string;
  motivators: string[];
  feedback_style: string;
  recognition_style: string;
  bad_day_support: string;
}

const MOTIVATOR_OPTIONS = ['autonomy', 'money', 'stability', 'learning', 'purpose', 'status'] as const;

export function MemberSyncWizard({ open, onOpenChange, memberId, initialData }: MemberSyncWizardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [savingFinal, setSavingFinal] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRenderRef = useRef(true);

  const um = (initialData.user_manual as Record<string, string>) || {};
  const wsd = (initialData.work_style_data as Record<string, string>) || {};

  const [form, setForm] = useState<FormState>({
    chronotype: initialData.chronotype || '',
    energy_drainers: um.energy_drainers || wsd.energy_drains || '',
    energy_boosters: um.energy_boosters || wsd.energy_sources || '',
    motivators: Array.isArray(initialData.motivators) ? (initialData.motivators as string[]) : [],
    feedback_style: initialData.feedback_style || '',
    recognition_style: initialData.recognition_style || '',
    bad_day_support: um.bad_day_support || wsd.support_needed || '',
  });

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(0);
      setAutoSaveStatus('idle');
      firstRenderRef.current = true;
    }
  }, [open]);

  // Auto-save (debounced 1.5s)
  useEffect(() => {
    if (!open) return;
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setAutoSaveStatus('saving');
    debounceRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('team_members')
          .update({
            chronotype: form.chronotype || null,
            feedback_style: form.feedback_style || null,
            recognition_style: form.recognition_style || null,
            motivators: form.motivators.length > 0 ? form.motivators : null,
            user_manual: {
              ...um,
              energy_drainers: form.energy_drainers || null,
              energy_boosters: form.energy_boosters || null,
              bad_day_support: form.bad_day_support || null,
            },
            work_style_data: {
              ...wsd,
              energy_drains: form.energy_drainers || null,
              energy_sources: form.energy_boosters || null,
              support_needed: form.bad_day_support || null,
              motivators: form.motivators.length > 0 ? form.motivators : null,
              completed_at: new Date().toISOString(),
            },
          })
          .eq('id', memberId);
        if (error) throw error;
        setAutoSaveStatus('saved');
      } catch (err) {
        console.error('[MemberSyncWizard] auto-save error:', err);
        setAutoSaveStatus('idle');
      }
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, open, memberId]);

  const toggleMotivator = (m: string) => {
    setForm((prev) => {
      if (prev.motivators.includes(m)) return { ...prev, motivators: prev.motivators.filter((x) => x !== m) };
      if (prev.motivators.length >= 3) return prev;
      return { ...prev, motivators: [...prev.motivators, m] };
    });
  };

  const handleFinish = async () => {
    setSavingFinal(true);
    try {
      // Force a final save flush
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const { error } = await supabase
        .from('team_members')
        .update({
          chronotype: form.chronotype || null,
          feedback_style: form.feedback_style || null,
          recognition_style: form.recognition_style || null,
          motivators: form.motivators.length > 0 ? form.motivators : null,
          user_manual: {
            ...um,
            energy_drainers: form.energy_drainers || null,
            energy_boosters: form.energy_boosters || null,
            bad_day_support: form.bad_day_support || null,
          },
          work_style_data: {
            ...wsd,
            energy_drains: form.energy_drainers || null,
            energy_sources: form.energy_boosters || null,
            support_needed: form.bad_day_support || null,
            motivators: form.motivators.length > 0 ? form.motivators : null,
            completed_at: new Date().toISOString(),
          },
        })
        .eq('id', memberId);
      if (error) throw error;
      toast.success(t('memberSyncWizard.savedToast'));
      queryClient.invalidateQueries({ queryKey: ['linked-member'] });
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(t('memberSyncWizard.errorToast'));
    } finally {
      setSavingFinal(false);
    }
  };

  const totalSteps = 3;
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>🎵 {t('memberSyncWizard.title')}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {autoSaveStatus === 'saving' && (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('memberSyncWizard.saving')}
                </span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {t('memberSyncWizard.saved')}
                </span>
              )}
            </span>
          </DialogTitle>
        </DialogHeader>

        <Progress value={progress} className="h-1" />

        <div className="space-y-5 py-4">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight mb-1">
                  ⚡ {t('memberSyncWizard.step1.title')}
                </h3>
                <p className="text-sm text-muted-foreground">{t('memberSyncWizard.step1.subtitle')}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('memberSyncWizard.step1.chronotype')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['early_bird', 'commercial', 'night_owl', 'variable'] as const).map((c) => (
                    <Card
                      key={c}
                      onClick={() => setForm((p) => ({ ...p, chronotype: c }))}
                      className={cn(
                        'cursor-pointer transition-all p-4 text-center text-sm',
                        form.chronotype === c
                          ? 'border-primary bg-primary/10 ring-2 ring-primary'
                          : 'hover:border-primary/50',
                      )}
                    >
                      {t(`memberSyncWizard.step1.chronotypeOptions.${c}`)}
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight mb-1">
                  💚 {t('memberSyncWizard.step2.title')}
                </h3>
                <p className="text-sm text-muted-foreground">{t('memberSyncWizard.step2.subtitle')}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('memberSyncWizard.step2.energyBoosters')}</Label>
                <Textarea
                  value={form.energy_boosters}
                  onChange={(e) => setForm((p) => ({ ...p, energy_boosters: e.target.value }))}
                  placeholder={t('memberSyncWizard.step2.energyBoostersPlaceholder')}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('memberSyncWizard.step2.energyDrainers')}</Label>
                <Textarea
                  value={form.energy_drainers}
                  onChange={(e) => setForm((p) => ({ ...p, energy_drainers: e.target.value }))}
                  placeholder={t('memberSyncWizard.step2.energyDrainersPlaceholder')}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t('memberSyncWizard.step2.motivators')}{' '}
                  <span className="text-xs text-muted-foreground">({form.motivators.length}/3)</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {MOTIVATOR_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMotivator(m)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                        form.motivators.includes(m)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary/40',
                      )}
                    >
                      {t(`memberSyncWizard.motivators.${m}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight mb-1">
                  📋 {t('memberSyncWizard.step3.title')}
                </h3>
                <p className="text-sm text-muted-foreground">{t('memberSyncWizard.step3.subtitle')}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('memberSyncWizard.step3.feedbackStyle')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['direct', 'empathetic', 'written', 'private'] as const).map((s) => (
                    <Card
                      key={s}
                      onClick={() => setForm((p) => ({ ...p, feedback_style: s }))}
                      className={cn(
                        'cursor-pointer transition-all p-3 text-center text-sm',
                        form.feedback_style === s
                          ? 'border-primary bg-primary/10 ring-2 ring-primary'
                          : 'hover:border-primary/50',
                      )}
                    >
                      {t(`memberSyncWizard.step3.feedbackStyleOptions.${s}`)}
                    </Card>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('memberSyncWizard.step3.recognitionStyle')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['public', 'private', 'results', 'learning'] as const).map((s) => (
                    <Card
                      key={s}
                      onClick={() => setForm((p) => ({ ...p, recognition_style: s }))}
                      className={cn(
                        'cursor-pointer transition-all p-3 text-center text-sm',
                        form.recognition_style === s
                          ? 'border-primary bg-primary/10 ring-2 ring-primary'
                          : 'hover:border-primary/50',
                      )}
                    >
                      {t(`memberSyncWizard.step3.recognitionStyleOptions.${s}`)}
                    </Card>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('memberSyncWizard.step3.badDaySupport')}</Label>
                <Textarea
                  value={form.bad_day_support}
                  onChange={(e) => setForm((p) => ({ ...p, bad_day_support: e.target.value }))}
                  placeholder={t('memberSyncWizard.step3.badDaySupportPlaceholder')}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-2 border-t">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
          {step < totalSteps - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} className="gap-1">
              {t('common.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={savingFinal} className="gap-1">
              {savingFinal && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('memberSyncWizard.finish')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
