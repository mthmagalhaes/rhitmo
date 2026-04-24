import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

interface LeaderSyncWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  existingData?: Record<string, unknown> | null;
}

type StepId = 'badge' | 'rhythm' | 'feedback' | 'future';

const steps: { id: StepId; title: string; emoji: string }[] = [
  { id: 'badge', title: 'Seu Crachá', emoji: '🧭' },
  { id: 'rhythm', title: 'Seu Ritmo', emoji: '⚡' },
  { id: 'feedback', title: 'Feedback', emoji: '🎯' },
  { id: 'future', title: 'Quem Quer Ser', emoji: '🚀' },
];

interface LeaderFormData {
  leadership_tenure: string;
  team_size: string;
  biggest_challenge: string;
  energizers: string[];
  drainers: string[];
  monitoring_style: string;
  difficult_feedback_style: string;
  low_performance_reaction: string;
  recognition_type: string;
  feedback_received: string;
  development_goal: string;
  desired_legacy: string;
}

const initialFormData: LeaderFormData = {
  leadership_tenure: '',
  team_size: '',
  biggest_challenge: '',
  energizers: [],
  drainers: [],
  monitoring_style: '',
  difficult_feedback_style: '',
  low_performance_reaction: '',
  recognition_type: '',
  feedback_received: '',
  development_goal: '',
  desired_legacy: '',
};

const tenureOptions = [
  { value: 'less_1', emoji: '🌱', title: 'Menos de 1 ano', description: 'Começando a jornada' },
  { value: '1_to_3', emoji: '🌿', title: '1 a 3 anos', description: 'Ganhando experiência' },
  { value: '3_to_5', emoji: '🌳', title: '3 a 5 anos', description: 'Consolidando o estilo' },
  { value: 'more_5', emoji: '🏔️', title: 'Mais de 5 anos', description: 'Veterano da liderança' },
];

const teamSizeOptions = [
  { value: '1_to_3', emoji: '👤', title: '1 a 3', description: 'Time enxuto' },
  { value: '4_to_7', emoji: '👥', title: '4 a 7', description: 'Time médio' },
  { value: '8_to_15', emoji: '👨‍👩‍👧‍👦', title: '8 a 15', description: 'Time grande' },
  { value: 'more_15', emoji: '🏢', title: 'Mais de 15', description: 'Organização' },
];

const energizerOptions = [
  { value: 'develop_people', label: '🌱 Desenvolver pessoas' },
  { value: 'see_growth', label: '📈 Ver o time crescer' },
  { value: 'solve_problems', label: '🧩 Resolver problemas complexos' },
  { value: 'build_culture', label: '🎨 Construir cultura' },
  { value: 'give_autonomy', label: '🚀 Dar autonomia e ver acontecer' },
  { value: 'be_close', label: '🤝 Estar próximo do dia a dia' },
];

const drainerOptions = [
  { value: 'conflicts', label: '⚔️ Conflitos interpessoais' },
  { value: 'no_clarity', label: '🌫️ Falta de clareza estratégica' },
  { value: 'too_many_meetings', label: '📅 Reuniões demais' },
  { value: 'unmotivated', label: '😔 Pessoas desmotivadas' },
  { value: 'micromanagement_above', label: '🔍 Microgerenciamento vindo de cima' },
  { value: 'no_time_1on1', label: '⏰ Falta de tempo para 1:1s' },
];

const monitoringOptions = [
  { value: 'close', emoji: '🔍', title: 'Bem de perto', description: 'Prefiro saber tudo' },
  { value: 'autonomy_check', emoji: '📊', title: 'Autonomia com check-ins', description: 'Dou autonomia mas checo regularmente' },
  { value: 'trust', emoji: '🤝', title: 'Confiança total', description: 'Confio e só entro se precisar' },
];

const feedbackStyleOptions = [
  { value: 'direct', emoji: '💬', title: 'Direto ao ponto', description: 'Sem rodeios' },
  { value: 'positive_first', emoji: '🥪', title: 'Começo pelo positivo', description: 'Antes de chegar no ponto' },
  { value: 'prepared', emoji: '📋', title: 'Preparo bem', description: 'Espero o momento certo' },
  { value: 'avoid', emoji: '😅', title: 'Evito um pouco...', description: 'Honestamente?' },
];

const lowPerfOptions = [
  { value: 'next_1on1', emoji: '📅', title: 'Próxima 1:1', description: 'Converso na próxima 1:1' },
  { value: 'immediate', emoji: '⚡', title: 'Imediatamente', description: 'Abordo assim que percebo' },
  { value: 'wait', emoji: '⏳', title: 'Dou um tempo', description: 'Para ver se melhora' },
  { value: 'document', emoji: '📝', title: 'Documento primeiro', description: 'Para ter contexto' },
];

const recognitionOptions = [
  { value: 'public_praise', emoji: '📢', title: 'Elogio em público', description: 'Na frente do time' },
  { value: 'private_praise', emoji: '🔒', title: 'Feedback positivo em privado', description: 'Na 1:1' },
  { value: 'more_responsibility', emoji: '📈', title: 'Mais responsabilidade', description: 'Confio mais desafios' },
  { value: 'more_autonomy', emoji: '🦅', title: 'Mais autonomia', description: 'Deixo voar solo' },
];

function SelectableCard({ emoji, title, description, selected, onClick }: {
  emoji: string; title: string; description: string; selected: boolean; onClick: () => void;
}) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:scale-105 p-4",
        selected
          ? "border-primary bg-primary/10 ring-2 ring-primary"
          : "border-border hover:border-primary/50"
      )}
      onClick={onClick}
    >
      <div className="text-center space-y-1">
        <div className="text-2xl">{emoji}</div>
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
}

function MultiSelectChips({ options, selected, onChange, max = 6 }: {
  options: { value: string; label: string }[]; selected: string[]; onChange: (v: string[]) => void; max?: number;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) onChange(selected.filter(v => v !== value));
    else if (selected.length < max) onChange([...selected, value]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => toggle(o.value)}
          className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all",
            selected.includes(o.value) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StepIndicator({ steps: s, currentIndex }: { steps: typeof steps; currentIndex: number }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4">
      {s.map((step, i) => (
        <div key={step.id} className={cn("flex items-center gap-1 sm:gap-2 text-xs sm:text-sm",
          i <= currentIndex ? "text-primary" : "text-muted-foreground")}>
          <div className={cn("w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium",
            i < currentIndex ? "bg-primary text-primary-foreground"
              : i === currentIndex ? "bg-primary/20 text-primary border-2 border-primary"
              : "bg-secondary text-muted-foreground")}>
            {i < currentIndex ? '✓' : step.emoji}
          </div>
          <span className="hidden sm:inline">{step.title}</span>
        </div>
      ))}
    </div>
  );
}

export function LeaderSyncWizard({ open, onOpenChange, workspaceId, existingData }: LeaderSyncWizardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [formData, setFormData] = useState<LeaderFormData>(() => {
    if (existingData) {
      return {
        leadership_tenure: (existingData.leadership_tenure as string) || '',
        team_size: (existingData.team_size as string) || '',
        biggest_challenge: (existingData.biggest_challenge as string) || '',
        energizers: (existingData.energizers as string[]) || [],
        drainers: (existingData.drainers as string[]) || [],
        monitoring_style: (existingData.monitoring_style as string) || '',
        difficult_feedback_style: (existingData.difficult_feedback_style as string) || '',
        low_performance_reaction: (existingData.low_performance_reaction as string) || '',
        recognition_type: (existingData.recognition_type as string) || '',
        feedback_received: (existingData.feedback_received as string) || '',
        development_goal: (existingData.development_goal as string) || '',
        desired_legacy: (existingData.desired_legacy as string) || '',
      };
    }
    return { ...initialFormData };
  });

  const update = <K extends keyof LeaderFormData>(key: K, value: LeaderFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return !!formData.leadership_tenure && !!formData.team_size;
      case 1: return formData.energizers.length >= 1 && formData.drainers.length >= 1 && !!formData.monitoring_style;
      case 2: return !!formData.difficult_feedback_style && !!formData.low_performance_reaction && !!formData.recognition_type;
      case 3: return true;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        version: 1,
        completed_at: new Date().toISOString(),
      };

      const { error } = await (supabase
        .from('workspaces') as any)
        .update({
          leader_sync_data: payload,
          leader_sync_completed_at: new Date().toISOString(),
        })
        .eq('id', workspaceId)
        .eq('owner_id', user.id);

      if (error) throw error;

      setCompleted(true);
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      toast.success('Perfil de liderança salvo! O Mentor ficou mais inteligente 🧠');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (completed) {
      setCompleted(false);
      setCurrentStep(0);
    }
    onOpenChange(false);
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {completed ? (
          <div className="p-8 text-center space-y-6">
            <div className="text-6xl">🎧</div>
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Perfil de Liderança Configurado!</h1>
              <p className="text-muted-foreground">
                O Mentor de Liderança agora conhece seu estilo e vai dar orientações muito mais relevantes.
              </p>
            </div>
            <Button onClick={handleClose} className="rounded-full px-8">Fechar</Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 sm:p-6 text-center border-b">
              <h1 className="text-xl sm:text-2xl font-bold text-primary">🎵 Rhitmo Sync — Líder</h1>
              <p className="text-sm text-muted-foreground mt-1">Configure seu perfil de liderança</p>
            </div>

            {/* Progress */}
            <div className="px-4 py-3 border-b">
              <StepIndicator steps={steps} currentIndex={currentStep} />
              <Progress value={progress} className="h-2 max-w-lg mx-auto" />
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* Step 1 */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-semibold">🧭 Seu Crachá de Líder</h2>
                    <p className="text-muted-foreground text-sm">Vamos conhecer sua trajetória</p>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base">Há quanto tempo você lidera pessoas? *</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {tenureOptions.map(o => (
                        <SelectableCard key={o.value} {...o} selected={formData.leadership_tenure === o.value}
                          onClick={() => update('leadership_tenure', o.value)} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base">Quantas pessoas você gerencia diretamente? *</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {teamSizeOptions.map(o => (
                        <SelectableCard key={o.value} {...o} selected={formData.team_size === o.value}
                          onClick={() => update('team_size', o.value)} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Qual é seu maior desafio como gestor agora?</Label>
                    <Textarea placeholder="Ex: dar feedback difícil, delegar sem microgerenciar, manter o time motivado..."
                      value={formData.biggest_challenge} onChange={e => update('biggest_challenge', e.target.value)} rows={3} />
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-semibold">⚡ Seu Ritmo como Gestor</h2>
                    <p className="text-muted-foreground text-sm">O que te move e o que te freia</p>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base">O que te energiza de verdade na liderança? *</Label>
                    <MultiSelectChips options={energizerOptions} selected={formData.energizers}
                      onChange={v => update('energizers', v)} />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base">O que mais te drena como gestor? *</Label>
                    <MultiSelectChips options={drainerOptions} selected={formData.drainers}
                      onChange={v => update('drainers', v)} />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base">Como você naturalmente acompanha seu time? *</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {monitoringOptions.map(o => (
                        <SelectableCard key={o.value} {...o} selected={formData.monitoring_style === o.value}
                          onClick={() => update('monitoring_style', o.value)} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-semibold">🎯 Seu Jeito de Dar Feedback</h2>
                    <p className="text-muted-foreground text-sm">Sem julgamento — só autoconhecimento 😉</p>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base">Como você costuma dar um feedback difícil? *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {feedbackStyleOptions.map(o => (
                        <SelectableCard key={o.value} {...o} selected={formData.difficult_feedback_style === o.value}
                          onClick={() => update('difficult_feedback_style', o.value)} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base">Quando alguém performa abaixo do esperado, sua primeira reação é: *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {lowPerfOptions.map(o => (
                        <SelectableCard key={o.value} {...o} selected={formData.low_performance_reaction === o.value}
                          onClick={() => update('low_performance_reaction', o.value)} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-base">Que tipo de reconhecimento você dá mais naturalmente? *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {recognitionOptions.map(o => (
                        <SelectableCard key={o.value} {...o} selected={formData.recognition_type === o.value}
                          onClick={() => update('recognition_type', o.value)} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4 */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-semibold">🚀 Quem Você Quer Ser</h2>
                    <p className="text-muted-foreground text-sm">Visão de futuro — só você vê isso</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Que feedback você recebe com mais frequência sobre sua liderança?</Label>
                    <Textarea placeholder="Pode ser positivo ou construtivo — seja honesto, só você vê isso 😉"
                      value={formData.feedback_received} onChange={e => update('feedback_received', e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>O que você quer desenvolver como líder nos próximos 6 meses?</Label>
                    <Textarea placeholder="Ex: delegar melhor, dar feedbacks mais frequentes, desenvolver líderes no time"
                      value={formData.development_goal} onChange={e => update('development_goal', e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>O que você gostaria que seu time falasse de você daqui a 1 ano?</Label>
                    <Textarea placeholder="Sonha alto 🚀"
                      value={formData.desired_legacy} onChange={e => update('desired_legacy', e.target.value)} rows={3} />
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="p-4 sm:p-6 border-t flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(p => p - 1)} disabled={currentStep === 0}
                className="rounded-full gap-2">
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              {isLastStep ? (
                <Button onClick={handleSubmit} disabled={submitting || !canProceed()} className="rounded-full gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Salvar Perfil
                </Button>
              ) : (
                <Button onClick={() => setCurrentStep(p => p + 1)} disabled={!canProceed()} className="rounded-full gap-2">
                  Próximo <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
