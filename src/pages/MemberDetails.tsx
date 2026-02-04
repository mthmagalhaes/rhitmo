import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

import { FeedbackTimeline } from '@/components/FeedbackTimeline';
import { NewNoteDialog } from '@/components/NewNoteDialog';
import { MentorChat } from '@/components/MentorChat';
import { styleConfig } from '@/components/WorkStyleCard';
import { PerformanceReviewList } from '@/components/PerformanceReviewList';
import { useAuth } from '@/hooks/useAuth';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, PenSquare, Loader2, Sparkles, Mail, Copy, Target, Music, BookOpen, FileText, Clock, Lock, ArrowRight } from 'lucide-react';
import { GoalsManager } from '@/components/GoalsManager';

import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
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
  const {
    user,
    loading: authLoading
  } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  
  const [resendingInvite, setResendingInvite] = useState(false);
  const { toast } = useToast();
  const {
    hasSync
  } = usePlanLimits();

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

  // Query para workspace - necessário para isolamento de tenant no NewNoteDialog
  const { data: workspace } = useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

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
  const handleResendInvite = async () => {
    if (!member) return;
    setResendingInvite(true);
    try {
      const {
        data: inviteData,
        error: inviteError
      } = await supabase.functions.invoke('send-disc-invite', {
        body: {
          name: member.name,
          email: member.email,
          memberId: member.id
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
          <Button onClick={() => navigate('/')}>Voltar ao Dashboard</Button>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background pb-20">
      <main className="container mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb e ações */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2 -ml-3">
            <ArrowLeft className="h-4 w-4" />
            Início
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setChatOpen(true)} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Mentor Chat
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="gap-2 px-4">
              <PenSquare className="h-4 w-4" />
              Nova Anotação
            </Button>
          </div>
        </div>
        <div className="mb-8">
          <div className="flex items-start gap-6 mb-6">
            <MemberAvatar memberId={member.id} memberName={member.name} size="xl" />
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">{member.name}</h1>
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
                          Disponível no plano Flow ou superior
                        </p>
                        <Button size="sm" variant="outline" onClick={() => navigate('/billing')} className="gap-2">
                          Desbloquear
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div> : member.work_style_data ? <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Preferências de trabalho • Preenchido em {formatDate((member.work_style_data as unknown as WorkStyleData).completed_at)}
                    </p>
                    
                    <div className="space-y-4">
                      {/* Processing Style */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Processamento de informações</p>
                        <div>
                          {(() => {
                        const key = (member.work_style_data as unknown as WorkStyleData).processing;
                        const config = key ? styleConfig.processing[key as keyof typeof styleConfig.processing] : null;
                        if (!config) return null;
                        const Icon = config.icon;
                        return <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                                <Icon className="h-4 w-4" />
                                {config.label}
                              </Badge>;
                      })()}
                        </div>
                      </div>

                      {/* Feedback Style */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Estilo de feedback</p>
                        <div>
                          {(() => {
                        const key = (member.work_style_data as unknown as WorkStyleData).feedback;
                        const config = key ? styleConfig.feedback[key as keyof typeof styleConfig.feedback] : null;
                        if (!config) return null;
                        const Icon = config.icon;
                        return <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                                <Icon className="h-4 w-4" />
                                {config.label}
                              </Badge>;
                      })()}
                        </div>
                      </div>

                      {/* Autonomy Style */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Estilo de trabalho</p>
                        <div>
                          {(() => {
                        const key = (member.work_style_data as unknown as WorkStyleData).autonomy;
                        const config = key ? styleConfig.autonomy[key as keyof typeof styleConfig.autonomy] : null;
                        if (!config) return null;
                        const Icon = config.icon;
                        return <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                                <Icon className="h-4 w-4" />
                                {config.label}
                              </Badge>;
                      })()}
                        </div>
                      </div>

                      {/* Energy Style */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Horário de pico</p>
                        <div>
                          {(() => {
                        const key = (member.work_style_data as unknown as WorkStyleData).energy;
                        const config = key ? styleConfig.energy[key as keyof typeof styleConfig.energy] : null;
                        if (!config) return null;
                        const Icon = config.icon;
                        return <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                                <Icon className="h-4 w-4" />
                                {config.label}
                              </Badge>;
                      })()}
                        </div>
                      </div>

                      {/* Motivation Style */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Motivação principal</p>
                        <div>
                          {(() => {
                        const key = (member.work_style_data as unknown as WorkStyleData).motivation;
                        const config = key ? styleConfig.motivation[key as keyof typeof styleConfig.motivation] : null;
                        if (!config) return null;
                        const Icon = config.icon;
                        return <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                                <Icon className="h-4 w-4" />
                                {config.label}
                              </Badge>;
                      })()}
                        </div>
                      </div>
                    </div>
                  </div> : <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
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

            {/* Item 2: Objetivos/Metas - Sistema Estruturado */}
            <AccordionItem value="objectives" className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Objetivos / Metas</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <GoalsManager memberId={member.id} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <Tabs defaultValue="diary" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="diary" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Diário de Bordo
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Avaliações Formais
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="diary">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Histórico de Feedbacks</h2>
              {feedbacks.length > 0 ? <FeedbackTimeline feedbacks={feedbacks as any} onDelete={handleDeleteFeedback} /> : <Card className="p-12 text-center">
                  <p className="text-muted-foreground mb-4">Nenhum feedback registrado ainda</p>
                  <Button onClick={() => setDialogOpen(true)}>Adicionar Primeira Nota</Button>
                </Card>}
            </div>
          </TabsContent>
          
          <TabsContent value="reviews">
            <PerformanceReviewList memberId={member.id} memberName={member.name} />
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

      <MentorChat open={chatOpen} onOpenChange={setChatOpen} memberName={member.name} memberId={member.id} memberRole={member.role} feedbacks={feedbacks} workStyleData={member.work_style_data} keyObjectives={member.key_objectives} />
    </div>;
};
export default MemberDetails;