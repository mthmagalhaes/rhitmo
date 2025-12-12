import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { CheckCircle2, Zap, BookOpen, Target, Waves, Sunrise, Moon, Trophy, TrendingUp } from 'lucide-react';

interface WorkStyleData {
  processing: 'direct' | 'contextual';
  feedback: 'immediate' | 'scheduled';
  autonomy: 'directed' | 'autonomous';
  energy: 'morning' | 'evening';
  motivation: 'recognition' | 'growth';
  completed_at: string;
}

interface Question {
  id: keyof Omit<WorkStyleData, 'completed_at'>;
  question: string;
  options: {
    value: string;
    label: string;
    icon: React.ReactNode;
    description: string;
  }[];
}

const questions: Question[] = [
  {
    id: 'processing',
    question: 'Como você prefere receber informações?',
    options: [
      {
        value: 'direct',
        label: 'Direto ao ponto',
        icon: <Zap className="h-8 w-8" />,
        description: 'Informações objetivas e resumidas'
      },
      {
        value: 'contextual',
        label: 'Com contexto completo',
        icon: <BookOpen className="h-8 w-8" />,
        description: 'Explicações detalhadas e contextuais'
      }
    ]
  },
  {
    id: 'feedback',
    question: 'Como prefere receber feedback?',
    options: [
      {
        value: 'immediate',
        label: 'Na hora',
        icon: <Zap className="h-8 w-8" />,
        description: 'Feedback imediato sobre minhas ações'
      },
      {
        value: 'scheduled',
        label: 'Na 1:1',
        icon: <Target className="h-8 w-8" />,
        description: 'Em reuniões agendadas'
      }
    ]
  },
  {
    id: 'autonomy',
    question: 'Qual seu estilo de trabalho ideal?',
    options: [
      {
        value: 'directed',
        label: 'Direcionamento claro',
        icon: <Target className="h-8 w-8" />,
        description: 'Prefiro tarefas bem definidas'
      },
      {
        value: 'autonomous',
        label: 'Liberdade para explorar',
        icon: <Waves className="h-8 w-8" />,
        description: 'Gosto de definir meu próprio caminho'
      }
    ]
  },
  {
    id: 'energy',
    question: 'Quando você é mais produtivo?',
    options: [
      {
        value: 'morning',
        label: 'Manhãs',
        icon: <Sunrise className="h-8 w-8" />,
        description: 'Rendo mais no início do dia'
      },
      {
        value: 'evening',
        label: 'Tardes/Noites',
        icon: <Moon className="h-8 w-8" />,
        description: 'Prefiro trabalhar mais tarde'
      }
    ]
  },
  {
    id: 'motivation',
    question: 'O que mais te motiva?',
    options: [
      {
        value: 'recognition',
        label: 'Reconhecimento',
        icon: <Trophy className="h-8 w-8" />,
        description: 'Valorizo feedbacks positivos e elogios'
      },
      {
        value: 'growth',
        label: 'Crescimento',
        icon: <TrendingUp className="h-8 w-8" />,
        description: 'Busco aprendizado e desenvolvimento'
      }
    ]
  }
];

export default function RhitmoSync() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<WorkStyleData>>({});
  const [memberName, setMemberName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadMemberData();
  }, [memberId]);

  const loadMemberData = async () => {
    if (!memberId) {
      toast.error('Link inválido');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_member_for_sync', { p_member_id: memberId });

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Membro não encontrado');

      const member = Array.isArray(data) ? data[0] : data;

      if (member.work_style_data) {
        toast.error('Este questionário já foi preenchido');
        setCompleted(true);
      }

      setMemberName(member.name);
    } catch (error) {
      console.error('Error loading member:', error);
      toast.error('Membro não encontrado');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (value: string) => {
    const currentQuestion = questions[currentStep];
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));

    if (currentStep < questions.length - 1) {
      setTimeout(() => setCurrentStep(prev => prev + 1), 300);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    const workStyleData: WorkStyleData = {
      ...answers as Omit<WorkStyleData, 'completed_at'>,
      completed_at: new Date().toISOString()
    };

    try {
      // Usar RPC com SECURITY DEFINER para permitir update anônimo
      const { data: success, error } = await (supabase
        .rpc as any)('submit_rhitmo_sync', {
          p_member_id: memberId,
          p_work_style_data: workStyleData
        });

      if (error) throw error;
      if (!success) {
        throw new Error('Este questionário já foi preenchido');
      }

      setCompleted(true);
      toast.success('Obrigado! Seu perfil foi sincronizado com sucesso.');
    } catch (error: any) {
      console.error('Error submitting:', error);
      toast.error(error.message || 'Erro ao salvar suas respostas. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-6">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Obrigado!</h1>
            <p className="text-muted-foreground">
              Seu perfil foi sincronizado com sucesso. Seu gestor agora tem acesso às suas preferências de trabalho.
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

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;
  const isLastStep = currentStep === questions.length - 1;
  const allAnswered = Object.keys(answers).length === questions.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col">
      {/* Header */}
      <div className="p-6 text-center border-b bg-card">
        <h1 className="text-3xl font-bold text-primary">🎵 Rhitmo</h1>
        <p className="text-sm text-muted-foreground mt-1">Sincronize seu estilo de trabalho</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-6">
          {/* Greeting */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Olá, {memberName}! 👋</h2>
            <p className="text-muted-foreground text-sm">
              Responda 5 perguntas rápidas para sincronizar seu perfil
            </p>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Pergunta {currentStep + 1} de {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-center">
              {currentQuestion.question}
            </h3>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <Card
                  key={option.value}
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                    answers[currentQuestion.id] === option.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleAnswer(option.value)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 ${
                      answers[currentQuestion.id] === option.value
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }`}>
                      {option.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{option.label}</h4>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-4">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex-1"
              >
                Anterior
              </Button>
            )}
            
            {isLastStep && allAnswered ? (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'Enviando...' : 'Enviar'}
              </Button>
            ) : (
              <Button
                onClick={() => currentStep < questions.length - 1 && setCurrentStep(prev => prev + 1)}
                disabled={!answers[currentQuestion.id]}
                className="flex-1"
              >
                Próximo →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
