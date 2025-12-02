import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MemberAvatar } from '@/components/MemberAvatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { FeedbackTimeline } from '@/components/FeedbackTimeline';
import { NewNoteDialog } from '@/components/NewNoteDialog';
import { MentorChat } from '@/components/MentorChat';
import { styleConfig } from '@/components/WorkStyleCard';
import { PerformanceReviewList } from '@/components/PerformanceReviewList';
import { Auth } from '@/components/Auth';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, PenSquare, Loader2, Sparkles, Mail, Copy, Target, Save, Music, Zap, BookOpen, Waves, Sunrise, Moon, Trophy, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const MemberDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [member, setMember] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [resendingInvite, setResendingInvite] = useState(false);
  const [keyObjectives, setKeyObjectives] = useState<string>('');
  const [savingObjectives, setSavingObjectives] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && id) {
      loadMemberAndFeedbacks();
    }
  }, [user, id]);

  useEffect(() => {
    if (member?.key_objectives !== undefined) {
      setKeyObjectives(member.key_objectives || '');
    }
  }, [member]);

  const loadMemberAndFeedbacks = async () => {
    try {
      // Carregar membro
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('*')
        .eq('id', id)
        .single();

      if (memberError) throw memberError;
      setMember(memberData);

      // Carregar feedbacks
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('member_id', id)
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;
      setFeedbacks(feedbackData || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      const { error } = await supabase
        .from('feedbacks')
        .delete()
        .eq('id', feedbackId);

      if (error) throw error;

      toast({
        title: "Feedback excluído",
        description: "O feedback foi removido com sucesso.",
      });

      loadMemberAndFeedbacks();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleReanalyze = async (feedbackId: string) => {
    setReanalyzingId(feedbackId);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reanalyze-feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`
          },
          body: JSON.stringify({ feedbackId })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao reprocessar');
      }
      
      toast({ 
        title: "Análise gerada!", 
        description: "A IA processou o feedback com sucesso." 
      });
      
      loadMemberAndFeedbacks();
    } catch (error: any) {
      console.error('Erro ao reprocessar:', error);
      toast({ 
        title: "Erro ao gerar análise", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setReanalyzingId(null);
    }
  };

  const handleResendInvite = async () => {
    if (!member) return;
    
    setResendingInvite(true);
    try {
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke('send-disc-invite', {
        body: { 
          name: member.name, 
          email: member.email,
          memberId: member.id
        }
      });

      if (inviteError) throw inviteError;

      toast({
        title: "Convite enviado!",
        description: `Email enviado para ${member.email}`,
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
      description: "Cole no WhatsApp ou envie para o membro.",
    });
  };

  const handleSaveObjectives = async () => {
    setSavingObjectives(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ key_objectives: keyObjectives.trim() || null })
        .eq('id', member.id);
      
      if (error) throw error;
      
      toast({
        title: "Objetivos salvos!",
        description: "A IA agora usará essas metas para calibrar análises."
      });
      
      setMember({ ...member, key_objectives: keyObjectives.trim() || null });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingObjectives(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const objectivesPlaceholder = `Use o formato: Objetivo | Valor | Prazo

Exemplos:
• Aumentar SQLs semanais | de 15 para 25 | até 31/out
• Reduzir tempo de resposta | de 4h para 1h | até 15/dez
• Concluir certificação AWS | aprovação | até 28/fev
• Liderar projeto de migração | entrega MVP | até 30/nov`;

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!member) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Membro não encontrado</h1>
          <Button onClick={() => navigate('/')}>Voltar ao Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-8">
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
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <PenSquare className="h-4 w-4" />
              Nova Nota
            </Button>
          </div>
        </div>
        <div className="mb-8">
          <div className="flex items-start gap-6 mb-6">
            <MemberAvatar 
              memberId={member.id}
              memberName={member.name}
              size="xl"
            />
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
                  <Music className="h-5 w-5 text-primary" />
                  <span className="font-semibold">🎵 Rhitmo Sync</span>
                  {member.work_style_data ? (
                    <span className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full ml-2">
                      Preenchido
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full ml-2">
                      Pendente
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {member.work_style_data ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Preferências de trabalho • Preenchido em {formatDate(member.work_style_data.completed_at)}
                    </p>
                    
                    <div className="space-y-4">
                      {/* Processing Style */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Processamento de informações</p>
                        <div>
                          {(() => {
                            const config = styleConfig.processing[member.work_style_data.processing];
                            const Icon = config.icon;
                            return (
                              <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                                <Icon className="h-4 w-4" />
                                {config.label}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Feedback Style */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Estilo de feedback</p>
                        <div>
                          {(() => {
                            const config = styleConfig.feedback[member.work_style_data.feedback];
                            const Icon = config.icon;
                            return (
                              <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                                <Icon className="h-4 w-4" />
                                {config.label}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Autonomy Style */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Estilo de trabalho</p>
                        <div>
                          {(() => {
                            const config = styleConfig.autonomy[member.work_style_data.autonomy];
                            const Icon = config.icon;
                            return (
                              <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                                <Icon className="h-4 w-4" />
                                {config.label}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Energy Style */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Horário de pico</p>
                        <div>
                          {(() => {
                            const config = styleConfig.energy[member.work_style_data.energy];
                            const Icon = config.icon;
                            return (
                              <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                                <Icon className="h-4 w-4" />
                                {config.label}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Motivation Style */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Motivação principal</p>
                        <div>
                          {(() => {
                            const config = styleConfig.motivation[member.work_style_data.motivation];
                            const Icon = config.icon;
                            return (
                              <Badge variant="secondary" className={`${config.color} gap-2 py-2 px-3`}>
                                <Icon className="h-4 w-4" />
                                {config.label}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-amber-700 dark:text-amber-400 text-sm mb-3">
                      ⏳ Aguardando preenchimento do Rhitmo Sync
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyLink}
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copiar Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResendInvite}
                        disabled={resendingInvite}
                        className="gap-2"
                      >
                        {resendingInvite ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                        Reenviar Convite
                      </Button>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Item 2: Objetivos/Metas */}
            <AccordionItem value="objectives" className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="font-semibold">🎯 Objetivos / Metas (Opcional)</span>
                  {member.key_objectives && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">
                      Configurado
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">
                      💡 Formato sugerido: Objetivo | Valor | Prazo
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Ex: Aumentar SQLs semanais | de 15 para 25 | até 31/out
                    </p>
                  </div>
                  
                  <Textarea
                    value={keyObjectives}
                    onChange={(e) => setKeyObjectives(e.target.value)}
                    placeholder={objectivesPlaceholder}
                    rows={5}
                    className="resize-none font-mono text-sm"
                  />
                  
                  {!keyObjectives && (
                    <p className="text-xs text-muted-foreground">
                      Adicione os objetivos deste período para a IA calibrar feedbacks e avaliações.
                    </p>
                  )}
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveObjectives} 
                      disabled={savingObjectives}
                      size="sm"
                    >
                      {savingObjectives ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar Objetivos
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <Tabs defaultValue="diary" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="diary">📓 Diário de Bordo</TabsTrigger>
            <TabsTrigger value="reviews">📊 Avaliações Formais</TabsTrigger>
          </TabsList>
          
          <TabsContent value="diary">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Histórico de Feedbacks</h2>
              {feedbacks.length > 0 ? (
                <FeedbackTimeline 
                  feedbacks={feedbacks} 
                  onDelete={handleDeleteFeedback}
                  onReanalyze={handleReanalyze}
                  reanalyzingId={reanalyzingId}
                />
              ) : (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground mb-4">Nenhum feedback registrado ainda</p>
                  <Button onClick={() => setDialogOpen(true)}>Adicionar Primeira Nota</Button>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="reviews">
            <PerformanceReviewList 
              memberId={member.id}
              memberName={member.name}
            />
          </TabsContent>
        </Tabs>
      </main>

      <NewNoteDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        selectedMemberId={member.id}
        memberName={member.name}
        onSuccess={loadMemberAndFeedbacks}
      />

      <MentorChat
        open={chatOpen}
        onOpenChange={setChatOpen}
        memberName={member.name}
        memberRole={member.role}
        feedbacks={feedbacks}
        workStyleData={member.work_style_data}
        keyObjectives={member.key_objectives}
      />
    </div>
  );
};

export default MemberDetails;
