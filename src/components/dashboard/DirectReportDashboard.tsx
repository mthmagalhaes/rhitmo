import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FeedbackTimeline } from '@/components/FeedbackTimeline';
import { Home, Compass, FileText, User, Zap, CheckCircle, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import SkillsMapCard from './SkillsMapCard';
import { toast } from 'sonner';

interface LinkedMemberData {
  id: string;
  name: string;
  email: string | null;
  role: string;
  updated_at?: string;
  skills_data: {
    role_tenure?: string;
    responsibilities?: string[];
    aspirations?: string;
    interests?: string[];
    onboarding_completed?: boolean;
    ai_analysis?: {
      alignment_score?: number;
      analysis_summary?: string;
      key_gaps?: string[];
      suggested_focus?: string[];
      analyzed_at?: string;
    };
  } | null;
  work_style_data?: Record<string, unknown> | null;
  chronotype?: string | null;
  feedback_style?: string | null;
  recognition_style?: string | null;
}

interface DirectReportDashboardProps {
  linkedMember: LinkedMemberData;
}

const tenureLabels: Record<string, string> = {
  'less_than_1': 'Menos de 1 ano',
  '1_to_3': '1 a 3 anos',
  '3_to_5': '3 a 5 anos',
  'more_than_5': 'Mais de 5 anos',
};

const chronotypeLabels: Record<string, string> = {
  'early_bird': 'Madrugador (5h-14h)',
  'madrugador': 'Madrugador (5h-14h)',
  'commercial': 'Horário Comercial',
  'comercial': 'Horário Comercial',
  'night_owl': 'Noturno (depois das 18h)',
  'noturno': 'Noturno (depois das 18h)',
  'variable': 'Variável',
};

const feedbackStyleLabels: Record<string, string> = {
  'direct': 'Direto',
  'direto': 'Direto',
  'empathetic': 'Empático / Sanduíche',
  'empatico': 'Empático / Sanduíche',
  'written': 'Escrito',
  'escrito': 'Escrito',
  'private': 'Em particular',
  'privado': 'Em particular',
  'context': 'Com contexto e exemplos',
};

const recognitionStyleLabels: Record<string, string> = {
  'public': 'Reconhecimento Público',
  'publico': 'Reconhecimento Público',
  'private': 'Reconhecimento Privado',
  'privado': 'Reconhecimento Privado',
  'results': 'Por Resultados',
  'learning': 'Por Aprendizado',
};

const getLabel = (map: Record<string, string>, value: string) =>
  map[value] || value.charAt(0).toUpperCase() + value.slice(1);

const chronotypeContext: Record<string, string> = {
  'early_bird': 'Seu líder sabe que você rende melhor de manhã cedo e evita reuniões pesadas no fim do dia.',
  'madrugador': 'Seu líder sabe que você rende melhor de manhã cedo e evita reuniões pesadas no fim do dia.',
  'commercial': 'Seu líder sabe que você está no seu melhor dentro do horário comercial.',
  'comercial': 'Seu líder sabe que você está no seu melhor dentro do horário comercial.',
  'night_owl': 'Seu líder sabe que sua energia peak é no período noturno.',
  'noturno': 'Seu líder sabe que sua energia peak é no período noturno.',
};

const feedbackContext: Record<string, string> = {
  'direct': 'Seu líder vai direto ao ponto com você, sem rodeios.',
  'direto': 'Seu líder vai direto ao ponto com você, sem rodeios.',
  'empathetic': 'Seu líder contextualiza antes de pontos críticos e equilibra positivo e construtivo.',
  'empatico': 'Seu líder contextualiza antes de pontos críticos e equilibra positivo e construtivo.',
  'written': 'Seu líder prefere te enviar feedback por escrito para você processar no seu tempo.',
  'escrito': 'Seu líder prefere te enviar feedback por escrito para você processar no seu tempo.',
  'private': 'Seu líder reserva feedbacks importantes para conversas privadas.',
  'privado': 'Seu líder reserva feedbacks importantes para conversas privadas.',
};

const recognitionContext: Record<string, string> = {
  'public': 'Seu líder celebra suas conquistas em frente ao time.',
  'publico': 'Seu líder celebra suas conquistas em frente ao time.',
  'private': 'Seu líder te reconhece em 1:1, sem holofotes.',
  'privado': 'Seu líder te reconhece em 1:1, sem holofotes.',
  'results': 'Seu líder conecta reconhecimento diretamente aos resultados que você entregou.',
  'learning': 'Seu líder valoriza e destaca seu crescimento e aprendizado.',
};

const getDaysSince = (dateStr: string | null | undefined): number | null => {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const MOTIVATOR_OPTIONS = ['Autonomia', 'Dinheiro', 'Estabilidade', 'Aprendizado', 'Propósito', 'Status'];

export default function DirectReportDashboard({ linkedMember }: DirectReportDashboardProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncSaving, setSyncSaving] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const queryClient = useQueryClient();

  const [syncForm, setSyncForm] = useState({
    chronotype: '',
    work_environment: '',
    energy_drains: '',
    energy_sources: '',
    stress_signs: '',
    support_needed: '',
    feedback_style: '',
    recognition_style: '',
    motivators: [] as string[],
    skill_goal: '',
  });

  // Pre-populate form when dialog opens
  useEffect(() => {
    if (syncDialogOpen) {
      const wsd = linkedMember.work_style_data as any;
      setSyncForm({
        chronotype: linkedMember.chronotype || '',
        work_environment: wsd?.work_environment || '',
        energy_drains: wsd?.energy_drains || '',
        energy_sources: wsd?.energy_sources || '',
        stress_signs: wsd?.stress_signs || '',
        support_needed: wsd?.support_needed || '',
        feedback_style: linkedMember.feedback_style || '',
        recognition_style: linkedMember.recognition_style || '',
        motivators: wsd?.motivators || [],
        skill_goal: wsd?.skill_goal || '',
      });
    }
  }, [syncDialogOpen, linkedMember]);

  // Fix nome concatenado
  const displayName = linkedMember.name?.replace(linkedMember.role, '').trim() || linkedMember.name;

  // Query feedbacks do próprio membro (visibility = 'shared')
  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['my-feedbacks', linkedMember.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('id, created_at, occurred_at, content, type, tags, title')
        .eq('member_id', linkedMember.id)
        .eq('visibility', 'shared')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching feedbacks:', error);
        return [];
      }
      return (data || []) as Array<{
        id: string;
        created_at: string;
        occurred_at?: string;
        content: string;
        type: 'positive' | 'constructive' | 'neutral';
        tags?: string[];
        title?: string | null;
      }>;
    },
  });

  const responsibilities = linkedMember.skills_data?.responsibilities || [];
  const tenure = linkedMember.skills_data?.role_tenure;
  const aiAnalysis = linkedMember.skills_data?.ai_analysis;
  const hasRhitmoSync = !!(linkedMember.work_style_data || linkedMember.chronotype || linkedMember.feedback_style || linkedMember.recognition_style);

  const handleToggleMotivator = (m: string) => {
    setSyncForm(prev => {
      const has = prev.motivators.includes(m);
      if (has) return { ...prev, motivators: prev.motivators.filter(x => x !== m) };
      if (prev.motivators.length >= 3) return prev;
      return { ...prev, motivators: [...prev.motivators, m] };
    });
  };

  const handleSaveSync = async () => {
    setSyncSaving(true);
    try {
      const existingWsd = (linkedMember.work_style_data as Record<string, unknown>) || {};
      const { error } = await supabase
        .from('team_members')
        .update({
          chronotype: syncForm.chronotype || null,
          feedback_style: syncForm.feedback_style || null,
          recognition_style: syncForm.recognition_style || null,
          work_style_data: {
            ...existingWsd,
            work_environment: syncForm.work_environment || null,
            energy_drains: syncForm.energy_drains || null,
            energy_sources: syncForm.energy_sources || null,
            stress_signs: syncForm.stress_signs || null,
            support_needed: syncForm.support_needed || null,
            motivators: syncForm.motivators.length > 0 ? syncForm.motivators : null,
            skill_goal: syncForm.skill_goal || null,
          },
        })
        .eq('id', linkedMember.id);

      if (error) throw error;

      console.log('[Rhitmo Sync] Updated successfully for member:', linkedMember.id);
      toast.success('Rhitmo Sync atualizado! Seu líder foi notificado.');
      setSyncDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['linked-member'] });
    } catch (err) {
      console.error('Error saving sync:', err);
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSyncSaving(false);
    }
  };

  const handleReanalyze = async () => {
    if (!linkedMember || !user) return;
    setIsReanalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-job-crafting', {
        body: {
          role: linkedMember.role,
          responsibilities: linkedMember.skills_data?.responsibilities || [],
          aspirations: linkedMember.skills_data?.aspirations || '',
          interests: linkedMember.skills_data?.interests || [],
        },
      });
      if (error) throw error;

      await supabase
        .from('team_members')
        .update({
          skills_data: {
            ...linkedMember.skills_data,
            ai_analysis: {
              ...data,
              analyzed_at: new Date().toISOString(),
            },
          },
        } as any)
        .eq('linked_user_id', user.id);

      await queryClient.invalidateQueries({ queryKey: ['linked-member'] });
      toast.success('Análise atualizada! Sua Bússola de Carreira foi regenerada.');
    } catch (err) {
      console.error('[handleReanalyze] Error:', err);
      toast.error('Erro na análise. Tente novamente em alguns instantes.');
    } finally {
      setIsReanalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Header */}
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Olá, {displayName}! 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">Painel do Colaborador · {linkedMember.role}</p>
      </div>

      {/* Tabs */}
      <main className="container mx-auto px-6 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-border bg-background sticky top-0 z-10 -mx-6 px-6 mb-6">
            <TabsList className="bg-transparent p-0 h-auto gap-1">
              <TabsTrigger value="visao-geral" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none text-muted-foreground hover:text-foreground px-4 py-3 text-sm font-medium transition-colors gap-2">
                <Home className="h-4 w-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="carreira" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none text-muted-foreground hover:text-foreground px-4 py-3 text-sm font-medium transition-colors gap-2">
                <Compass className="h-4 w-4" />
                Minha Carreira
              </TabsTrigger>
              <TabsTrigger value="feedbacks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none text-muted-foreground hover:text-foreground px-4 py-3 text-sm font-medium transition-colors gap-2">
                <FileText className="h-4 w-4" />
                Feedbacks
              </TabsTrigger>
              <TabsTrigger value="perfil" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none text-muted-foreground hover:text-foreground px-4 py-3 text-sm font-medium transition-colors gap-2">
                <User className="h-4 w-4" />
                Meu Perfil
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ═══ TAB 1: Visão Geral ═══ */}
          <TabsContent value="visao-geral">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Resumo - 1/3 */}
              <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 lg:col-span-1">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 mb-4 text-foreground">
                  <Zap className="h-5 w-5 text-primary" />
                  Resumo
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{feedbacks.length} feedbacks compartilhados</span>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('feedbacks')} className="text-xs text-primary">
                      Ver todos
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Perfil Rhitmo Sync</span>
                    <Badge 
                      variant="secondary" 
                      className="cursor-pointer text-xs"
                      onClick={() => setActiveTab('perfil')}
                    >
                      Atualizar
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Career Coach</span>
                    <Badge 
                      variant="default" 
                      className="cursor-pointer text-xs"
                      onClick={() => setActiveTab('carreira')}
                    >
                      Novo
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Próximas Ações - 2/3 */}
              <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 lg:col-span-2">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 mb-4 text-foreground">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Próximas Ações
                </h2>
                <div className="space-y-3">
                  {[
                    '📋 Revise seus feedbacks recentes',
                    '🎯 Atualize suas aspirações no Rhitmo Sync',
                    '💬 Converse com o Career Coach sobre seu desenvolvimento',
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-muted/40 p-3 text-sm text-foreground flex items-center justify-between cursor-pointer hover:bg-muted/60 transition-colors"
                    >
                      <span>{item}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ═══ TAB 2: Minha Carreira ═══ */}
          <TabsContent value="carreira">
            <div className="mt-6 space-y-6">
              <SkillsMapCard
                aiAnalysis={aiAnalysis ?? null}
                memberId={linkedMember.id}
                onReanalyze={handleReanalyze}
                isReanalyzing={isReanalyzing}
              />
              <Card className="p-8 text-center rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-dashed border-2 border-muted">
                <p className="text-sm text-muted-foreground">
                  Skills Map detalhado, PDI e Career Coach chegam em breve.
                </p>
              </Card>
            </div>
          </TabsContent>

          {/* ═══ TAB 3: Feedbacks ═══ */}
          <TabsContent value="feedbacks">
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-4 text-foreground">Feedbacks do seu líder</h2>
              <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : feedbacks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma anotação compartilhada</p>
                    <p className="text-sm">Seu líder pode compartilhar feedbacks com você</p>
                  </div>
                ) : (
                  <FeedbackTimeline feedbacks={feedbacks} />
                )}
              </Card>
            </div>
          </TabsContent>

          {/* ═══ TAB 4: Meu Perfil ═══ */}
          <TabsContent value="perfil">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Informações da função */}
              <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 text-foreground">
                    <User className="h-5 w-5 text-primary" />
                    Informações da Função
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast('Edição de perfil', { description: 'Em breve você poderá atualizar suas informações de função diretamente aqui.' })}
                  >
                    Editar
                  </Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cargo</p>
                    <p className="font-medium text-foreground">{linkedMember.role}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tempo na função</p>
                    <p className="font-medium text-foreground">
                      {tenure ? tenureLabels[tenure] || tenure : '-'}
                    </p>
                  </div>
                  {responsibilities.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Responsabilidades</p>
                      <ul className="list-disc list-inside space-y-1">
                        {responsibilities.map((resp, i) => (
                          <li key={i} className="text-foreground">{resp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {linkedMember.skills_data?.aspirations && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Aspirações</p>
                      <p className="text-foreground">{linkedMember.skills_data.aspirations}</p>
                    </div>
                  )}
                  {linkedMember.skills_data?.interests && linkedMember.skills_data.interests.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Interesses</p>
                      <div className="flex flex-wrap gap-2">
                        {linkedMember.skills_data.interests.map((interest, i) => (
                          <span key={i} className="px-2 py-1 bg-muted rounded-xl text-sm text-foreground">
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Rhitmo Sync */}
              <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 text-foreground">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Meu Rhitmo Sync
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Seu perfil comportamental e preferências</p>

                {(() => {
                  const syncDate = (linkedMember.work_style_data as any)?.completed_at || linkedMember.updated_at;
                  const days = getDaysSince(syncDate);
                  if (days !== null && days <= 180) {
                    return (
                      <p className="text-xs text-muted-foreground mb-4">
                        Atualizado {days} dias atrás
                      </p>
                    );
                  }
                  if (days !== null && days > 180) {
                    return (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 mt-1 mb-4">
                        <span className="text-amber-500 text-sm">⏰</span>
                        <div>
                          <p className="text-xs font-medium text-amber-700">Seu perfil pode estar desatualizado</p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            Faz mais de 6 meses desde o último sync. Suas preferências podem ter mudado.
                          </p>
                          <button
                            onClick={() => setSyncDialogOpen(true)}
                            className="text-xs text-amber-700 font-semibold underline mt-1"
                          >
                            Atualizar agora
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return <div className="mb-4" />;
                })()}

                {hasRhitmoSync ? (
                  <div className="space-y-3">
                    {linkedMember.chronotype && (
                      <div>
                        <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary text-xs px-3 py-1">
                          {getLabel(chronotypeLabels, linkedMember.chronotype)}
                        </Badge>
                        <p className="text-xs text-muted-foreground italic mt-1">
                          {chronotypeContext[linkedMember.chronotype] || 'Seu líder considera seu ritmo natural ao agendar reuniões importantes.'}
                        </p>
                      </div>
                    )}
                    {linkedMember.feedback_style && (
                      <div>
                        <Badge variant="secondary" className="rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs px-3 py-1">
                          {getLabel(feedbackStyleLabels, linkedMember.feedback_style)}
                        </Badge>
                        <p className="text-xs text-muted-foreground italic mt-1">
                          {feedbackContext[linkedMember.feedback_style] || 'Seu líder adapta a forma de dar feedback ao seu estilo.'}
                        </p>
                      </div>
                    )}
                    {linkedMember.recognition_style && (
                      <div>
                        <Badge variant="secondary" className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs px-3 py-1">
                          {getLabel(recognitionStyleLabels, linkedMember.recognition_style)}
                        </Badge>
                        <p className="text-xs text-muted-foreground italic mt-1">
                          {recognitionContext[linkedMember.recognition_style] || 'Seu líder adapta o reconhecimento ao que mais te motiva.'}
                        </p>
                      </div>
                    )}
                    {(linkedMember.work_style_data as any)?.motivators?.length > 0 && (
                      <div>
                        <div className="flex flex-wrap gap-2">
                          {(linkedMember.work_style_data as any).motivators.map((m: string) => (
                            <Badge key={m} variant="secondary" className="rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs px-3 py-1">
                              {m}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground italic mt-1">
                          Seu líder usa isso para conectar desafios e oportunidades ao que realmente te move.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Você ainda não completou o Rhitmo Sync</p>
                    <p className="text-xs mt-1">Complete para que seu líder conheça seu estilo de trabalho</p>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSyncDialogOpen(true)}
                  >
                    Atualizar Sync
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ═══ Dialog: Editar Rhitmo Sync ═══ */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Atualizar meu Rhitmo Sync</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* ── Seção: Ritmo e Energia ── */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">Ritmo e Energia</p>

            <div className="space-y-2">
              <Label>Quando você é mais produtivo?</Label>
              <Select value={syncForm.chronotype} onValueChange={(v) => setSyncForm(prev => ({ ...prev, chronotype: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="madrugador">Madrugador (entre 5h e 10h)</SelectItem>
                  <SelectItem value="comercial">Horário Comercial (9h às 18h)</SelectItem>
                  <SelectItem value="noturno">Noturno (depois das 18h)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ambiente ideal de trabalho</Label>
              <Select value={syncForm.work_environment} onValueChange={(v) => setSyncForm(prev => ({ ...prev, work_environment: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="silencioso">Silencioso e focado</SelectItem>
                  <SelectItem value="dinamico">Dinâmico e colaborativo</SelectItem>
                  <SelectItem value="flexivel">Flexível / híbrido</SelectItem>
                  <SelectItem value="remoto">Remoto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>O que drena minha energia</Label>
              <Textarea placeholder="Ex: Reuniões longas sem pauta, interrupções constantes..." maxLength={200} value={syncForm.energy_drains} onChange={(e) => setSyncForm(prev => ({ ...prev, energy_drains: e.target.value }))} />
              <p className="text-xs text-muted-foreground text-right">{syncForm.energy_drains.length}/200</p>
            </div>

            <div className="space-y-2">
              <Label>O que carrega minha energia</Label>
              <Textarea placeholder="Ex: Tempo para trabalho focado, feedback positivo..." maxLength={200} value={syncForm.energy_sources} onChange={(e) => setSyncForm(prev => ({ ...prev, energy_sources: e.target.value }))} />
              <p className="text-xs text-muted-foreground text-right">{syncForm.energy_sources.length}/200</p>
            </div>

            {/* ── Seção: Manual de Instruções ── */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">Manual de Instruções</p>

            <div className="space-y-2">
              <Label>Quando estou estressado, eu...</Label>
              <Textarea placeholder="Ex: Fico quieto, respondo com respostas curtas, evito reuniões..." maxLength={200} value={syncForm.stress_signs} onChange={(e) => setSyncForm(prev => ({ ...prev, stress_signs: e.target.value }))} />
              <p className="text-xs text-muted-foreground text-right">{syncForm.stress_signs.length}/200</p>
            </div>

            <div className="space-y-2">
              <Label>Em dias ruins, me ajude...</Label>
              <Textarea placeholder="Ex: Me dando espaço, perguntando se preciso de algo..." maxLength={200} value={syncForm.support_needed} onChange={(e) => setSyncForm(prev => ({ ...prev, support_needed: e.target.value }))} />
              <p className="text-xs text-muted-foreground text-right">{syncForm.support_needed.length}/200</p>
            </div>

            <div className="space-y-2">
              <Label>Como prefiro receber feedback?</Label>
              <Select value={syncForm.feedback_style} onValueChange={(v) => setSyncForm(prev => ({ ...prev, feedback_style: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direto">Direto (sem rodeios, objetivo)</SelectItem>
                  <SelectItem value="empatico">Empático (com contexto e cuidado)</SelectItem>
                  <SelectItem value="escrito">Escrito (prefiro ler e processar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Como prefiro ser reconhecido?</Label>
              <Select value={syncForm.recognition_style} onValueChange={(v) => setSyncForm(prev => ({ ...prev, recognition_style: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="publico">Público (em grupo)</SelectItem>
                  <SelectItem value="privado">Privado (1:1 com meu líder)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── Seção: Futuro ── */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">Futuro</p>

            <div className="space-y-2">
              <Label>O que te motiva? (escolha até 3)</Label>
              <div className="flex flex-wrap gap-2">
                {MOTIVATOR_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleToggleMotivator(m)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      syncForm.motivators.includes(m)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>O que você quer aprender/desenvolver?</Label>
              <Textarea placeholder="Ex: Apresentações em público, gestão de projetos..." maxLength={200} value={syncForm.skill_goal} onChange={(e) => setSyncForm(prev => ({ ...prev, skill_goal: e.target.value }))} />
              <p className="text-xs text-muted-foreground text-right">{syncForm.skill_goal.length}/200</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)} disabled={syncSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSync} disabled={syncSaving}>
              {syncSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
