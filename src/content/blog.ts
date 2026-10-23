// Posts do blog público. Regra editorial: sem números, estatísticas ou depoimentos inventados; sem travessão.
export type BlogCategory = 'Liderança & 1:1s' | 'Avaliação & PDI' | 'Produto';

export interface BlogBlock {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  quote?: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  date: string; // ISO
  readingMinutes: number;
  author: string;
  featured?: boolean;
  blocks: BlogBlock[];
  related?: { label: string; to: string };
}

export const BLOG_CATEGORIES: BlogCategory[] = ['Liderança & 1:1s', 'Avaliação & PDI', 'Produto'];

export const POSTS: BlogPost[] = [
  {
    slug: 'vies-de-recencia-avaliacao-de-desempenho',
    title: 'Viés de recência: por que sua avaliação fala só dos últimos dois meses',
    description: 'O que é o viés de recência, como ele distorce a avaliação de desempenho e um método simples para avaliar o período inteiro.',
    category: 'Avaliação & PDI',
    date: '2026-10-23',
    readingMinutes: 6,
    author: 'Matheus Magalhães',
    featured: true,
    related: { label: 'Guia completo de avaliação de desempenho', to: '/guias/avaliacao-de-desempenho' },
    blocks: [
      { paragraphs: [
        'Chega a época da avaliação, você abre o documento em branco e começa a escrever. O que vem à cabeça primeiro é a entrega da semana passada, o atrito do mês retrasado, aquela reunião difícil recente. O semestre inteiro vira oito semanas.',
        'Isso tem nome: viés de recência. É a tendência de dar mais peso ao que aconteceu por último. Não é falta de cuidado do líder, é como a memória funciona.',
      ] },
      { heading: 'Por que isso é um problema', bullets: [
        'Quem teve um ótimo começo de ciclo e um final mais morno é avaliado abaixo do que entregou.',
        'Quem acelerou só no fim parece melhor do que o período mostra.',
        'O feedback perde credibilidade: a pessoa lembra do que fez em março, e você não.',
      ] },
      { heading: 'O antídoto é registro, não esforço de memória', paragraphs: [
        'Não dá para corrigir um viés de memória só com boa vontade. O que funciona é ter fatos anotados ao longo do período: o que foi combinado em cada 1:1, entregas, feedbacks recebidos, momentos de dificuldade.',
        'Com isso, a avaliação deixa de ser um exercício de lembrar e vira um exercício de ler e interpretar.',
      ] },
      { quote: 'Uma boa avaliação não é escrita na véspera. Ela é montada ao longo do período e só organizada no final.' },
      { heading: 'Um método simples para o próximo ciclo', bullets: [
        'Anote dois ou três fatos depois de cada 1:1. Curto e concreto: o que aconteceu, quando, qual o impacto.',
        'Divida o período em blocos (por mês ou trimestre) e confira se cada bloco tem evidência antes de escrever.',
        'Para cada afirmação na avaliação, pergunte: qual fato sustenta isso? Se não houver, diga que não há evidência suficiente.',
        'Peça para a pessoa trazer a autoavaliação. Ela costuma lembrar do começo do ciclo melhor do que você.',
      ] },
      { heading: 'Onde a Rhitmo entra', paragraphs: [
        'A Rhitmo junta as notas das suas 1:1s, transcrições e anotações por liderado, com a data real de cada fato. Na hora da avaliação, o rascunho cita a fonte de cada frase e o Espelho aponta quando o texto se apoia demais no fim do período.',
      ] },
    ],
  },
  {
    slug: 'perguntas-para-reuniao-1-1',
    title: 'Perguntas para reunião 1:1 que vão além do "como estão as coisas?"',
    description: 'Perguntas práticas para 1:1, organizadas por objetivo: clima, bloqueios, carreira e feedback para o líder.',
    category: 'Liderança & 1:1s',
    date: '2026-10-20',
    readingMinutes: 5,
    author: 'Matheus Magalhães',
    related: { label: 'Guia de reunião one-on-one', to: '/guias/reuniao-one-on-one' },
    blocks: [
      { paragraphs: [
        'A 1:1 é a reunião mais importante da semana de um líder, e a mais fácil de desperdiçar. Sem pauta, ela vira status de projeto. As perguntas abaixo ajudam a abrir espaço para o que realmente importa.',
      ] },
      { heading: 'Para entender como a pessoa está', bullets: [
        'De zero a dez, como foi sua semana? O que faria virar um ponto a mais?',
        'O que te deu mais energia nos últimos dias? E o que mais drenou?',
        'Tem algo que você queria falar e ainda não encontrou espaço?',
      ] },
      { heading: 'Para destravar o trabalho', bullets: [
        'O que está te atrasando que eu posso remover?',
        'Tem alguma decisão esperando por mim?',
        'Se você pudesse parar de fazer uma coisa amanhã, qual seria?',
      ] },
      { heading: 'Para falar de carreira', bullets: [
        'Que tipo de trabalho você quer fazer mais daqui a um ano?',
        'Qual habilidade você quer que as pessoas reconheçam em você?',
        'O que do seu PDI avançou desde a nossa última conversa?',
      ] },
      { heading: 'Para receber feedback como líder', bullets: [
        'O que eu poderia fazer diferente para te ajudar mais?',
        'Teve algum momento recente em que eu atrapalhei sem perceber?',
      ] },
      { quote: 'A melhor pergunta da 1:1 é a que retoma o que foi combinado na anterior.' },
      { heading: 'Feche sempre com combinados', paragraphs: [
        'Termine cada 1:1 com dois ou três combinados claros, com dono e prazo. Na próxima conversa, comece por eles. É isso que dá continuidade e transforma a 1:1 em um ritual, não em um evento solto.',
      ] },
    ],
  },
  {
    slug: 'notas-de-reuniao-viram-evidencia',
    title: 'Como suas notas de reunião viram evidência na Rhitmo',
    description: 'Do Granola, Fireflies, tl;dv, Fathom ou Google Meet até a avaliação: o caminho de uma nota e como a privacidade é preservada.',
    category: 'Produto',
    date: '2026-10-17',
    readingMinutes: 4,
    author: 'Matheus Magalhães',
    related: { label: 'Ver todas as integrações', to: '/integracoes' },
    blocks: [
      { paragraphs: [
        'Muitos líderes já usam um note taker nas reuniões. O problema é que essas notas ficam espalhadas, sem ligação com a pessoa, e ninguém volta a elas na hora da avaliação. Construímos os conectores da Rhitmo para resolver exatamente isso.',
      ] },
      { heading: 'O caminho de uma nota', bullets: [
        'Você conecta sua ferramenta (Granola, Fireflies, tl;dv, Fathom ou Google Meet).',
        'As notas novas chegam sozinhas e são atribuídas ao liderado da reunião.',
        'Quando a Rhitmo não tem certeza de quem é a nota, ela espera você escolher. Prefere perguntar a errar.',
        'A nota entra na linha do tempo da pessoa com a data real do encontro.',
        'Pauta, Pergunte à Rhitmo e avaliação passam a citar essa nota como fonte.',
      ] },
      { heading: 'Privacidade por padrão', paragraphs: [
        'Notas e transcrições são do líder. O liderado nunca vê o texto bruto de uma reunião. Só o que você decide compartilhar, como uma avaliação finalizada, chega até ele.',
        'As chaves das ferramentas ficam criptografadas, e os dados de cada empresa ficam isolados.',
      ] },
      { heading: 'Sem consumir horas do bot', paragraphs: [
        'Quem já usa um note taker não precisa do bot da Rhitmo na reunião. As notas chegam pelo conector, sem gastar horas de gravação do plano.',
      ] },
    ],
  },
];

export const postBySlug = (slug?: string) => POSTS.find((p) => p.slug === slug);

export const formatPostDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
