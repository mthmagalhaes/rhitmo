import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';

import { FeedbackTimeline } from '@/components/FeedbackTimeline';
import { FeedbackFilters } from '@/components/FeedbackFilters';
import { NewNoteDialog } from '@/components/NewNoteDialog';
import { MentorChat } from '@/components/MentorChat';
import { styleConfig } from '@/components/WorkStyleCard';
import { PerformanceReviewList } from '@/components/PerformanceReviewList';
import { useAuth } from '@/hooks/useAuth';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useHomeRoute } from '@/hooks/useHomeRoute';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, PenSquare, Loader2, Sparkles, Mail, Copy, Music, BookOpen, FileText, Clock, Lock, ArrowRight, Briefcase, Heart, Megaphone, Compass, DollarSign, Shield, GraduationCap, Crown, HelpCircle, Sunrise, Moon, Search, CheckCircle, MessageSquare, CheckCircle2, Sprout, MoreHorizontal, Calendar as CalendarIcon } from 'lucide-react';
import { OneOnOnePrepCard } from '@/components/oneonone/OneOnOnePrepCard';
import { MemberUpcomingMeetings } from '@/components/oneonone/MemberUpcomingMeetings';
import { SlackActivityCard } from '@/components/dashboard/SlackActivityCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';


import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { InviteMemberDialog } from '@/components/InviteMemberDialog';

import { CreateFormalReviewDialog } from '@/components/review/CreateFormalReviewDialog';
import { FormalReviewSheet } from '@/components/review/FormalReviewSheet';
import { MonthlyRecapSection } from '@/components/recaps/MonthlyRecapSection';

import { RhitmoTimelineCard } from '@/components/recaps/RhitmoTimelineCard';
import { RhitmoTabSummary } from '@/components/recaps/RhitmoTabSummary';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface WorkStyleData {
  completed_at: string;
  processing: string;
  feedback: string;
  autonomy: string;
  energy: string;
  motivation: string;
}

const MemberDetails = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const home = useHomeRoute();
  const {
    user,
    loading: authLoading
  } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialThreadId, setInitialThreadId] = useState<string | null>(null);

  // Open MentorChat from external links (Home history, sidebar threads, ?openMentor=true)
  useEffect(() => {
    const threadParam = searchParams.get('thread');
    const openParam = searchParams.get('openMentor');
    if (openParam === 'true' || threadParam) {
      if (threadParam) setInitialThreadId(threadParam);
      setChatOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('openMentor');
      next.delete('thread');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [resendingInvite, setResendingInvite] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  
  const [formalReviewOpen, setFormalReviewOpen] = useState(false);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState<'um_pra_um' | 'diary' | 'rhitmo' | 'reviews'>('um_pra_um');
  const [activeRhitmoSub, setActiveRhitmoSub] = useState<'monthly'>('monthly');
  const { t: tRhitmo } = useTranslation('rhitmo');
  const { toast } = useToast();
  const {
    hasSync
  } = usePlanLimits();

  // Deep link: open note dialog from ?openNote=true, plus tab/sub-tab from ?tab=&sub=
  // Also: ?action=new on tab=reviews opens the formal review dialog automatically.
  const [cameFromReviews, setCameFromReviews] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openNote') === 'true') {
      setDialogOpen(true);
    }
    const tab = params.get('tab');
    if (tab === 'rhitmo' || tab === 'reviews' || tab === 'diary' || tab === 'um_pra_um') {
      setActiveTab(tab);
    }
    if (tab === 'reviews') {
      setCameFromReviews(true);
    }
    const sub = params.get('sub');
    if (sub === 'monthly') {
      setActiveRhitmoSub('monthly');
    }
    const action = params.get('action');
    if (tab === 'reviews' && action === 'new') {
      setFormalReviewOpen(true);
    }
    if (params.has('openNote') || params.has('tab') || params.has('sub') || params.has('action')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Robust deep-link: switch to Rhitmo tab and scroll, even from another tab.
  const jumpToRhitmoTimeline = () => {
    setActiveTab('rhitmo');
    setActiveRhitmoSub('monthly');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById('rhitmo-tab-trigger');
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };

  // Query para carregar membro
  const {
    data: member,
    isLoading: memberLoading
  } = useQuery({
    queryKey: ['member', id],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('team_members').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    // 5 minutos
    gcTime: 10 * 60 * 1000,
    // 10 minutos
    enabled: !!user && !!id,
    refetchOnWindowFocus: false
  });

  // Query para carregar feedbacks
  const {
    data: feedbacksRaw = [],
    isLoading: feedbacksLoading
  } = useQuery({
    queryKey: ['feedbacks', id],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('feedbacks').select('*').eq('member_id', id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user && !!id,
    refetchOnWindowFocus: false,
    // Poll every 5 seconds if there are feedbacks being processed (no summary yet)
    // But stop polling for items older than 30 seconds
    refetchInterval: query => {
      const data = query.state.data;
      const now = new Date();
      const hasPendingAnalysis = data?.some((f: any) => {
        if (f.summary || f.sentiment) return false;
        const createdAt = new Date(f.created_at);
        const diffSeconds = (now.getTime() - createdAt.getTime()) / 1000;
        return diffSeconds <= 30; // Only poll for recent items
      });
      return hasPendingAnalysis ? 5000 : false;
    }
  });

  const feedbacks = feedbacksRaw;

  // Lógica de filtragem client-side
  const filteredFeedbacks = useMemo(() => {
    let result = [...feedbacks];

    // 1. Filtro de Busca (title OU content)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(fb => {
        const titleMatch = fb.title?.toLowerCase().includes(query);
        // Para content, remover HTML antes de buscar
        const plainContent = fb.content.replace(/<[^>]*>/g, '').toLowerCase();
        const contentMatch = plainContent.includes(query);
        return titleMatch || contentMatch;
      });
    }

    // 2. Filtro de Tags (OR logic - pelo menos uma tag selecionada)
    if (selectedTags.length > 0) {
      result = result.filter(fb =>
        fb.tags?.some(tag => selectedTags.includes(tag))
      );
    }

    // 3. Filtro de período (date range)
    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      if (dateRange.to) {
        const to = endOfDay(dateRange.to);
        result = result.filter(fb => {
          const d = new Date(fb.occurred_at || fb.created_at);
          return isWithinInterval(d, { start: from, end: to });
        });
      } else {
        result = result.filter(fb => {
          const d = new Date(fb.occurred_at || fb.created_at);
          return d >= from;
        });
      }
    }

    // 4. Ordenação por data
    result.sort((a, b) => {
      const dateA = new Date(a.occurred_at || a.created_at).getTime();
      const dateB = new Date(b.occurred_at || b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [feedbacks, searchQuery, selectedTags, sortOrder, dateRange]);

  // Query para workspace - necessário para isolamento de tenant no NewNoteDialog
  const { data: workspace } = useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, leader_sync_data')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Query PDI pendente do membro
  const { data: memberDevPlan } = useQuery({
    queryKey: ['member-dev-plan', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('development_plans')
        .select('*')
        .eq('member_id', id!)
        .in('status', ['active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) { console.error('Error fetching member dev plan:', error); return null; }
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: memberDevItems = [] } = useQuery({
    queryKey: ['member-dev-items', memberDevPlan?.id],
    queryFn: async () => {
      if (!memberDevPlan?.id) return [];
      const { data, error } = await supabase
        .from('development_items')
        .select('*')
        .eq('plan_id', memberDevPlan.id)
        .order('created_at', { ascending: true });
      if (error) { console.error('Error fetching member dev items:', error); return []; }
      return data || [];
    },
    enabled: !!memberDevPlan?.id,
  });

  const categoryLabel: Record<string, string> = {
    aprender: '🎓 Aprender',
    praticar: '🏋️ Praticar',
    entregar: '🚀 Entregar',
  };


  const loading = memberLoading || feedbacksLoading;

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth', {
        replace: true
      });
    }
  }, [user, authLoading, navigate]);

  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      const {
        error
      } = await supabase.from('feedbacks').delete().eq('id', feedbackId);
      if (error) throw error;
      toast({
        title: "Feedback excluído",
        description: "O feedback foi removido com sucesso."
      });
      queryClient.invalidateQueries({
        queryKey: ['feedbacks', id]
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleToggleVisibility = async (feedbackId: string, newVisibility: 'shared' | 'private_leader') => {
    try {
      const { error } = await supabase
        .from('feedbacks')
        .update({ visibility: newVisibility })
        .eq('id', feedbackId);
      
      if (error) throw error;
      
      toast({
        title: newVisibility === 'shared' ? "Anotação compartilhada" : "Anotação tornada privada",
        description: newVisibility === 'shared' 
          ? "O colaborador agora pode ver esta anotação."
          : "Apenas você pode ver esta anotação."
      });
      
      queryClient.invalidateQueries({ queryKey: ['feedbacks', id] });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar visibilidade",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleResendInvite = async () => {
    if (!member) return;
    setResendingInvite(true);
    try {
      const syncUrl = `${window.location.origin}/sync/${member.id}`;
      const {
        data: inviteData,
        error: inviteError
      } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'sync-invite',
          recipientEmail: member.email,
          idempotencyKey: `sync-invite-resend-${member.id}-${Date.now()}`,
          templateData: {
            memberName: member.name,
            syncUrl,
          }
        }
      });
      if (inviteError) throw inviteError;
      toast({
        title: "Convite enviado!",
        description: `Email enviado para ${member.email}`
      });
    } catch (error: any) {
      console.error('Erro ao reenviar convite:', error);
      toast({
        title: "Erro ao reenviar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setResendingInvite(false);
    }
  };
  const handleCopyLink = () => {
    if (!member) return;
    const origin = window.location.origin;
    const syncUrl = `${origin}/sync/${member.id}`;
    navigator.clipboard.writeText(syncUrl);
    toast({
      title: "Link copiado!",
      description: "Cole no WhatsApp ou envie para o membro."
    });
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  // Helper function to render badge with fallback
  const renderBadge = (configCategory: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> | undefined, key: string | null | undefined) => {
    if (!key) return null;
    const config = configCategory?.[key];
    
    if (!config) {
      return (
        <Badge variant="secondary" className="gap-2 py-2 px-3 bg-gray-500/10 text-gray-600 dark:text-gray-400">
          <HelpCircle className="h-4 w-4" />
          {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
        </Badge>
      );
    }
    
    const Icon = config.icon;
    return (
      <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
        <Icon className="h-4 w-4" />
        {config.label}
      </Badge>
    );
  };

  if (authLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  if (!user) return null;
  if (!member) {
    return <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Membro não encontrado</h1>
          <Button onClick={() => navigate(home)}>Voltar ao início</Button>
        </div>
      </div>;
  }

  // Detect if V2 data exists
  const hasV2Data = !!(member.chronotype || member.feedback_style || member.recognition_style || 
    (member.motivators && Array.isArray(member.motivators) && (member.motivators as string[]).length > 0));
  
  const completedAt = (member.work_style_data as any)?.completed_at;

  return <div className="min-h-screen bg-background pb-20">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb e ações */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2 -ml-3">
            <ArrowLeft className="h-4 w-4" />
            Início
          </Button>
          <div className="flex gap-2">
            {/* CTA contextual: vindo do fluxo de Avaliações, prioriza "Nova Avaliação" */}
            {cameFromReviews ? (
              <Button onClick={() => setFormalReviewOpen(true)} className="gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Avaliação</span>
              </Button>
            ) : (
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <PenSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Nota</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" aria-label="Mais ações">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Mais ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {cameFromReviews && (
                  <DropdownMenuItem onClick={() => setDialogOpen(true)} className="gap-2">
                    <PenSquare className="h-4 w-4" />
                    Nova Nota
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setChatOpen(true)} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Rhitmo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
            <div className="mx-auto sm:mx-0">
              <MemberAvatar memberId={member.id} memberName={member.name} avatarUrl={member.avatar} size="xl" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{member.name}</h1>
                
                {/* Botão de Convite */}
                {member.invite_status === 'accepted' ? (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Usuário Ativo
                  </Badge>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setInviteDialogOpen(true)}
                    className="gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {member.invite_status === 'pending' ? 'Ver Convite' : 'Convidar'}
                  </Button>
                )}
              </div>
              <p className="text-lg text-muted-foreground mb-4">{member.role}</p>
              <span className="text-muted-foreground">{feedbacks.length} notas registradas</span>
            </div>
          </div>

          {/* Accordion Unificado */}
          <Accordion type="multiple" className="mb-6 space-y-2">
            {/* Item 1: Rhitmo Sync */}
            <AccordionItem value="rhitmo-sync" className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Rhitmo Sync</span>
                  {member.work_style_data ? <span className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full ml-2">
                      Preenchido
                    </span> : <span className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full ml-2">
                      Pendente
                    </span>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {!hasSync ?
              // Bloqueio Premium com Blur
              <div className="relative">
                    {/* Conteúdo com Blur */}
                    <div className="blur-md pointer-events-none opacity-50">
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Preferências de trabalho
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">🧠 Analítico</Badge>
                          <Badge variant="secondary">💬 Direto</Badge>
                          <Badge variant="secondary">🎯 Autônomo</Badge>
                          <Badge variant="secondary">🌅 Manhã</Badge>
                          <Badge variant="secondary">🏆 Reconhecimento</Badge>
                        </div>
                      </div>
                    </div>
                    
                    {/* Cadeado Central */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                          <Lock className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-sm font-medium">Recurso Premium</p>
                        <p className="text-xs text-muted-foreground">
                          Disponível no plano Pro ou superior
                        </p>
                        <Button size="sm" variant="outline" onClick={() => navigate('/billing')} className="gap-2">
                          Desbloquear
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div> : member.work_style_data ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Preferências de trabalho {completedAt && `• Preenchido em ${formatDate(completedAt)}`}
                      </p>
                      
                      <div className="space-y-4">
                        {hasV2Data ? (
                          <>
                            {/* V2: Chronotype */}
                            {member.chronotype && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Cronotipo</p>
                                <div>
                                  {renderBadge(styleConfig.chronotype, member.chronotype)}
                                </div>
                              </div>
                            )}

                            {/* V2: Feedback Style */}
                            {member.feedback_style && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Estilo de Feedback</p>
                                <div>
                                  {renderBadge(styleConfig.feedback_style, member.feedback_style)}
                                </div>
                              </div>
                            )}

                            {/* V2: Recognition Style */}
                            {member.recognition_style && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Estilo de Reconhecimento</p>
                                <div>
                                  {renderBadge(styleConfig.recognition_style, member.recognition_style)}
                                </div>
                              </div>
                            )}

                            {/* V2: Motivators (Array) */}
                            {member.motivators && Array.isArray(member.motivators) && (member.motivators as string[]).length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Motivadores Principais</p>
                                <div className="flex flex-wrap gap-2">
                                  {(member.motivators as string[]).map((motivator) => {
                                    const config = styleConfig.motivators?.[motivator as keyof typeof styleConfig.motivators];
                                    if (!config) {
                                      return (
                                        <Badge key={motivator} variant="secondary" className="gap-2 py-2 px-3 bg-gray-500/10 text-gray-700 dark:text-gray-400">
                                          <HelpCircle className="h-4 w-4" />
                                          {motivator.charAt(0).toUpperCase() + motivator.slice(1)}
                                        </Badge>
                                      );
                                    }
                                    const Icon = config.icon;
                                    return (
                                      <Badge key={motivator} variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                                        <Icon className="h-4 w-4" />
                                        {config.label}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {/* V1: Processing Style */}
                            {(member.work_style_data as unknown as WorkStyleData).processing && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Processamento de informações</p>
                                <div>
                                  {renderBadge(styleConfig.processing, (member.work_style_data as unknown as WorkStyleData).processing)}
                                </div>
                              </div>
                            )}

                            {/* V1: Feedback Style */}
                            {(member.work_style_data as unknown as WorkStyleData).feedback && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Estilo de feedback</p>
                                <div>
                                  {renderBadge(styleConfig.feedback, (member.work_style_data as unknown as WorkStyleData).feedback)}
                                </div>
                              </div>
                            )}

                            {/* V1: Autonomy Style */}
                            {(member.work_style_data as unknown as WorkStyleData).autonomy && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Estilo de trabalho</p>
                                <div>
                                  {renderBadge(styleConfig.autonomy, (member.work_style_data as unknown as WorkStyleData).autonomy)}
                                </div>
                              </div>
                            )}

                            {/* V1: Energy Style */}
                            {(member.work_style_data as unknown as WorkStyleData).energy && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Horário de pico</p>
                                <div>
                                  {renderBadge(styleConfig.energy, (member.work_style_data as unknown as WorkStyleData).energy)}
                                </div>
                              </div>
                            )}

                            {/* V1: Motivation Style */}
                            {(member.work_style_data as unknown as WorkStyleData).motivation && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Motivação principal</p>
                                <div>
                                  {renderBadge(styleConfig.motivation, (member.work_style_data as unknown as WorkStyleData).motivation)}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ) : <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-amber-700 dark:text-amber-400 text-sm mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Aguardando preenchimento do Rhitmo Sync
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-2">
                        <Copy className="h-4 w-4" />
                        Copiar Link
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleResendInvite} disabled={resendingInvite} className="gap-2">
                        {resendingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        Reenviar Convite
                      </Button>
                    </div>
                  </div>}
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </div>

        {/* PDI Card — read-only para o líder */}
        {memberDevPlan && memberDevPlan.status === 'active' && (
          <Card className="p-5 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sprout className="h-5 w-5 text-primary" />
              <p className="font-semibold text-foreground">PDI de {member.name}</p>
              {memberDevPlan.period_label && (
                <Badge className="bg-primary/10 text-primary text-xs ml-auto">{memberDevPlan.period_label}</Badge>
              )}
            </div>
            {(memberDevItems as any[]).map((item: any) => {
              const completedCount = (memberDevItems as any[]).filter((i: any) => i.status === 'completed').length;
              return (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  {item.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : item.status === 'in_progress' ? (
                    <div className="h-4 w-4 rounded-full border-2 border-primary shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={cn("text-sm", item.status === 'completed' && "line-through text-muted-foreground")}>{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {categoryLabel[item.category] || item.category}
                      {item.due_date && ` · Prazo: ${formatDate(item.due_date)}`}
                    </p>
                  </div>
                  {item.status === 'completed' && (
                    <Badge className="bg-emerald-50 text-emerald-600 text-xs">Concluído</Badge>
                  )}
                  {item.status === 'in_progress' && (
                    <Badge className="bg-blue-50 text-blue-600 text-xs">Em andamento</Badge>
                  )}
                </div>
              );
            })}
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {(memberDevItems as any[]).filter((i: any) => i.status === 'completed').length} de {memberDevItems.length} objetivos concluídos
              </p>
            </div>
          </Card>
        )}

        {/* Rhitmo timeline transition card — bridges existing users into the new ritual */}
        {(() => {
          const lastMonthStart = new Date();
          lastMonthStart.setUTCDate(1);
          lastMonthStart.setUTCMonth(lastMonthStart.getUTCMonth() - 1);
          const thisMonthStart = new Date();
          thisMonthStart.setUTCDate(1);
          const fbLastMonth = feedbacks.filter((f: any) => {
            const d = new Date(f.occurred_at || f.created_at);
            return d >= lastMonthStart && d < thisMonthStart;
          }).length;
          return (
            <RhitmoTimelineCard
              memberId={member.id}
              feedbacksLastMonthCount={fbLastMonth}
              onJumpToRhitmo={() => jumpToRhitmoTimeline()}
            />
          );
        })()}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="um_pra_um" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              1:1
            </TabsTrigger>
            <TabsTrigger value="diary" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Diário de Bordo
            </TabsTrigger>
            <TabsTrigger value="rhitmo" id="rhitmo-tab-trigger" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Rhitmo
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Avaliações Formais
            </TabsTrigger>
          </TabsList>

          <TabsContent value="um_pra_um">
            <div className="space-y-6">
              <OneOnOnePrepCard
                workspaceId={workspace?.id ?? null}
                memberId={member.id}
              />
              <section className="space-y-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Próximas reuniões
                </h2>
                <MemberUpcomingMeetings
                  memberId={member.id}
                  memberName={member.name}
                />
              </section>
              <SlackActivityCard memberId={member.id} />
              <Card
                className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-4 flex items-center justify-between cursor-pointer hover:-translate-y-0.5 transition-transform"
                onClick={() => setActiveTab('diary')}
              >
                <div>
                  <p className="font-serif text-sm font-bold tracking-tight">
                    Histórico de 1:1s e notas
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Veja todas as 1:1s anteriores, briefs e transcrições deste liderado.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Card>
            </div>
          </TabsContent>

          
          <TabsContent value="diary">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Minhas anotações</h2>
              
              {feedbacks.length > 0 && (
                <FeedbackFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  selectedTags={selectedTags}
                  onTagsChange={setSelectedTags}
                  sortOrder={sortOrder}
                  onSortChange={setSortOrder}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
              )}
              
              {feedbacks.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground mb-4">Nenhum feedback registrado ainda</p>
                  <Button onClick={() => setDialogOpen(true)}>Adicionar Primeira Nota</Button>
                </Card>
              ) : filteredFeedbacks.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma anotação encontrada para estes filtros.</p>
                  <Button
                    variant="link"
                    onClick={() => { setSearchQuery(''); setSelectedTags([]); setDateRange(undefined); }}
                    className="mt-2"
                  >
                    Limpar filtros
                  </Button>
                </Card>
              ) : (
                <FeedbackTimeline 
                  feedbacks={filteredFeedbacks as any} 
                  onDelete={handleDeleteFeedback}
                  onToggleVisibility={handleToggleVisibility}
                />
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="rhitmo">
            <div className="space-y-6">
              <RhitmoTabSummary
                memberId={member.id}
                onSwitchSection={() => setActiveRhitmoSub('monthly')}
              />

              <MonthlyRecapSection memberId={member.id} />
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <PerformanceReviewList memberId={member.id} memberName={member.name} onCreateReview={() => setFormalReviewOpen(true)} />
          </TabsContent>
        </Tabs>
      </main>

      <NewNoteDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        selectedMemberId={member.id} 
        memberName={member.name} 
        workspaceId={workspace?.id}
        onSuccess={() => queryClient.invalidateQueries({
          queryKey: ['feedbacks', id]
        })} 
      />

      <MentorChat open={chatOpen} onOpenChange={setChatOpen} userType="leader" memberName={member.name} memberId={member.id} memberRole={member.role} feedbacks={feedbacks} workStyleData={member.work_style_data} keyObjectives={member.key_objectives} leaderSyncData={workspace?.leader_sync_data} initialThreadId={initialThreadId} />

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        member={{
          id: member.id,
          name: member.name,
          email: member.email,
          invite_status: member.invite_status,
          invite_token: member.invite_token
        }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['member', id] })}
      />

      <CreateFormalReviewDialog
        open={formalReviewOpen}
        onOpenChange={setFormalReviewOpen}
        member={{ id: member.id, name: member.name, role: member.role }}
        workspaceId={workspace?.id || ''}
        onReviewCreated={(reviewId) => {
          setSelectedReviewId(reviewId);
          setReviewSheetOpen(true);
        }}
      />

      {selectedReviewId && (
        <FormalReviewSheet
          open={reviewSheetOpen}
          onOpenChange={setReviewSheetOpen}
          reviewId={selectedReviewId}
          onSent={() => {
            queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
          }}
        />
      )}
    </div>;
};
export default MemberDetails;
