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
  {
    slug: "blindagem-trabalhista-feedback-com-evidencia",
    title: "Gestão ética e segurança jurídica: por que todo feedback compartilhado precisa de evidência com data",
    description: "Como a falta de registro das conversas cria riscos para a empresa e para a pessoa, e o que muda quando cada feedback tem fato e data.",
    category: 'Avaliação & PDI',
    date: '2026-10-24',
    readingMinutes: 5,
    author: 'Matheus Magalhães',
    blocks: [{"paragraphs": ["Quando uma conversa difícil não fica registrada, ela vira versão contra versão. Isso é ruim para a pessoa, que não sabe exatamente o que foi combinado, e ruim para a empresa, que não consegue mostrar que agiu com cuidado.", "Este texto não é orientação jurídica. É sobre uma prática de gestão que reduz ruído: registrar fatos, não impressões."]}, {"heading": "O que um bom registro tem", "bullets": ["O fato observado, sem adjetivo.", "A data real em que aconteceu, não a data em que foi anotado.", "O que foi combinado e o prazo.", "Se foi compartilhado com a pessoa ou ficou como nota privada do líder."]}, {"quote": "Feedback sem evidência vira opinião. Feedback com data vira histórico."}, {"heading": "Onde a Rhitmo entra", "paragraphs": ["Notas são privadas por padrão e só são compartilhadas por decisão explícita do líder. Cada registro guarda a data do fato e a origem, e a avaliação cita a fonte de cada frase."]}],
  },
  {
    slug: "avaliacao-de-desempenho-sem-formulario",
    title: "Avaliação de desempenho sem formulário de véspera",
    description: "Por que o ciclo de avaliação trava nas empresas médias e como trocar o formulário em branco por um rascunho montado com fatos.",
    category: 'Avaliação & PDI',
    date: '2026-10-24',
    readingMinutes: 5,
    author: 'Matheus Magalhães',
    blocks: [{"paragraphs": ["O formulário em branco na semana da avaliação é o ponto em que a liderança mais sofre: o líder precisa lembrar de meses em poucas horas.", "A alternativa não é um formulário melhor. É juntar as evidências ao longo do período e deixar o fim do ciclo só para revisar."]}, {"heading": "Três mudanças práticas", "bullets": ["Registrar fatos curtos depois de cada 1:1.", "Ligar a avaliação aos valores e comportamentos da empresa, não a notas soltas.", "Quando não houver evidência para um ponto, dizer isso com clareza em vez de preencher."]}],
  },
  {
    slug: "como-preparar-uma-1-1-em-5-minutos",
    title: "Como preparar uma 1:1 em poucos minutos",
    description: "Um roteiro curto para chegar na 1:1 sabendo o que foi combinado da última vez e o que vale puxar agora.",
    category: 'Liderança & 1:1s',
    date: '2026-10-24',
    readingMinutes: 5,
    author: 'Matheus Magalhães',
    blocks: [{"paragraphs": ["A 1:1 perde valor quando começa com \"então, como estão as coisas?\" sem contexto. Alguns minutos de preparo mudam a conversa."]}, {"heading": "Roteiro", "bullets": ["Releia o que foi combinado na última conversa.", "Veja se houve entregas, bloqueios ou feedbacks desde então.", "Escolha um tema de desenvolvimento para puxar.", "Deixe espaço para a pauta da pessoa vir primeiro."]}, {"heading": "Onde a Rhitmo entra", "paragraphs": ["A Rhitmo prepara uma pauta antes da 1:1 com base nas notas e evidências do liderado, para você revisar e ajustar."]}],
  },
  {
    slug: "cultura-da-empresa-na-avaliacao",
    title: "Como levar a cultura da empresa para dentro da avaliação de desempenho",
    description: "Valores só funcionam na avaliação quando viram comportamentos observáveis e uma régua clara.",
    category: 'Avaliação & PDI',
    date: '2026-10-24',
    readingMinutes: 5,
    author: 'Matheus Magalhães',
    blocks: [{"paragraphs": ["Muitas empresas têm valores bonitos na parede e uma avaliação que não fala deles. O elo que falta são comportamentos observáveis."]}, {"heading": "Do valor à evidência", "bullets": ["Defina cada valor como um pilar.", "Descreva comportamentos que mostram esse valor no dia a dia.", "Use uma régua de níveis igual para todos os líderes.", "Relacione evidências reais a cada comportamento, e só quando elas existirem."]}, {"heading": "Onde a Rhitmo entra", "paragraphs": ["Na Avaliação Institucional, a Rhitmo lê a cultura publicada da empresa, cruza com as evidências do período e avisa quando não há evidência suficiente para um valor."]}],
  },
  {
    slug: "espelho-de-vieses-na-avaliacao",
    title: "Espelho de vieses: revisar a própria avaliação antes de compartilhar",
    description: "Os vieses mais comuns na escrita de avaliações e uma checagem rápida antes de enviar para o liderado.",
    category: 'Produto',
    date: '2026-10-24',
    readingMinutes: 5,
    author: 'Matheus Magalhães',
    blocks: [{"paragraphs": ["Mesmo líderes cuidadosos escrevem com vieses: recência, linguagem diferente para pessoas diferentes, afirmações sem fato."]}, {"heading": "Checagem antes de compartilhar", "bullets": ["Cada afirmação tem um fato que a sustenta?", "O texto cobre o período inteiro?", "A linguagem seria a mesma para outra pessoa com a mesma entrega?"]}, {"heading": "Onde a Rhitmo entra", "paragraphs": ["O Espelho lê o rascunho atual e aponta trechos que merecem revisão. A decisão final é sempre do líder."]}],
  },
];

export const postBySlug = (slug?: string) => POSTS.find((p) => p.slug === slug);

export const formatPostDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
