// Guias públicos do rhitmo.co. Fonte única para página, Helmet, JSON-LD e /recursos.
// Regra editorial: nada de números, estatísticas ou depoimentos inventados.

export interface GuideSection {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  examples?: { label: string; text: string }[];
}

export interface Guide {
  slug: string;
  source: 'guia-avaliacao' | 'guia-1on1' | 'guia-pdi';
  eyebrow: string;
  title: string;
  seoTitle: string;
  description: string;
  intro: string;
  readingMinutes: number;
  sections: GuideSection[];
  faq: { q: string; a: string }[];
}

export const GUIDES: Guide[] = [
  {
    slug: 'avaliacao-de-desempenho',
    source: 'guia-avaliacao',
    eyebrow: 'Guia para líderes',
    title: 'Avaliação de desempenho: guia prático para líderes',
    seoTitle: 'Avaliação de desempenho: guia prático e o que escrever',
    description:
      'Como fazer uma avaliação de desempenho justa, o que escrever em cada parte, exemplos de frases e os vieses que mais distorcem o resultado.',
    intro:
      'Uma boa avaliação de desempenho não é um formulário preenchido na véspera. É o resumo honesto de um período, apoiado em fatos, que ajuda a pessoa a entender onde está e para onde ir. Este guia mostra como chegar lá sem sofrimento.',
    readingMinutes: 9,
    sections: [
      {
        id: 'o-que-e',
        title: 'O que é avaliação de desempenho',
        paragraphs: [
          'Avaliação de desempenho é o momento em que líder e liderado olham juntos para um período de trabalho: o que foi entregue, como foi entregue e o que precisa evoluir. Ela costuma acontecer em ciclos (semestral ou anual), mas só funciona bem quando se apoia no que aconteceu ao longo de todo o período.',
          'O objetivo não é dar uma nota. É criar clareza. A pessoa precisa sair da conversa sabendo o que deve continuar fazendo, o que deve mudar e com que apoio pode contar.',
        ],
      },
      {
        id: 'antes',
        title: 'Antes de escrever: junte evidências',
        paragraphs: [
          'O erro mais comum é escrever de memória. A memória privilegia o último mês e os episódios mais marcantes, bons ou ruins. Antes de abrir o formulário, reúna o que você registrou no período.',
        ],
        bullets: [
          'Anotações das suas reuniões 1:1.',
          'Entregas e projetos concluídos, com datas.',
          'Feedbacks que você deu ou recebeu de outras pessoas sobre o liderado.',
          'Metas combinadas no início do ciclo e o que aconteceu com cada uma.',
          'A autoavaliação da pessoa, se houver.',
        ],
      },
      {
        id: 'o-que-escrever',
        title: 'O que escrever em cada parte',
        paragraphs: [
          'Uma estrutura simples funciona para quase todos os modelos de empresa: resumo, pontos fortes, pontos de desenvolvimento e próximos passos. Em cada parte, descreva comportamentos observáveis e o impacto deles, nunca traços de personalidade.',
        ],
        examples: [
          { label: 'Ponto forte (evite)', text: 'É muito proativa.' },
          { label: 'Ponto forte (prefira)', text: 'Em março, identificou o atraso do fornecedor antes do time e propôs um plano alternativo que manteve a entrega no prazo.' },
          { label: 'Desenvolvimento (evite)', text: 'Precisa se comunicar melhor.' },
          { label: 'Desenvolvimento (prefira)', text: 'Nas apresentações para a diretoria, os riscos do projeto apareceram só no fim. O esperado é abrir com status, riscos e decisão necessária.' },
          { label: 'Próximo passo', text: 'Até o fim do trimestre, conduzir sozinha a reunião mensal com a área de vendas, com um alinhamento prévio comigo na semana anterior.' },
        ],
      },
      {
        id: 'vieses',
        title: 'Os vieses que mais distorcem uma avaliação',
        bullets: [
          'Recência: dar peso demais ao que aconteceu nas últimas semanas.',
          'Efeito halo: deixar uma qualidade forte contaminar todas as outras notas.',
          'Generalização: usar "sempre" e "nunca" para algo que aconteceu poucas vezes.',
          'Afinidade: avaliar melhor quem pensa e trabalha parecido com você.',
          'Tendência central: dar nota média para todo mundo para evitar conversas difíceis.',
        ],
        paragraphs: [
          'A melhor defesa contra todos eles é a mesma: cada afirmação da avaliação deve apontar para um fato com data.',
        ],
      },
      {
        id: 'conversa',
        title: 'Como conduzir a conversa',
        bullets: [
          'Envie a avaliação com antecedência ou comece pedindo a visão da pessoa.',
          'Abra com o resumo e os pontos fortes, de forma específica.',
          'Apresente os pontos de desenvolvimento como comportamento esperado, não como crítica pessoal.',
          'Combine os próximos passos juntos e registre o que foi acordado.',
          'Feche perguntando o que a pessoa precisa de você.',
        ],
      },
      {
        id: 'continuo',
        title: 'Como deixar a próxima avaliação mais fácil',
        paragraphs: [
          'A avaliação fica simples quando o registro é contínuo. Anote fatos depois de cada 1:1, guarde feedbacks no momento em que acontecem e revise o histórico a cada mês. Ferramentas como a Rhitmo fazem esse trabalho de forma automática: importam as notas das suas reuniões, organizam por pessoa e montam o rascunho da avaliação com a fonte de cada frase.',
        ],
      },
    ],
    faq: [
      { q: 'Com que frequência fazer avaliação de desempenho?', a: 'O ciclo formal costuma ser semestral ou anual, mas o acompanhamento deve ser contínuo, com 1:1s regulares e registros ao longo do período.' },
      { q: 'O que escrever na avaliação de desempenho individual?', a: 'Um resumo do período, pontos fortes com exemplos, pontos de desenvolvimento descritos como comportamento esperado e próximos passos com prazo.' },
      { q: 'Como evitar injustiça na avaliação?', a: 'Baseie cada afirmação em um fato com data, revise o período inteiro e não apenas as últimas semanas, e compare critérios entre pessoas do mesmo nível.' },
    ],
  },
  {
    slug: 'reuniao-one-on-one',
    source: 'guia-1on1',
    eyebrow: 'Guia para líderes',
    title: 'Reunião 1:1 (one on one): como fazer, pauta e erros comuns',
    seoTitle: 'Reunião one on one (1:1): como fazer e pauta pronta',
    description:
      'O que é uma reunião one on one, com que frequência fazer, uma pauta simples para usar amanhã e os erros que transformam a 1:1 em reunião de status.',
    intro:
      'A reunião 1:1 é o encontro mais importante da agenda de um líder. É onde você entende como a pessoa está, remove bloqueios e acompanha o desenvolvimento dela. Também é a primeira reunião a ser cancelada quando a semana aperta. Este guia ajuda a mudar isso.',
    readingMinutes: 7,
    sections: [
      {
        id: 'o-que-e',
        title: 'O que é uma reunião one on one',
        paragraphs: [
          'É uma conversa recorrente entre líder e liderado, com tempo reservado e pauta da pessoa liderada. Não é reunião de status de projeto. O foco é a pessoa: prioridades, dificuldades, carreira, relação com o time e feedback nos dois sentidos.',
        ],
      },
      {
        id: 'frequencia',
        title: 'Frequência e duração',
        bullets: [
          'Semanal ou quinzenal funciona para a maioria dos times.',
          '30 minutos é um bom padrão. Pessoas novas no time costumam precisar de mais.',
          'Mantenha o horário fixo. Remarcar é melhor que cancelar.',
        ],
      },
      {
        id: 'pauta',
        title: 'Uma pauta simples para usar amanhã',
        examples: [
          { label: '1. Como você está?', text: 'Abra espaço para o que estiver pesando, dentro ou fora do trabalho.' },
          { label: '2. Prioridades', text: 'O que é mais importante nas próximas duas semanas? Algo travado?' },
          { label: '3. Feedback', text: 'Um feedback seu para a pessoa e um pedido de feedback para você.' },
          { label: '4. Desenvolvimento', text: 'Como está o plano de desenvolvimento? Que oportunidade cabe agora?' },
          { label: '5. Combinados', text: 'O que cada um vai fazer até a próxima 1:1.' },
        ],
      },
      {
        id: 'erros',
        title: 'Erros comuns',
        bullets: [
          'Transformar a 1:1 em atualização de projeto.',
          'Falar mais do que ouvir.',
          'Não anotar nada e esquecer o que foi combinado.',
          'Cancelar sempre que surge algo "mais urgente".',
          'Deixar feedback difícil acumular para a avaliação.',
        ],
      },
      {
        id: 'registro',
        title: 'Por que registrar cada 1:1',
        paragraphs: [
          'As anotações das 1:1s são a matéria-prima da avaliação de desempenho e do PDI. Quem registra chega na avaliação com fatos. Quem não registra escreve de memória. A Rhitmo prepara a pauta antes de cada conversa e transforma as notas, inclusive as de note takers como Granola, Fireflies, tl;dv e Fathom, em evidências organizadas por pessoa.',
        ],
      },
    ],
    faq: [
      { q: 'Quem define a pauta da 1:1?', a: 'Idealmente a pessoa liderada traz os temas. O líder complementa com feedback e acompanhamento de desenvolvimento.' },
      { q: 'Posso fazer 1:1 por vídeo?', a: 'Sim. O que importa é a regularidade, o tempo protegido e a atenção total durante a conversa.' },
      { q: 'O que anotar numa reunião one on one?', a: 'Temas discutidos, bloqueios, feedbacks dados e recebidos, e os combinados com responsável e prazo.' },
    ],
  },
  {
    slug: 'pdi-plano-de-desenvolvimento-individual',
    source: 'guia-pdi',
    eyebrow: 'Guia para líderes e RH',
    title: 'PDI na prática: como montar um plano de desenvolvimento que sai do papel',
    seoTitle: 'PDI: como fazer um plano de desenvolvimento individual',
    description:
      'Como montar um PDI (plano de desenvolvimento individual) com objetivos claros, ações concretas e acompanhamento, e por que a maioria dos PDIs fica esquecida na gaveta.',
    intro:
      'Quase toda empresa pede PDI. Poucos PDIs são lembrados três meses depois. A diferença não está no modelo do documento, e sim em três coisas: objetivo claro, ações pequenas e acompanhamento nas 1:1s.',
    readingMinutes: 7,
    sections: [
      {
        id: 'o-que-e',
        title: 'O que é um PDI',
        paragraphs: [
          'O Plano de Desenvolvimento Individual é um acordo entre a pessoa e o líder sobre o que ela quer desenvolver, por que isso importa e como vai acontecer. Ele pertence à pessoa: o líder apoia, mas não escreve por ela.',
        ],
      },
      {
        id: 'passos',
        title: 'Como montar em 4 passos',
        examples: [
          { label: '1. Ponto de partida', text: 'Use a avaliação de desempenho e os feedbacks recentes para escolher de 1 a 3 focos. Mais que isso dilui o esforço.' },
          { label: '2. Objetivo', text: 'Descreva o comportamento esperado ao fim do período. Ex.: "conduzir sozinho a priorização do trimestre com o time de produto".' },
          { label: '3. Ações', text: 'Prefira prática no trabalho (projetos, responsabilidades novas) a cursos isolados. Inclua quem pode apoiar.' },
          { label: '4. Acompanhamento', text: 'Defina como e quando o progresso será revisto. A resposta quase sempre é: em toda 1:1, por alguns minutos.' },
        ],
      },
      {
        id: 'por-que-falha',
        title: 'Por que a maioria dos PDIs fica na gaveta',
        bullets: [
          'Focos demais e genéricos ("melhorar comunicação").',
          'Ações que dependem só de curso, sem prática.',
          'Ninguém revisita o plano entre um ciclo e outro.',
          'O PDI é escrito pelo líder, não pela pessoa.',
        ],
      },
      {
        id: 'acompanhar',
        title: 'Como manter o PDI vivo',
        paragraphs: [
          'Coloque o PDI como item fixo da pauta de 1:1 e registre cada avanço como evidência. No fim do ciclo, essas evidências mostram a evolução real e alimentam a próxima avaliação. Na Rhitmo, o PDI é da pessoa liderada, e o progresso aparece junto das anotações e evidências de cada conversa.',
        ],
      },
    ],
    faq: [
      { q: 'Quem deve escrever o PDI?', a: 'A pessoa liderada, com apoio do líder. Quando o plano é escrito por ela, o compromisso é maior.' },
      { q: 'Quantos objetivos um PDI deve ter?', a: 'Entre um e três. Poucos focos bem acompanhados geram mais evolução que uma lista longa.' },
      { q: 'Com que frequência revisar o PDI?', a: 'Brevemente em toda 1:1 e de forma mais completa a cada ciclo de avaliação.' },
    ],
  },
];

export const guideBySlug = (slug?: string) => GUIDES.find((g) => g.slug === slug);
