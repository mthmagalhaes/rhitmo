import { useState, useMemo } from 'react';
import {
  BookOpen, Rocket, Users, Sparkles, FileText, Search, Check,
  NotebookPen, MessageSquare, BarChart3, CalendarCheck, Award,
  UserCircle, Target, Settings, LayoutDashboard, Building2,
  Puzzle, ShieldCheck, Lightbulb, Mic, ClipboardPaste, Download,
  Slack, Calendar, FileAudio, Compass, Eye, Palette, Loader2, Unlink, Link
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RhythmWave } from '@/components/RhythmWave';
import { WaveDivider } from '@/components/WaveDivider';
import { useUserRole } from '@/hooks/useUserRole';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useSlackConnection } from '@/hooks/useSlackConnection';

interface FeatureCard {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  steps: string[];
}

const leaderCards: FeatureCard[] = [
  {
    id: 'l-start',
    icon: Rocket,
    title: 'Primeiros Passos',
    subtitle: 'Crie seu Workspace e organize seus Times',
    steps: [
      'Ao fazer login pela primeira vez, o Rhitmo pedirá o nome do seu Workspace.',
      'Vá no menu de Times no topo e clique em "Novo Time".',
      'Separe seus liderados por squads, áreas ou projetos.',
      'Adicione membros clicando em "Novo Membro" dentro de cada time.',
    ],
  },
  {
    id: 'l-notes',
    icon: NotebookPen,
    title: 'Diário de Bordo',
    subtitle: 'Registre notas inteligentes com IA',
    steps: [
      'Clique em "Nova Nota" no perfil de um membro.',
      'Escreva fatos observados — a IA analisará sentimento e sugerirá coaching tips.',
      'Use o botão de microfone 🎙️ para gravar notas por voz.',
      'Use o "Magic Paste" para colar transcrições de reuniões externas (Tactiq, Fireflies).',
    ],
  },
  {
    id: 'l-mentor',
    icon: Sparkles,
    title: 'Mentor Chat IA',
    subtitle: 'Seu Chief of Staff de liderança',
    steps: [
      'Abra o Chat no menu lateral ou no perfil de um membro.',
      'A IA conhece seu time e o histórico de notas.',
      'Pergunte: "Como dou feedback para a Ana sobre pontualidade?"',
      'Quanto mais notas você registrar, mais preciso e contextual o mentor será.',
    ],
  },
  {
    id: 'l-reviews',
    icon: FileText,
    title: 'Avaliações de Desempenho',
    subtitle: 'Gere relatórios automáticos baseados em evidências',
    steps: [
      'Acesse o perfil do membro → aba "Avaliações Formais".',
      'Escolha o período (Mensal, Trimestral ou Semestral).',
      'A IA gera o rascunho baseado nas notas do período — edite como quiser.',
      'Exporte em PDF, copie o texto, ou compartilhe diretamente com o liderado.',
    ],
  },
  {
    id: 'l-sync',
    icon: Users,
    title: 'Rhitmo Sync',
    subtitle: 'Mapeie o perfil comportamental do seu time',
    steps: [
      'Ao cadastrar um membro, marque "Enviar convite Rhitmo Sync".',
      'O liderado recebe um email com um questionário rápido.',
      'O perfil comportamental (estilo de comunicação, motivações) é preenchido automaticamente.',
      'A IA usa esse perfil para personalizar feedbacks e coaching tips.',
    ],
  },
  {
    id: 'l-analytics',
    icon: BarChart3,
    title: 'Analytics & Métricas',
    subtitle: 'Acompanhe a saúde do seu time',
    steps: [
      'Acesse "Analytics" no menu lateral para ver métricas gerais.',
      'Acompanhe sentimento médio, frequência de notas e distribuição por membro.',
      'Identifique membros que estão há muito tempo sem feedback.',
      'Use os dados para embasar conversas de 1:1.',
    ],
  },
  {
    id: 'l-meetings',
    icon: CalendarCheck,
    title: 'Reuniões 1:1',
    subtitle: 'Prepare-se para 1:1s com briefings automáticos',
    steps: [
      'Conecte seu Google Calendar em Configurações → Integrações.',
      'O Rhitmo detecta reuniões 1:1 e associa ao membro correto.',
      'Antes da reunião, um briefing IA é gerado com resumo de notas recentes.',
      'Após a reunião, registre suas observações como notas no diário.',
    ],
  },
  {
    id: 'l-competencies',
    icon: Award,
    title: 'Competências & PDI',
    subtitle: 'Framework e Planos de Desenvolvimento',
    steps: [
      'Acesse "Competências" no menu lateral para configurar o framework do time.',
      'Crie cargos e associe competências com níveis esperados.',
      'No perfil do membro, crie Planos de Desenvolvimento (PDI) com itens acionáveis.',
      'Acompanhe o progresso dos itens e adicione observações.',
    ],
  },
  {
    id: 'l-recording',
    icon: Mic,
    title: 'Gravação de Reuniões',
    subtitle: 'Grave reuniões e obtenha transcrições automáticas',
    steps: [
      'No perfil do liderado, clique em "Gravar Reunião".',
      'Uma janela popup será aberta — selecione a aba do Chrome com a reunião.',
      'A gravação roda na janela separada. Você pode continuar usando o Rhitmo normalmente.',
      'Ao parar a gravação, o áudio é transcrito automaticamente e as notas são classificadas pela IA.',
      'Atenção: não feche a janela do popup durante a gravação.',
    ],
  },
];

const memberCards: FeatureCard[] = [
  {
    id: 'm-start',
    icon: Rocket,
    title: 'Primeiro Acesso',
    subtitle: 'Comece a usar o Rhitmo como liderado',
    steps: [
      'Você recebeu um convite por email — clique no link para criar sua conta.',
      'Se solicitado, preencha o Rhitmo Sync (questionário comportamental rápido).',
      'Acesse seu painel para ver suas avaliações, objetivos e perfil.',
    ],
  },
  {
    id: 'm-dashboard',
    icon: LayoutDashboard,
    title: 'Meu Painel',
    subtitle: 'Career Compass e Skills Map',
    steps: [
      'O Career Compass mostra um resumo da sua trajetória e próximos passos sugeridos pela IA.',
      'O Skills Map exibe suas competências atuais vs. esperadas para seu cargo.',
      'Atualize seus dados de skills para manter o mapa preciso.',
    ],
  },
  {
    id: 'm-reviews',
    icon: FileText,
    title: 'Avaliações Recebidas',
    subtitle: 'Visualize e reconheça feedbacks formais',
    steps: [
      'Quando seu líder compartilhar uma avaliação, você verá uma notificação.',
      'Leia o conteúdo completo na aba "Avaliações".',
      'Clique em "Reconhecer" para confirmar que você leu e concorda ou quer discutir.',
    ],
  },
  {
    id: 'm-goals',
    icon: Target,
    title: 'Meus Objetivos',
    subtitle: 'PDI e metas pessoais',
    steps: [
      'Acesse a aba "PDI" no seu perfil para ver seus planos de desenvolvimento.',
      'Acompanhe os itens pendentes e marque como concluídos.',
      'Visualize seus Goals e progresso em métricas quantitativas.',
    ],
  },
  {
    id: 'm-profile',
    icon: Settings,
    title: 'Perfil & Configurações',
    subtitle: 'Gerencie seus dados e preferências',
    steps: [
      'Clique no seu avatar no canto superior para acessar configurações.',
      'Atualize sua foto, nome e informações de contato.',
      'Escolha o tema visual (claro, escuro ou automático).',
      'Altere sua senha a qualquer momento.',
    ],
  },
];

const hrCards: FeatureCard[] = [
  {
    id: 'h-dashboard',
    icon: LayoutDashboard,
    title: 'Painel RH',
    subtitle: 'Visão geral de toda a organização',
    steps: [
      'O painel exibe métricas consolidadas: total de líderes, membros, notas e avaliações.',
      'Veja quais líderes estão mais ativos e quais precisam de atenção.',
      'Acesse dados agregados sem violar a privacidade de notas individuais.',
    ],
  },
  {
    id: 'h-teams',
    icon: Building2,
    title: 'Gestão de Times e Líderes',
    subtitle: 'Administre a estrutura organizacional',
    steps: [
      'Acesse "Times" no menu RH para ver todos os times da organização.',
      'Visualize a estrutura hierárquica e os líderes responsáveis.',
      'Gerencie convites e permissões de acesso.',
    ],
  },
  {
    id: 'h-members',
    icon: Users,
    title: 'Gestão de Liderados',
    subtitle: 'Visão completa de todos os membros',
    steps: [
      'Em "Membros" veja a lista completa com filtros por líder, time e status.',
      'Acesse o perfil consolidado de cada membro (feedbacks, PDIs, Sync).',
      'Identifique membros em risco com o indicador de dias sem feedback.',
    ],
  },
  {
    id: 'h-competencies',
    icon: Award,
    title: 'Framework de Competências',
    subtitle: 'Configure cargos e níveis organizacionais',
    steps: [
      'Acesse "Competências" para configurar o framework da empresa.',
      'Crie competências, defina descrições por nível de senioridade.',
      'Associe competências a cargos usando o editor visual.',
      'Use templates do marketplace como ponto de partida.',
    ],
  },
  {
    id: 'h-analytics',
    icon: BarChart3,
    title: 'Analytics Organizacional',
    subtitle: 'Heatmap de engajamento e indicadores de risco',
    steps: [
      'O Heatmap mostra a frequência de feedback por líder ao longo do tempo.',
      'A tabela de Risco identifica membros com baixa atividade de gestão.',
      'Use esses dados para coaching de líderes e intervenções preventivas.',
    ],
  },
  {
    id: 'h-integrations',
    icon: Puzzle,
    title: 'Integrações',
    subtitle: 'Slack, convites e automações',
    steps: [
      'Configure a integração com o Slack para convites via bot.',
      'Gerencie templates de email e convites do Rhitmo Sync.',
      'Acompanhe o status de adoção da plataforma por time.',
    ],
  },
];

interface Integration {
  id: string;
  icon: React.ElementType;
  name: string;
  description: string;
  status: 'available' | 'beta';
}

const integrations: Integration[] = [
  {
    id: 'slack',
    icon: Slack,
    name: 'Slack',
    description: 'Envie convites de Rhitmo Sync e receba notificações diretamente no Slack do time.',
    status: 'available',
  },
  {
    id: 'calendar',
    icon: Calendar,
    name: 'Google Calendar',
    description: 'Detecte reuniões 1:1 automaticamente e gere briefings IA antes de cada encontro.',
    status: 'available',
  },
  {
    id: 'transcription',
    icon: FileAudio,
    name: 'Import de Transcrições',
    description: 'Cole transcrições do Tactiq, Fireflies ou Google Meet com o Magic Paste.',
    status: 'available',
  },
];

const faqItems = [
  {
    q: 'Registre fatos, não opiniões',
    a: 'A IA funciona melhor com observações concretas. Em vez de "João é desorganizado", escreva "João entregou o relatório 3 dias após o prazo combinado". Isso gera coaching tips mais acionáveis.',
  },
  {
    q: 'Quanto mais notas, melhor a IA',
    a: 'O Mentor Chat e as Avaliações automáticas são tão bons quanto os dados que você registra. Tente anotar pelo menos 1 observação por membro por semana.',
  },
  {
    q: 'Use Magic Paste para reuniões externas',
    a: 'Copie a transcrição do Tactiq, Fireflies ou Google Meet e cole no campo de texto ao criar uma nova nota. A IA vai extrair insights automaticamente.',
  },
  {
    q: 'Exporte avaliações em PDF',
    a: 'Na tela de avaliação formal, use o botão "Exportar PDF" para gerar um documento formatado pronto para compartilhar ou arquivar.',
  },
  {
    q: 'Grave notas por voz no celular',
    a: 'Use o ícone de microfone ao criar uma nota. A gravação é transcrita automaticamente e analisada pela IA — perfeito para registrar observações rápidas após reuniões.',
  },
  {
    q: 'Privacidade: quem vê o quê?',
    a: 'Suas notas são privadas por padrão — apenas você (líder) pode vê-las. Avaliações formais só são visíveis ao liderado quando você clica em "Compartilhar". O RH Admin vê métricas agregadas, nunca notas individuais.',
  },
];

const HelpCenter = () => {
  const { isHRAdmin, isUser } = useUserRole();
  const defaultTab = isHRAdmin ? 'hr' : isUser ? 'member' : 'leader';
  const [search, setSearch] = useState('');

  const filterCards = (cards: FeatureCard[]) => {
    if (!search.trim()) return cards;
    const q = search.toLowerCase();
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.steps.some((s) => s.toLowerCase().includes(q))
    );
  };

  const filteredLeader = useMemo(() => filterCards(leaderCards), [search]);
  const filteredMember = useMemo(() => filterCards(memberCards), [search]);
  const filteredHR = useMemo(() => filterCards(hrCards), [search]);

  const filteredIntegrations = useMemo(() => {
    if (!search.trim()) return integrations;
    const q = search.toLowerCase();
    return integrations.filter(
      (i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
    );
  }, [search]);

  const filteredFaq = useMemo(() => {
    if (!search.trim()) return faqItems;
    const q = search.toLowerCase();
    return faqItems.filter(
      (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="pb-20">
      {/* Hero Strip */}
      <div className="relative bg-primary/5 px-4 sm:px-6 md:px-8 pt-10 pb-6 overflow-hidden">
        <RhythmWave variant="background" className="absolute inset-0 opacity-30" />
        <div className="relative max-w-5xl mx-auto space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Central de Conhecimento
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold font-serif tracking-tight">
            Guia do Rhitmo
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Tudo o que você precisa saber para dominar a gestão contínua de performance — do primeiro login às avaliações formais.
          </p>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar no guia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
        </div>
      </div>

      <WaveDivider />

      <div className="px-4 sm:px-6 md:px-8 max-w-5xl mx-auto space-y-12 mt-8">
        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="leader" className="flex-1 sm:flex-none gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Líder
            </TabsTrigger>
            <TabsTrigger value="member" className="flex-1 sm:flex-none gap-1.5">
              <UserCircle className="h-4 w-4" /> Liderado
            </TabsTrigger>
            <TabsTrigger value="hr" className="flex-1 sm:flex-none gap-1.5">
              <Building2 className="h-4 w-4" /> RH Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leader" className="mt-8 space-y-8">
            <FeatureGrid cards={filteredLeader} />
          </TabsContent>
          <TabsContent value="member" className="mt-8 space-y-8">
            <FeatureGrid cards={filteredMember} />
          </TabsContent>
          <TabsContent value="hr" className="mt-8 space-y-8">
            <FeatureGrid cards={filteredHR} />
          </TabsContent>
        </Tabs>

        {/* Integrations */}
        <IntegrationsSection filteredIntegrations={filteredIntegrations} />

        {/* FAQ */}
        {filteredFaq.length > 0 && (
          <section className="space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Dicas & Truques
            </p>
            <Card className="rounded-2xl">
              <CardContent className="p-4 sm:p-6">
                <Accordion type="multiple" className="w-full">
                  {filteredFaq.map((item, idx) => (
                    <AccordionItem key={idx} value={`faq-${idx}`} className={idx === filteredFaq.length - 1 ? 'border-none' : ''}>
                      <AccordionTrigger className="text-sm font-medium hover:no-underline">
                        <span className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-primary shrink-0" />
                          {item.q}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed pl-6">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Footer */}
        <div className="border-t pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            Ainda precisa de ajuda? Escreva para{' '}
            <a href="mailto:support@rhitmo.co" className="font-semibold text-foreground hover:text-primary transition-colors">
              support@rhitmo.co
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

interface QuickStartStep {
  label: string;
  icon: React.ElementType;
}

function QuickStartCard({ title, steps }: { title: string; steps: QuickStartStep[] }) {
  return (
    <Card className="rounded-2xl border-primary/20 bg-primary/5">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">{title}</h2>
        </div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border"
            >
              <Checkbox checked={false} disabled className="h-5 w-5 shrink-0" />
              <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                <step.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-foreground">{step.label}</span>
            </div>
          ))}
        </div>
        <div>
          <Progress value={0} className="h-2" />
          <p className="text-xs text-muted-foreground text-center mt-2">
            0 de {steps.length} etapas concluídas
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureGrid({ cards }: { cards: FeatureCard[] }) {
  if (cards.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        Nenhum resultado encontrado para essa busca.
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card
          key={card.id}
          className="rounded-2xl transition-all hover:-translate-y-1 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
        >
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                <card.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm leading-tight">{card.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
              </div>
            </div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="steps" className="border-none">
                <AccordionTrigger className="text-xs text-muted-foreground hover:text-foreground py-1.5 hover:no-underline">
                  Como funciona
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="space-y-2 text-xs text-muted-foreground">
                    {card.steps.map((step, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="font-bold text-primary shrink-0">{idx + 1}.</span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default HelpCenter;
