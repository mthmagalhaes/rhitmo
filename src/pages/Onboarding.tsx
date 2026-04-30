import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RhitmoLogo } from '@/components/RhitmoLogo';
import type { Json } from '@/integrations/supabase/types';
import { useHomeRoute } from '@/hooks/useHomeRoute';

// AI Analysis response type
interface AIAnalysis {
  alignment_score: number;
  analysis_summary: string;
  key_gaps: string[];
  suggested_focus: string[];
}

// Types
interface OnboardingFormData {
  role: string;
  roleTenure: string;
  responsibility1: string;
  responsibility2: string;
  responsibility3: string;
  aspirations: string;
  interests: string[];
}

interface MemberData {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

const steps = [
  { id: 'identity', title: 'Identidade', emoji: '🪪' },
  { id: 'crafting', title: 'Job Crafting', emoji: '🎯' },
  { id: 'future', title: 'Futuro', emoji: '🚀' },
];

const tenureOptions = [
  { value: 'less_than_1', label: 'Menos de 1 ano' },
  { value: '1_to_3', label: '1 a 3 anos' },
  { value: '3_to_5', label: '3 a 5 anos' },
  { value: 'more_than_5', label: 'Mais de 5 anos' },
];

const interestOptions = [
  { value: 'leadership', label: '👥 Liderança' },
  { value: 'technical', label: '💻 Técnica' },
  { value: 'communication', label: '🗣️ Comunicação' },
  { value: 'strategy', label: '📊 Estratégia' },
  { value: 'creativity', label: '🎨 Criatividade' },
  { value: 'analytics', label: '📈 Análise de Dados' },
];

const initialFormData: OnboardingFormData = {
  role: '',
  roleTenure: '',
  responsibility1: '',
  responsibility2: '',
  responsibility3: '',
  aspirations: '',
  interests: [],
};

// Step Indicator Component
function StepIndicator({ 
  currentIndex 
}: { 
  currentIndex: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6">
      {steps.map((step, index) => (
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

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const home = useHomeRoute();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [analyzingWithAI, setAnalyzingWithAI] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [formData, setFormData] = useState<OnboardingFormData>(initialFormData);

  // Carregar dados do membro vinculado
  const { data: memberData, isLoading: memberLoading } = useQuery({
    queryKey: ['onboarding-member', user?.id],
    queryFn: async (): Promise<MemberData | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, email, role')
        .eq('linked_user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching member:', error);
        return null;
      }
      return data;
    },
    enabled: !!user,
  });

  // Redirecionar se não é um linked member
  useEffect(() => {
    if (!authLoading && !memberLoading && !memberData) {
      navigate('/', { replace: true });
    }
  }, [authLoading, memberLoading, memberData, navigate]);

  // Pré-preencher cargo quando dados carregarem
  useEffect(() => {
    if (memberData?.role) {
      setFormData(prev => ({ ...prev, role: memberData.role }));
    }
  }, [memberData]);

  const updateFormData = <K extends keyof OnboardingFormData>(
    key: K, 
    value: OnboardingFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: // Identidade
        return !!formData.role.trim() && !!formData.roleTenure;
      case 1: // Job Crafting
        return !!formData.responsibility1.trim() && 
               !!formData.responsibility2.trim() && 
               !!formData.responsibility3.trim();
      case 2: // Futuro
        return !!formData.aspirations.trim();
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
    if (!user || !memberData) return;
    
    setSubmitting(true);

    const responsibilities = [
      formData.responsibility1,
      formData.responsibility2,
      formData.responsibility3,
    ].filter(Boolean);

    const baseSkillsData = {
      role_tenure: formData.roleTenure,
      responsibilities,
      aspirations: formData.aspirations,
      interests: formData.interests,
      onboarding_completed: true,
      completed_at: new Date().toISOString(),
    };

    try {
      // Salvar skills_data inicial via RPC
      const { data: success, error: rpcError } = await supabase.rpc('update_member_own_data', {
        p_skills_data: baseSkillsData as unknown as Json,
      });

      if (rpcError) throw rpcError;
      if (!success) throw new Error('Não foi possível salvar os dados');

      // Se o cargo foi alterado, atualizar separadamente (RLS permite para linked_user)
      if (formData.role.trim() !== memberData.role) {
        const { error: updateError } = await supabase
          .from('team_members')
          .update({ role: formData.role.trim() })
          .eq('linked_user_id', user.id);

        if (updateError) {
          console.warn('Could not update role:', updateError);
        }
      }

      // Agora chamar a IA para análise de carreira
      setSubmitting(false);
      setAnalyzingWithAI(true);

      try {
        const { data: aiData, error: aiError } = await supabase.functions.invoke('analyze-job-crafting', {
          body: {
            role: formData.role.trim(),
            responsibilities,
            aspirations: formData.aspirations,
            interests: formData.interests,
          },
        });

        if (aiError) throw aiError;
        if (aiData.error) throw new Error(aiData.error);

        // Salvar análise da IA no skills_data
        const skillsWithAI = {
          ...baseSkillsData,
          ai_analysis: {
            ...aiData,
            analyzed_at: new Date().toISOString(),
          },
        };

        await supabase.rpc('update_member_own_data', {
          p_skills_data: skillsWithAI as unknown as Json,
        });

        console.log('[Onboarding] AI analysis saved successfully');
      } catch (aiErr) {
        // IA falhou, mas não bloqueia o fluxo
        console.error('[Onboarding] AI analysis failed:', aiErr);
        toast({
          title: "Análise de carreira indisponível",
          description: "Seu perfil foi salvo. A análise de IA estará disponível em breve.",
          variant: "default",
        });
      }

      setCompleted(true);
      toast({ 
        title: "Perfil configurado!", 
        description: "Bem-vindo ao Rhitmo!" 
      });
      
      // Redirecionar após pequeno delay para mostrar feedback
      setTimeout(() => {
        navigate(home, { replace: true });
      }, 2000);
    } catch (err) {
      console.error('Onboarding error:', err);
      toast({ 
        title: "Erro", 
        description: err instanceof Error ? err.message : 'Erro ao salvar dados', 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
      setAnalyzingWithAI(false);
    }
  };

  // Loading state
  if (authLoading || memberLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // AI Analyzing state - tela especial de loading
  if (analyzingWithAI) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="rounded-full bg-primary/10 p-6 animate-pulse">
                <Bot className="h-12 w-12 text-primary" />
              </div>
              <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-bounce" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">Analisando seu perfil...</h1>
            <p className="text-muted-foreground text-sm">
              A IA está processando suas informações para gerar insights de carreira personalizados
            </p>
          </div>
          <div className="pt-2">
            <Progress value={66} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Isso pode levar alguns segundos
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
          <div className="text-6xl">🎉</div>
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Perfil Configurado!</h1>
            <p className="text-muted-foreground">
              Agora seu líder tem uma visão completa sobre você e suas responsabilidades.
            </p>
          </div>
          <div className="pt-4">
            <p className="text-sm text-muted-foreground">
              Redirecionando...
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
        <RhitmoLogo size="md" className="mx-auto mb-2" />
        <h1 className="text-xl font-bold">Bem-vindo ao Rhitmo</h1>
        <p className="text-sm text-muted-foreground">
          Olá, {memberData?.name}! Vamos configurar seu perfil
        </p>
      </div>

      {/* Progress */}
      <div className="px-4 py-4 sm:py-6 bg-card/50">
        <StepIndicator currentIndex={currentStep} />
        <Progress value={progress} className="h-2 max-w-lg mx-auto" />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center p-4 pt-6 overflow-y-auto">
        <div className="max-w-2xl w-full space-y-6">
          {/* Step 1: Identidade */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">🪪 O Crachá</h2>
                <p className="text-muted-foreground text-sm">
                  Confirme suas informações básicas
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={memberData?.name || ''}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    value={memberData?.email || ''}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cargo Atual *</Label>
                  <Input
                    placeholder="Ex: Analista de Marketing"
                    value={formData.role}
                    onChange={(e) => updateFormData('role', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Você pode ajustar se necessário
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Há quanto tempo você está nesta função? *</Label>
                  <Select 
                    value={formData.roleTenure} 
                    onValueChange={(v) => updateFormData('roleTenure', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tenureOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Job Crafting */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">🎯 Mapeando suas Responsabilidades</h2>
                <p className="text-muted-foreground text-sm">
                  Liste as 3 principais atividades ou entregas pelas quais você é cobrado hoje
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Responsabilidade 1 *</Label>
                  <Textarea
                    placeholder="Ex: Gerenciar campanhas de mídia paga e otimizar ROI"
                    value={formData.responsibility1}
                    onChange={(e) => updateFormData('responsibility1', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Responsabilidade 2 *</Label>
                  <Textarea
                    placeholder="Ex: Produzir relatórios semanais de performance"
                    value={formData.responsibility2}
                    onChange={(e) => updateFormData('responsibility2', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Responsabilidade 3 *</Label>
                  <Textarea
                    placeholder="Ex: Coordenar briefings com a equipe criativa"
                    value={formData.responsibility3}
                    onChange={(e) => updateFormData('responsibility3', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Futuro */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">🚀 Onde você quer chegar?</h2>
                <p className="text-muted-foreground text-sm">
                  Seus objetivos de desenvolvimento
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Quais habilidades você gostaria de desenvolver nos próximos 6 meses? *</Label>
                  <Textarea
                    placeholder="Ex: Quero melhorar minha capacidade de análise de dados e apresentação executiva..."
                    value={formData.aspirations}
                    onChange={(e) => updateFormData('aspirations', e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Áreas de interesse (opcional - selecione até 3)</Label>
                  <MultiSelectChips
                    options={interestOptions}
                    selected={formData.interests}
                    onChange={(values) => updateFormData('interests', values)}
                    max={3}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t bg-card p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  Finalizar
                  <CheckCircle2 className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
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
