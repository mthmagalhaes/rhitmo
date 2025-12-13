import { BookOpen, Rocket, Users, Sparkles, FileText, Play } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const helpTopics = [
  {
    id: 'primeiros-passos',
    icon: Rocket,
    title: 'Primeiros Passos',
    subtitle: 'Como criar seu Workspace e Times',
    content: 'Ao entrar pela primeira vez, o Rhitmo pedirá o nome do seu Workspace. Depois, vá no menu de Times no topo e clique em "Novo Time". Separe seus liderados por squads, áreas ou projetos para organizar melhor suas notas.',
  },
  {
    id: 'gestao-pessoas',
    icon: Users,
    title: 'Gestão de Pessoas',
    subtitle: 'Adicionando Membros e Rhitmo Sync',
    content: 'Clique em "Novo Membro" para adicionar alguém ao seu time. Ao cadastrar, você pode enviar o convite do Rhitmo Sync – um questionário rápido que mapeia o perfil comportamental do membro, ajudando a IA a personalizar os feedbacks.',
  },
  {
    id: 'diario-bordo',
    icon: BookOpen,
    title: 'Diário de Bordo',
    subtitle: 'Criando notas inteligentes',
    content: 'Use o botão "Nova Nota" para registrar observações sobre seus liderados. Dica de ouro: registre fatos, não opiniões. A IA analisará o sentimento automaticamente e sugerirá coaching tips. No mobile, você pode usar a gravação de voz para acelerar.',
  },
  {
    id: 'mentor-chat',
    icon: Sparkles,
    title: 'Mentor Chat',
    subtitle: 'Como usar a IA de Liderança',
    content: 'O Chat conhece seu time e o histórico de notas. Pergunte coisas como: "Como dou feedback para a Ana sobre pontualidade?" ou "Me ajude a preparar a reunião de 1:1 com o João". Quanto mais notas você registrar, mais preciso o mentor será.',
  },
  {
    id: 'avaliacoes',
    icon: FileText,
    title: 'Avaliações',
    subtitle: 'Gerando Relatórios de Desempenho',
    content: 'Vá no perfil de um membro e acesse a aba "Avaliações Formais". Escolha o período (Mensal, Trimestral ou Semestral) e deixe a IA escrever o rascunho baseado nas suas notas. Você pode editar, exportar em PDF ou simplesmente copiar.',
  },
];

const HelpCenter = () => {
  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          Guia do Rhitmo
        </h1>
        <p className="text-muted-foreground mt-2">
          Domine a arte da gestão contínua com nossos tutoriais rápidos
        </p>
      </div>

      {/* Vídeo de Tour */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          Comece por aqui: Tour Completo (1:37)
        </h2>
        <div className="aspect-video w-full rounded-xl shadow-lg overflow-hidden border">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/bRQiwrBGlsc"
            title="Tour Completo do Rhitmo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {helpTopics.map((topic) => (
          <Card key={topic.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <topic.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg">{topic.title}</CardTitle>
                  <CardDescription className="mt-1">{topic.subtitle}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="details" className="border-none">
                  <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground py-2">
                    Ver detalhes
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed">
                    {topic.content}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer de Suporte */}
      <div className="border-t pt-8 text-center">
        <p className="text-muted-foreground">
          Ainda precisa de ajuda humana? Escreva para{' '}
          <span className="font-semibold text-foreground">support@rhitmo.co</span>{' '}
          em caso de dúvidas, reclamações ou feedbacks.
        </p>
      </div>
    </div>
  );
};

export default HelpCenter;
