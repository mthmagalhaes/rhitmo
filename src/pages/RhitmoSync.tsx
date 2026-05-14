import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
type WizardStep = 'identity' | 'rhythm' | 'manual' | 'future';

interface SyncFormData {
  // Step 1: Identity
  gender: string;
  birthYear: string;
  hobbies: string;
  
  // Step 2: Rhythm
  chronotype: 'morning' | 'commercial' | 'night' | '';
  idealEnvironment: 'silence' | 'music' | 'buzz' | '';
  energyDrainers: string;
  energyBoosters: string;
  
  // Step 3: Manual
  stressSigns: string;
  badDaySupport: string;
  feedbackStyle: 'direct' | 'empathetic' | 'written' | '';
  recognitionStyle: 'public' | 'private' | '';
  
  // Step 4: Future
  motivators: string[];
  skillGoal: string;
}

const steps: { id: WizardStep; title: string; emoji: string }[] = [
  { id: 'identity', title: 'Quem Sou Eu', emoji: '🆔' },
  { id: 'rhythm', title: 'Ritmo e Energia', emoji: '⚡' },
  { id: 'manual', title: 'Manual', emoji: '🆘' },
  { id: 'future', title: 'Futuro', emoji: '🚀' },
];

const chronotypeOptions = [
  { value: 'morning', emoji: '🌅', title: 'Madrugador', description: 'Rendo melhor entre 5h e 10h' },
  { value: 'commercial', emoji: '🏢', title: 'Horário Comercial', description: 'Funciono bem das 9h às 18h' },
  { value: 'night', emoji: '🦉', title: 'Noturno', description: 'Minha energia vem depois das 18h' },
];

const feedbackStyleOptions = [
  { value: 'direct', emoji: '💬', title: 'Direto', description: 'Sem rodeios, objetivo' },
  { value: 'empathetic', emoji: '🤗', title: 'Empático', description: 'Com contexto e cuidado' },
  { value: 'written', emoji: '✍️', title: 'Escrito', description: 'Prefiro ler e processar' },
];

const recognitionOptions = [
  { value: 'public', emoji: '👥', title: 'Público', description: 'Gosto de reconhecimento em grupo' },
  { value: 'private', emoji: '🔒', title: 'Privado', description: 'Prefiro 1:1 com meu líder' },
];

const motivatorOptions = [
  { value: 'autonomy', label: '🎯 Autonomia' },
  { value: 'money', label: '💰 Dinheiro' },
  { value: 'stability', label: '🏠 Estabilidade' },
  { value: 'learning', label: '📚 Aprendizado' },
  { value: 'purpose', label: '💡 Propósito' },
  { value: 'status', label: '🏆 Status' },
];

const initialFormData: SyncFormData = {
  gender: '',
  birthYear: '',
  hobbies: '',
  chronotype: '',
  idealEnvironment: '',
  energyDrainers: '',
  energyBoosters: '',
  stressSigns: '',
  badDaySupport: '',
  feedbackStyle: '',
  recognitionStyle: '',
  motivators: [],
  skillGoal: '',
};

// Selectable Card Component
function SelectableCard({ 
  emoji, 
  title, 
  description, 
  selected, 
  onClick 
}: { 
  emoji: string; 
  title: string; 
  description: string; 
  selected: boolean; 
  onClick: () => void;
}) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:scale-105 p-4 sm:p-6",
        selected 
          ? "border-primary bg-primary/10 ring-2 ring-primary" 
          : "border-border hover:border-primary/50"
      )}
      onClick={onClick}
    >
      <div className="text-center space-y-2">
        <div className="text-3xl sm:text-4xl">{emoji}</div>
        <h4 className="font-semibold text-sm sm:text-base">{title}</h4>
        <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
}

// Multi-select Chips Component
function MultiSelectChips({
  options,
  selected,
  onChange,
  max = 3,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  max?: number;
}) {
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else if (selected.length < max) {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => toggleOption(option.value)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            selected.includes(option.value)
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Step Indicator Component
function StepIndicator({ 
  steps: stepsList, 
  currentIndex 
}: { 
  steps: { id: WizardStep; title: string; emoji: string }[]; 
  currentIndex: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6">
      {stepsList.map((step, index) => (
        <div 
          key={step.id} 
          className={cn(
            "flex items-center gap-1 sm:gap-2 text-xs sm:text-sm",
            index <= currentIndex ? "text-primary" : "text-muted-foreground"
          )}
        >
          <div className={cn(
            "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium",
            index < currentIndex 
              ? "bg-primary text-primary-foreground" 
              : index === currentIndex 
                ? "bg-primary/20 text-primary border-2 border-primary" 
                : "bg-secondary text-muted-foreground"
          )}>
            {index < currentIndex ? '✓' : step.emoji}
          </div>
          <span className="hidden sm:inline">{step.title}</span>
        </div>
      ))}
    </div>
  );
}

export default function RhitmoSync() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<SyncFormData>(initialFormData);
  const [memberName, setMemberName] = useState<string>('');
  const [memberEmail, setMemberEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [notLinked, setNotLinked] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadMemberData();
  }, [memberId]);

  const loadMemberData = async () => {
    if (!memberId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .rpc('get_member_for_sync', { p_member_id: memberId });

      if (error) throw error;
      if (!data || (Array.isArray(data) && data.length === 0)) {
        setNotFound(true);
        return;
      }

      const member = Array.isArray(data) ? data[0] : data;

      setMemberName(member.name);

      if (member.work_style_data) {
        setCompleted(true);
        return;
      }

      // Gating: liderado precisa estar logado E vinculado a este team_member
      if (!user || !member.linked_user_id || member.linked_user_id !== user.id) {
        setNotLinked(true);
        return;
      }
    } catch (error) {
      console.error('Error loading member:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = <K extends keyof SyncFormData>(
    key: K, 
    value: SyncFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: // Identity - all optional
        return true;
      case 1: // Rhythm - chronotype required
        return !!formData.chronotype;
      case 2: // Manual - feedback and recognition required
        return !!formData.feedbackStyle && !!formData.recognitionStyle;
      case 3: // Future - at least 1 motivator
        return formData.motivators.length >= 1;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    const userManual = {
      stress_signs: formData.stressSigns,
      bad_day_support: formData.badDaySupport,
      ideal_environment: formData.idealEnvironment,
      hobbies: formData.hobbies,
      energy_drainers: formData.energyDrainers,
      energy_boosters: formData.energyBoosters,
      skill_goal: formData.skillGoal,
    };

    const workStyleData = {
      completed_at: new Date().toISOString(),
      version: 2,
    };

    try {
      const { data: success, error } = await supabase.rpc('submit_rhitmo_sync_v2', {
        p_member_id: memberId,
        p_birth_year: formData.birthYear ? parseInt(formData.birthYear) : null,
        p_gender: formData.gender || null,
        p_chronotype: formData.chronotype || null,
        p_feedback_style: formData.feedbackStyle || null,
        p_recognition_style: formData.recognitionStyle || null,
        p_motivators: formData.motivators as unknown as Json,
        p_user_manual: userManual as unknown as Json,
        p_work_style_data: workStyleData as unknown as Json,
      });

      if (error) throw error;
      if (!success) {
        throw new Error('Este questionário já foi preenchido');
      }

      // Fire-and-forget: notificar líder que o sync foi completado
      if (memberId) {
        Promise.resolve(supabase.rpc('get_sync_notification_data', { p_member_id: memberId }))
          .then(({ data: notifData }) => {
            if (notifData && notifData.length > 0) {
              const nd = notifData[0];
              supabase.functions.invoke('send-transactional-email', {
                body: {
                  templateName: 'sync-completed',
                  recipientEmail: nd.leader_email,
                  idempotencyKey: `sync-completed-${memberId}`,
                  templateData: {
                    memberName: nd.member_name,
                    leaderName: nd.leader_name,
                    teamName: nd.team_name,
                    profileUrl: `${window.location.origin}/member/${memberId}`,
                  }
                }
              }).catch(console.error);
            }
          })
          .catch(console.error);
      }

      setCompleted(true);
      toast.success('Perfil sintonizado com sucesso!');
    } catch (error: unknown) {
      console.error('Error submitting:', error);
      const rawMessage = error instanceof Error ? error.message : '';
      const isUnauthorized = /unauthorized/i.test(rawMessage);
      const errorMessage = isUnauthorized
        ? 'Sua conta ainda não está vinculada como liderado. Aceite o convite enviado pelo seu líder antes de responder.'
        : (rawMessage || 'Erro ao salvar suas respostas. Tente novamente.');
      toast.error(errorMessage);
      if (isUnauthorized) setNotLinked(true);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Membro não encontrado
  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4 rounded-2xl">
          <div className="text-5xl">🔍</div>
          <h1 className="text-xl font-bold tracking-tight">Link inválido</h1>
          <p className="text-sm text-muted-foreground">
            Não encontramos esse questionário. Peça ao seu líder para reenviar o convite.
          </p>
        </Card>
      </div>
    );
  }

  // Liderado não vinculado: precisa aceitar o convite primeiro
  if (notLinked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-5 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <div className="text-5xl">🔐</div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Falta ativar sua conta{memberName ? `, ${memberName.split(' ')[0]}` : ''}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Seu líder te adicionou como liderado, mas o questionário só pode ser
              respondido depois que você criar sua conta no Rhitmo com o e-mail
              que recebeu o convite.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <Button
              className="w-full rounded-xl"
              onClick={() => navigate('/auth')}
            >
              Entrar ou criar minha conta
            </Button>
            <p className="text-xs text-muted-foreground">
              Já tem login? Entre com a mesma conta e abra este link novamente.
              <br />
              Não recebeu o convite? Peça ao seu líder para reenviar.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Completed state
  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="text-6xl">🎧</div>
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Perfil Sintonizado!</h1>
            <p className="text-muted-foreground">
              O seu líder já recebeu seu manual. Agora ele pode te ajudar 
              de forma mais assertiva e personalizada.
            </p>
          </div>
          <div className="pt-4">
            <p className="text-sm text-muted-foreground">
              Você pode fechar esta página.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-6 text-center border-b bg-card">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">🎵 Rhitmo Sync</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Olá, {memberName}! Configure seu perfil de trabalho
        </p>
      </div>

      {/* Progress */}
      <div className="px-4 py-4 sm:py-6 bg-card/50">
        <StepIndicator steps={steps} currentIndex={currentStep} />
        <Progress value={progress} className="h-2 max-w-lg mx-auto" />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center p-4 pt-6 overflow-y-auto">
        <div className="max-w-2xl w-full space-y-6">
          {/* Step 1: Identity */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">🆔 Quem Sou Eu</h2>
                <p className="text-muted-foreground text-sm">
                  Informações básicas (todas opcionais)
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Gênero</Label>
                  <Select 
                    value={formData.gender} 
                    onValueChange={(v) => updateFormData('gender', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                      <SelectItem value="prefer_not_say">Prefiro não dizer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ano de Nascimento</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 1990"
                    min={1950}
                    max={2010}
                    value={formData.birthYear}
                    onChange={(e) => updateFormData('birthYear', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fora do trabalho eu...</Label>
                  <Textarea
                    placeholder="Conte seus hobbies, interesses, o que você faz para relaxar..."
                    value={formData.hobbies}
                    onChange={(e) => updateFormData('hobbies', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Rhythm */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">⚡ Ritmo e Energia</h2>
                <p className="text-muted-foreground text-sm">
                  Como você funciona melhor?
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base">Quando você é mais produtivo? *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {chronotypeOptions.map((option) => (
                      <SelectableCard
                        key={option.value}
                        emoji={option.emoji}
                        title={option.title}
                        description={option.description}
                        selected={formData.chronotype === option.value}
                        onClick={() => updateFormData('chronotype', option.value as 'morning' | 'commercial' | 'night')}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ambiente ideal de trabalho</Label>
                  <Select 
                    value={formData.idealEnvironment} 
                    onValueChange={(v) => updateFormData('idealEnvironment', v as 'silence' | 'music' | 'buzz')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="silence">🤫 Silêncio total</SelectItem>
                      <SelectItem value="music">🎵 Música/Ruído de fundo</SelectItem>
                      <SelectItem value="buzz">🏢 Agito/Coworking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>O que drena minha energia</Label>
                  <Textarea
                    placeholder="Ex: Reuniões longas sem pauta, interrupções constantes..."
                    value={formData.energyDrainers}
                    onChange={(e) => updateFormData('energyDrainers', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>O que carrega minha energia</Label>
                  <Textarea
                    placeholder="Ex: Tempo para trabalho focado, feedback positivo..."
                    value={formData.energyBoosters}
                    onChange={(e) => updateFormData('energyBoosters', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Manual */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">🆘 Manual de Instruções</h2>
                <p className="text-muted-foreground text-sm">
                  O coração do seu perfil - como seu líder pode te ajudar
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Quando estou estressado, eu...</Label>
                  <Textarea
                    placeholder="Ex: Fico quieto, respondo com respostas curtas, evito reuniões..."
                    value={formData.stressSigns}
                    onChange={(e) => updateFormData('stressSigns', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Em dias ruins, me ajude...</Label>
                  <Textarea
                    placeholder="Ex: Me dando espaço, perguntando se preciso de algo, oferecendo ajuda prática..."
                    value={formData.badDaySupport}
                    onChange={(e) => updateFormData('badDaySupport', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base">Como prefiro receber feedback? *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {feedbackStyleOptions.map((option) => (
                      <SelectableCard
                        key={option.value}
                        emoji={option.emoji}
                        title={option.title}
                        description={option.description}
                        selected={formData.feedbackStyle === option.value}
                        onClick={() => updateFormData('feedbackStyle', option.value as 'direct' | 'empathetic' | 'written')}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base">Como prefiro ser reconhecido? *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {recognitionOptions.map((option) => (
                      <SelectableCard
                        key={option.value}
                        emoji={option.emoji}
                        title={option.title}
                        description={option.description}
                        selected={formData.recognitionStyle === option.value}
                        onClick={() => updateFormData('recognitionStyle', option.value as 'public' | 'private')}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Future */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">🚀 Futuro</h2>
                <p className="text-muted-foreground text-sm">
                  O que te move e onde você quer chegar
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base">
                    O que te motiva? (escolha até 3) *
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Selecionados: {formData.motivators.length}/3
                  </p>
                  <MultiSelectChips
                    options={motivatorOptions}
                    selected={formData.motivators}
                    onChange={(values) => updateFormData('motivators', values)}
                    max={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>O que você quer aprender/desenvolver?</Label>
                  <Input
                    placeholder="Ex: Apresentações em público, gestão de projetos..."
                    value={formData.skillGoal}
                    onChange={(e) => updateFormData('skillGoal', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t bg-card p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
          )}
          
          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !canProceed()}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Finalizar'
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1"
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
