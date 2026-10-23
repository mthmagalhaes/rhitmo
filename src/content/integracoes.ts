// Páginas públicas de integrações. Cartões vêm de `connectorsCatalog.ts` (fonte única);
// aqui fica só o texto editorial de cada página. Nada de números inventados.
import { CONNECTORS, type ConnectorEntry } from '@/lib/connectorsCatalog';

export interface IntegrationPage {
  id: string;
  slug: string;
  seoTitle: string;
  description: string;
  howItWorks: string[];
  steps: string[];
  useCases: string[];
}

const PAGES: IntegrationPage[] = [
  {
    id: 'granola', slug: 'granola',
    seoTitle: 'Integração Granola para 1:1 e avaliação de desempenho',
    description: 'Conecte o Granola à Rhitmo e transforme as notas das suas 1:1s em evidências organizadas por liderado, prontas para pauta e avaliação.',
    howItWorks: [
      'Você cola a chave de API do seu Granola. A Rhitmo guarda a chave criptografada e busca as notas novas periodicamente.',
      'Cada nota é atribuída ao liderado certo. Quando não há certeza, ela fica aguardando você escolher, em vez de ir para a pessoa errada.',
      'As notas viram evidências citáveis: a pauta da próxima 1:1 e o rascunho da avaliação apontam a fonte de cada frase.',
    ],
    steps: ['Gere a chave de API nas configurações do Granola.', 'Na Rhitmo, abra Conectores e escolha Granola.', 'Cole a chave e salve. As próximas notas chegam sozinhas.'],
    useCases: ['Preparar a 1:1 lendo o que foi combinado da última vez.', 'Montar a avaliação do semestre com fatos, não com memória.', 'Usar o Granola sem consumir horas do bot de reunião.'],
  },
  {
    id: 'fireflies', slug: 'fireflies',
    seoTitle: 'Integração Fireflies.ai com a Rhitmo',
    description: 'Traga as transcrições do Fireflies.ai para a Rhitmo e use as conversas com seu time como evidência em pautas e avaliações.',
    howItWorks: [
      'Com a chave de API do Fireflies, a Rhitmo importa as transcrições das reuniões com seus liderados.',
      'A transcrição completa fica visível só para você, líder. O liderado nunca vê o texto bruto.',
      'Resumos e combinados entram no histórico da pessoa e alimentam pauta e avaliação.',
    ],
    steps: ['Copie sua chave de API no painel do Fireflies.', 'Na Rhitmo, abra Conectores e escolha Fireflies.ai.', 'Cole a chave e salve.'],
    useCases: ['Aproveitar o Fireflies que o time já usa.', 'Não depender de anotar tudo durante a conversa.', 'Ter as falas de cada pessoa separadas por quem falou.'],
  },
  {
    id: 'tldv', slug: 'tldv',
    seoTitle: 'Integração tl;dv com a Rhitmo',
    description: 'Conecte o tl;dv e leve as transcrições das suas reuniões direto para Anotações & Evidências da Rhitmo.',
    howItWorks: [
      'A Rhitmo usa a chave de API do tl;dv para buscar as transcrições das suas reuniões.',
      'As reuniões com liderados viram anotações no histórico de cada pessoa, com data real do encontro.',
      'A integração exige um plano pago do tl;dv, que libera o acesso por API.',
    ],
    steps: ['Gere a chave de API no tl;dv (plano pago).', 'Na Rhitmo, abra Conectores e escolha tl;dv.', 'Cole a chave e salve.'],
    useCases: ['Centralizar as 1:1s gravadas pelo tl;dv.', 'Cruzar o que foi dito com metas e PDI.', 'Economizar horas do bot de reunião.'],
  },
  {
    id: 'fathom', slug: 'fathom',
    seoTitle: 'Integração Fathom com a Rhitmo',
    description: 'Resumos e transcrições do Fathom viram evidência organizada por liderado dentro da Rhitmo.',
    howItWorks: [
      'Com a chave de API do Fathom, a Rhitmo importa resumo e transcrição das reuniões gravadas.',
      'Cada reunião é associada ao liderado e entra na linha do tempo dele.',
      'Pauta, Pergunte à Rhitmo e avaliação passam a usar esse contexto, sempre com a fonte visível.',
    ],
    steps: ['Copie a chave de API nas configurações do Fathom.', 'Na Rhitmo, abra Conectores e escolha Fathom.', 'Cole a chave e salve.'],
    useCases: ['Reaproveitar os resumos que o Fathom já gera.', 'Lembrar combinados antes de cada conversa.', 'Avaliar com base em fatos do período inteiro.'],
  },
  {
    id: 'google_meet', slug: 'google-meet',
    seoTitle: 'Integração Google Meet: transcrições como evidência',
    description: 'Use as transcrições nativas do Google Meet na Rhitmo, atribuídas ao liderado, sem bot extra na reunião.',
    howItWorks: [
      'A Rhitmo reaproveita o login Google que você já usa na Agenda. Não é preciso colar chave.',
      'Quando a transcrição do Meet está ativada, ela chega à Rhitmo e é atribuída ao liderado da reunião.',
      'Requer Google Workspace com transcrição disponível. Está em Beta enquanto o Google revisa o acesso.',
    ],
    steps: ['Conecte o Google Agenda na Rhitmo.', 'Ative a transcrição nas suas reuniões do Meet.', 'Em Conectores, ligue o Google Meet.'],
    useCases: ['Ter a transcrição sem convidar um bot.', 'Manter tudo dentro do Google Workspace da empresa.', 'Preparar pauta com o que foi dito de fato.'],
  },
  {
    id: 'google_calendar', slug: 'google-agenda',
    seoTitle: 'Integração Google Agenda para reuniões 1:1',
    description: 'Sincronize sua agenda com a Rhitmo e receba a pauta pronta antes de cada 1:1 com seu time.',
    howItWorks: [
      'A Rhitmo lê os eventos da sua agenda e identifica as 1:1s com cada liderado.',
      'Antes de cada conversa, você recebe uma pauta com o histórico, combinados e pontos de atenção.',
      'Se quiser, o bot da Rhitmo entra na reunião para transcrever, dentro das horas do seu plano.',
    ],
    steps: ['Entre na Rhitmo com sua conta Google.', 'Em Conectores, ligue o Google Agenda.', 'Confira as próximas 1:1s na página inicial.'],
    useCases: ['Nunca mais chegar na 1:1 sem saber o que falar.', 'Ver quem está há muito tempo sem conversa.', 'Base para transcrição automática das reuniões.'],
  },
  {
    id: 'slack', slug: 'slack',
    seoTitle: 'Integração Slack: a Rhitmo no seu dia a dia',
    description: 'Converse com a Rhitmo no Slack, receba lembretes e registre feedbacks sem sair da conversa.',
    howItWorks: [
      'Você instala a Rhitmo no Slack da empresa e liga sua conta com um clique.',
      'Pela mensagem direta, você pergunta sobre seu time, registra uma anotação ou pede ajuda para escrever um feedback.',
      'Respostas sobre pessoas ficam só na sua mensagem direta, nunca em canais públicos.',
    ],
    steps: ['Em Conectores, escolha Slack.', 'Autorize a Rhitmo no seu workspace.', 'Mande um oi para a Rhitmo na mensagem direta.'],
    useCases: ['Registrar um fato na hora em que ele acontece.', 'Perguntar "como foi o mês da Ana?" sem abrir outra ferramenta.', 'Receber lembretes de 1:1 e pesquisas pendentes.'],
  },
  {
    id: 'zoom', slug: 'zoom',
    seoTitle: 'Integração Zoom com a Rhitmo (em breve)',
    description: 'Em breve: transcrições do Zoom AI Companion como evidência para 1:1s e avaliações na Rhitmo.',
    howItWorks: ['Estamos construindo a integração com o Zoom AI Companion.', 'A ideia é a mesma dos outros note takers: transcrição vira evidência atribuída ao liderado.', 'Hoje, o bot da Rhitmo já entra em reuniões do Zoom pelo Google Agenda.'],
    steps: ['Crie sua conta na Rhitmo.', 'Em Conectores, clique em "Quero esse" no Zoom.', 'Avisaremos quando estiver pronta.'],
    useCases: ['Times que fazem 1:1 no Zoom.', 'Empresas que já usam o AI Companion.'],
  },
  {
    id: 'teams', slug: 'microsoft-teams',
    seoTitle: 'Integração Microsoft Teams com a Rhitmo (em breve)',
    description: 'Em breve: transcrições do Microsoft Teams e Copilot como evidência na Rhitmo.',
    howItWorks: ['Estamos construindo a integração com transcrições do Teams.', 'Transcrições viram evidência atribuída ao liderado, visível só para o líder.', 'Hoje, o bot da Rhitmo já entra em reuniões do Teams pelo Google Agenda.'],
    steps: ['Crie sua conta na Rhitmo.', 'Em Conectores, clique em "Quero esse" no Teams.', 'Avisaremos quando estiver pronta.'],
    useCases: ['Empresas no ecossistema Microsoft 365.', 'Times que já usam o Copilot nas reuniões.'],
  },
];

export const INTEGRATIONS: (IntegrationPage & { entry: ConnectorEntry })[] = PAGES.flatMap((p) => {
  const entry = CONNECTORS.find((c) => c.id === p.id);
  return entry ? [{ ...p, entry }] : [];
});

export const integrationBySlug = (slug?: string) => INTEGRATIONS.find((i) => i.slug === slug);
