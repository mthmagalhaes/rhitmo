import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FeedbackTimeline } from '@/components/FeedbackTimeline';
import { Home, Compass, FileText, User, Zap, CheckCircle, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { CareerCompassCard, type AIAnalysis } from './CareerCompassCard';
import { toast } from 'sonner';

interface LinkedMemberData {
  id: string;
  name: string;
  email: string | null;
  role: string;
  skills_data: {
    role_tenure?: string;
    responsibilities?: string[];
    aspirations?: string;
    interests?: string[];
    onboarding_completed?: boolean;
    completed_at?: string;
    ai_analysis?: AIAnalysis;
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
  'madrugador': '🌅 Madrugador',
  'comercial': '☀️ Comercial',
  'noturno': '🌙 Noturno',
};

const feedbackStyleLabels: Record<string, string> = {
  'direto': '🎯 Direto',
  'empatico': '💛 Empático',
  'escrito': '📝 Escrito',
};

const recognitionStyleLabels: Record<string, string> = {
  'publico': '📢 Público',
  'privado': '🤫 Privado',
};

export default function DirectReportDashboard({ linkedMember }: DirectReportDashboardProps) {
  const [activeTab, setActiveTab] = useState('visao-geral');

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
              {aiAnalysis && <CareerCompassCard aiAnalysis={aiAnalysis} />}
              <Card className="p-12 rounded-2xl border-0 shadow-[0_2px_20px_rgba(0,0,0,0.04)] text-center">
                <Compass className="h-12 w-12 mx-auto mb-4 text-primary opacity-50" />
                <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">Minha Carreira</h2>
                <p className="text-muted-foreground text-sm">
                  Skills map, PDI e Career Coach chegam em breve.
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
                    onClick={() => toast('Em breve você poderá editar seu Rhitmo Sync diretamente aqui')}
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
                <p className="text-sm text-muted-foreground mb-4">Seu perfil comportamental e preferências</p>

                {hasRhitmoSync ? (
                  <div className="space-y-3">
                    {linkedMember.chronotype && (
                      <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary text-xs px-3 py-1">
                        {chronotypeLabels[linkedMember.chronotype] || linkedMember.chronotype}
                      </Badge>
                    )}
                    {linkedMember.feedback_style && (
                      <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary text-xs px-3 py-1 ml-2">
                        {feedbackStyleLabels[linkedMember.feedback_style] || linkedMember.feedback_style}
                      </Badge>
                    )}
                    {linkedMember.recognition_style && (
                      <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary text-xs px-3 py-1 ml-2">
                        {recognitionStyleLabels[linkedMember.recognition_style] || linkedMember.recognition_style}
                      </Badge>
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
                    onClick={() => toast('Edição do Sync disponível em breve')}
                  >
                    Atualizar Sync
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
