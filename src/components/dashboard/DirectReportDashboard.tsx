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
import { Home, Compass, FileText, User, Zap, CheckCircle, ChevronRight, Sparkles, Loader2, Download, Bell, Sprout, Plus, CheckCircle2, MessageCircle } from 'lucide-react';
import { NewPDIDialog } from '@/components/NewPDIDialog';
import { cn } from '@/lib/utils';
import SkillsMapCard from './SkillsMapCard';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { MentorChat } from '@/components/MentorChat';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

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

const filterReviewForMember = (content: string): string => {
  const lines = content.split('\n');
  let inDicasBlock = false;
  const filtered: string[] = [];
  for (const line of lines) {
    if (line.includes('Dicas para Apresentação') || line.includes('Como Apresentar Esta')) {
      inDicasBlock = true;
      continue;
    }
    if (inDicasBlock && (line.startsWith('##') || /^[📊💪🎯🚀]/.test(line))) {
      inDicasBlock = false;
    }
    if (!inDicasBlock) filtered.push(line);
  }
  return filtered.join('\n').trim();
};

export default function DirectReportDashboard({ linkedMember }: DirectReportDashboardProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncSaving, setSyncSaving] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [showPDIDialog, setShowPDIDialog] = useState(false);
  const [meuRhitmoOpen, setMeuRhitmoOpen] = useState(false);
  const [meuRhitmoInitialPrompt, setMeuRhitmoInitialPrompt] = useState<string | undefined>();
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

  // Query shared performance reviews
  const { data: sharedReviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ['shared-reviews', linkedMember.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select('id, title, content, period_type, period_start, period_end, created_at, member_viewed_at')
        .eq('member_id', linkedMember.id)
        .eq('shared_with_member', true)
        .order('created_at', { ascending: false });
      if (error) { console.error('Error fetching shared reviews:', error); return []; }
      return data || [];
    },
  });

  const unreadReviews = sharedReviews.filter((r: any) => !r.member_viewed_at);

  // Query PDI (development plan)
  const { data: devPlan } = useQuery({
    queryKey: ['my-dev-plan', linkedMember.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('development_plans')
        .select('*')
        .eq('member_id', linkedMember.id)
        .in('status', ['draft', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) { console.error('Error fetching dev plan:', error); return null; }
      return data;
    },
  });

  const { data: devItems = [] } = useQuery({
    queryKey: ['my-dev-items', devPlan?.id],
    queryFn: async () => {
      if (!devPlan?.id) return [];
      const { data, error } = await supabase
        .from('development_items')
        .select('*')
        .eq('plan_id', devPlan.id)
        .order('created_at', { ascending: true });
      if (error) { console.error('Error fetching dev items:', error); return []; }
      return data || [];
    },
    enabled: !!devPlan?.id,
  });

  // Active PDI items for MeuRhitmo context
  const activePdiItems = (devItems as any[]).filter((item: any) => item.status !== 'completed');

  // Latest shared review for MeuRhitmo context
  const { data: latestReviewContent } = useQuery({
    queryKey: ['latest-review-content', linkedMember.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('performance_reviews')
        .select('content')
        .eq('member_id', linkedMember.id)
        .eq('shared_with_member', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.content || null;
    },
  });

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
    const { error } = await supabase
      .from('development_items')
      .update(updates)
      .eq('id', itemId);
    if (error) { toast.error('Erro ao atualizar item.'); return; }
    toast.success(newStatus === 'completed' ? 'Objetivo concluído! 🎉' : 'Status atualizado.');
    queryClient.invalidateQueries({ queryKey: ['my-dev-items', devPlan?.id] });
  };

  const formatPDIDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  // Mark review as read when opened
  useEffect(() => {
    if (selectedReview && !selectedReview.member_viewed_at) {
      supabase
        .from('performance_reviews')
        .update({ member_viewed_at: new Date().toISOString() } as any)
        .eq('id', selectedReview.id)
        .is('member_viewed_at', null)
        .then(() => queryClient.invalidateQueries({ queryKey: ['shared-reviews', linkedMember.id] }));
    }
  }, [selectedReview?.id]);

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

  const handleAddFocusToPDI = (focusArea: string) => {
    setShowPDIDialog(true);
  };

  const handleSuggestOneOnOne = (focusArea: string) => {
    const text = `Olá, gostaria de conversar sobre o desenvolvimento da minha competência em "${focusArea}". O Skills Map identificou isso como uma área prioritária para meu crescimento. Podemos incluir esse tema na nossa próxima 1:1?`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('💬 Sugestão de pauta copiada! Cole no seu próximo email ou mensagem para seu líder.');
    }).catch(() => {
      toast.error('Não foi possível copiar. Tente novamente.');
    });
  };

  const handleOpenMeuRhitmoWithContext = (focusArea: string) => {
    const prompt = `O meu Skills Map identificou "${focusArea}" como foco prioritário para meu desenvolvimento. Como posso desenvolver essa competência de forma prática? Que ações concretas você sugere?`;
    setMeuRhitmoInitialPrompt(prompt);
    setMeuRhitmoOpen(true);
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Header */}
      <div className="container mx-auto px-6 py-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Olá, {displayName}! 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Painel do Colaborador · {linkedMember.role}</p>
        </div>
        <Button onClick={() => setMeuRhitmoOpen(true)} variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Meu Rhitmo
        </Button>
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
            {/* Seção Novidades — apenas se houver reviews não lidas */}
            {unreadReviews.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 mb-3 text-foreground">
                  <Bell className="h-5 w-5 text-primary" />
                  Novidades
                </h2>
                {unreadReviews.map((review: any) => (
                  <div
                    key={review.id}
                    onClick={() => {
                      setActiveTab('feedbacks');
                      setSelectedReview(review);
                    }}
                    className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors mb-2"
                  >
                    <div className="mt-0.5 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Nova avaliação disponível</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        &ldquo;{review.title}&rdquo; foi compartilhada pelo seu líder
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Resumo - 1/3 */}
              <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 lg:col-span-1">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 mb-4 text-foreground">
                  <Zap className="h-5 w-5 text-primary" />
                  Resumo
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {feedbacks.length} feedbacks compartilhados
                    </span>
                    {unreadReviews.length > 0 && (
                      <Badge className="bg-primary/10 text-primary text-xs border-0 ml-2">
                        {unreadReviews.length} nova{unreadReviews.length > 1 ? 's' : ''}
                      </Badge>
                    )}
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
                    <span className="text-sm text-muted-foreground">Meu Rhitmo</span>
                    <Badge 
                      variant="default" 
                      className="cursor-pointer text-xs"
                      onClick={() => setMeuRhitmoOpen(true)}
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
                    { text: '📋 Revise seus feedbacks recentes', tab: 'feedbacks' },
                    { text: '🎯 Atualize suas aspirações no Rhitmo Sync', tab: 'perfil' },
                    { text: '💬 Converse com o Meu Rhitmo sobre seu desenvolvimento', tab: 'meu-rhitmo' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      onClick={() => item.tab === 'meu-rhitmo' ? setMeuRhitmoOpen(true) : setActiveTab(item.tab)}
                      className="rounded-lg bg-muted/40 p-3 text-sm text-foreground flex items-center justify-between cursor-pointer hover:bg-muted/60 transition-colors"
                    >
                      <span>{item.text}</span>
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
                onAddToPDI={handleAddFocusToPDI}
                onSuggestOneOnOne={handleSuggestOneOnOne}
                onOpenMeuRhitmo={handleOpenMeuRhitmoWithContext}
              />
              {/* Seção Meu Desenvolvimento (PDI) */}
              {!devPlan || devPlan.status === 'draft' ? (
                <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2 mb-2">
                    <Sprout className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold tracking-tight text-foreground">Meu Desenvolvimento</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    Você está no comando do seu crescimento. Proponha seus objetivos de desenvolvimento e alinhe com seu líder.
                  </p>
                  {devPlan?.status === 'draft' && devPlan.leader_comment && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
                      <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Feedback do líder</p>
                      <p className="text-sm italic text-foreground">"{devPlan.leader_comment}"</p>
                    </div>
                  )}
                  {linkedMember.skills_data?.aspirations && (
                    <div className="bg-muted/40 rounded-xl p-4 mb-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Você disse que quer</p>
                      <p className="text-sm italic text-foreground">"{linkedMember.skills_data.aspirations}"</p>
                    </div>
                  )}
                  <Button onClick={() => setShowPDIDialog(true)} className="gap-2 w-full sm:w-auto">
                    <Plus className="h-4 w-4" />
                    Propor meu PDI
                  </Button>
                </Card>
              ) : devPlan.status === 'active' ? (
                <Card className="p-6 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sprout className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-bold tracking-tight text-foreground">Meu Desenvolvimento</h2>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-xs">✓ Ativo</Badge>
                  </div>
                  {devPlan.period_label && <p className="text-sm text-muted-foreground mb-3">Período: {devPlan.period_label}</p>}
                  {(devItems as any[]).map((item: any) => (
                    <div key={item.id} className={cn("flex items-start gap-3 py-3 border-b border-border last:border-0", item.status === 'completed' && "opacity-60")}>
                      <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", item.category === 'aprender' && "bg-blue-400", item.category === 'praticar' && "bg-purple-400", item.category === 'entregar' && "bg-emerald-400")} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium text-foreground", item.status === 'completed' && "line-through")}>{item.title}</p>
                        {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                        {item.due_date && <p className="text-xs text-muted-foreground mt-1">Prazo: {formatPDIDate(item.due_date)}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.status === 'completed' ? (
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-xs">Concluído</Badge>
                        ) : item.status === 'in_progress' ? (
                          <Button variant="ghost" size="sm" className="text-emerald-600 text-xs" onClick={() => updateItemStatus(item.id, 'completed')}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => updateItemStatus(item.id, 'in_progress')}>Iniciar</Button>
                            <Button variant="ghost" size="sm" className="text-emerald-600 text-xs" onClick={() => updateItemStatus(item.id, 'completed')}>
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </Card>
              ) : null}

              <NewPDIDialog open={showPDIDialog} onOpenChange={setShowPDIDialog} memberId={linkedMember.id} />

              
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

              {/* Seção de Avaliações Formais */}
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <FileText className="h-5 w-5 text-primary" />
                  Avaliações Formais
                </h2>
                {loadingReviews ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : sharedReviews.length === 0 ? (
                  <Card className="p-8 text-center rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
                    <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma avaliação compartilhada ainda
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Seu líder compartilhará avaliações formais quando estiverem prontas.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {sharedReviews.map((review: any) => (
                      <Card
                        key={review.id}
                        className="p-5 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
                        onClick={() => setSelectedReview(review)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm text-foreground">{review.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(review.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dialog de leitura da avaliação */}
            <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedReview?.title}</DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    {selectedReview && new Date(selectedReview.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </DialogHeader>
                <div className="prose prose-sm max-w-none mt-4">
                  {(() => {
                    const filtered = filterReviewForMember(selectedReview?.content || '');
                    if (filtered.includes('</')) {
                      return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(filtered) }} />;
                    }
                    return <ReactMarkdown>{filtered}</ReactMarkdown>;
                  })()}
                </div>
                <div className="flex gap-2 mt-6 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      if (!selectedReview) return;
                      const printWindow = window.open('', '_blank');
                      if (!printWindow) return;
                      const filtered = filterReviewForMember(selectedReview.content || '');
                      const htmlContent = filtered.includes('</') ? filtered : marked(filtered);
                      printWindow.document.write(`<!DOCTYPE html><html><head><title>${selectedReview.title}</title><style>body{font-family:'Segoe UI',Arial,sans-serif;padding:2cm;line-height:1.6;color:#333}h1{color:#222;border-bottom:3px solid #7C3AED;padding-bottom:16px}h2{color:#444;margin-top:28px}ul,ol{padding-left:24px}li{margin:6px 0}</style></head><body><h1>${selectedReview.title}</h1><p style="color:#666">${new Date(selectedReview.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>${htmlContent}</body></html>`);
                      printWindow.document.close();
                      setTimeout(() => printWindow.print(), 300);
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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

      {/* Meu Rhitmo Dialog */}
      {user && (
        <MentorChat
          open={meuRhitmoOpen}
          onOpenChange={(open) => {
            setMeuRhitmoOpen(open);
            if (!open) setMeuRhitmoInitialPrompt(undefined);
          }}
          userType="direct_report"
          memberName={displayName}
          memberRole={linkedMember.role}
          workStyleData={linkedMember.work_style_data}
          aiAnalysis={aiAnalysis}
          pdiItems={activePdiItems}
          latestReview={latestReviewContent ?? null}
          userId={user.id}
          initialPrompt={meuRhitmoInitialPrompt}
        />
      )}
    </div>
  );
}
