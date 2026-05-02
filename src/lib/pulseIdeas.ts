// Sprint 13.x — Catálogo de "Ideias" pré-prontas para o Passo 1 do Pulse Wizard.
// Cada ideia preenche motivação + tópicos do guia de discussão (Passo 2).
//
// Inspirado nas chips da tela do Windmill: Repetitive tasks, All Hands feedback,
// Missing tools, AI usage, Improvement opportunities, Offsite feedback,
// Workplace feedback, Office needs, Pain point survey, Weekly blockers, Priorities.

export interface PulseIdea {
  key: string;
  label: string;
  motivation: string;
  topics: string[];
}

export const PULSE_IDEAS: PulseIdea[] = [
  {
    key: 'repetitive_tasks',
    label: 'Tarefas repetitivas',
    motivation:
      'Quero entender quais tarefas repetitivas consomem o tempo do meu time e onde podemos automatizar ou simplificar.',
    topics: [
      'Quais tarefas repetitivas consomem mais do seu tempo?',
      'Quais delas você acha que poderiam ser automatizadas ou simplificadas?',
    ],
  },
  {
    key: 'all_hands_feedback',
    label: 'Feedback do All Hands',
    motivation:
      'Quero coletar percepções honestas do time sobre o último All Hands para melhorar formato e clareza.',
    topics: [
      'O que ficou claro pra você no último All Hands?',
      'O que ainda gerou dúvidas ou ficou confuso?',
      'O que você gostaria de ver no próximo?',
    ],
  },
  {
    key: 'missing_tools',
    label: 'Ferramentas que faltam',
    motivation:
      'Quero descobrir quais ferramentas estão faltando ou atrapalhando a produtividade do time.',
    topics: [
      'Que ferramenta você acha que está faltando hoje?',
      'Alguma ferramenta atual está atrapalhando mais do que ajudando?',
    ],
  },
  {
    key: 'ai_usage',
    label: 'Uso de IA',
    motivation:
      'Quero mapear como o time está usando IA no dia a dia e onde podemos acelerar a adoção.',
    topics: [
      'Em quais tarefas você já usa IA hoje?',
      'Em quais tarefas você ainda não usa, mas gostaria de testar?',
      'Algum bloqueio te impede de usar mais IA?',
    ],
  },
  {
    key: 'improvement_opportunities',
    label: 'Oportunidades de melhoria',
    motivation:
      'Quero identificar oportunidades concretas de melhoria nos nossos processos e rotinas.',
    topics: [
      'O que poderíamos melhorar no nosso processo atual?',
      'O que está funcionando bem e devemos preservar?',
    ],
  },
  {
    key: 'offsite_feedback',
    label: 'Feedback do Offsite',
    motivation:
      'Quero coletar feedback estruturado sobre o último offsite para evoluir os próximos.',
    topics: [
      'O que mais funcionou no offsite?',
      'O que poderia ter sido melhor?',
      'O que você gostaria de fazer no próximo?',
    ],
  },
  {
    key: 'workplace_feedback',
    label: 'Ambiente de trabalho',
    motivation:
      'Quero entender como está o ambiente de trabalho e quais ajustes melhorariam o dia a dia.',
    topics: [
      'Como você descreveria o clima do time hoje?',
      'O que poderia melhorar no ambiente de trabalho?',
    ],
  },
  {
    key: 'office_needs',
    label: 'Necessidades do escritório',
    motivation:
      'Quero mapear necessidades práticas do escritório (estrutura, equipamentos, espaços).',
    topics: [
      'Falta algum equipamento ou recurso no escritório?',
      'Algum espaço precisa de ajuste pra funcionar melhor?',
    ],
  },
  {
    key: 'pain_point_survey',
    label: 'Pesquisa de dores',
    motivation:
      'Quero levantar as principais dores do time pra priorizar resolução.',
    topics: [
      'Qual é a maior dor que você sente no seu dia a dia hoje?',
      'Qual seria o impacto de resolver essa dor?',
    ],
  },
  {
    key: 'weekly_blockers',
    label: 'Bloqueios da semana',
    motivation:
      'Quero entender o que está bloqueando o time esta semana pra destravar rapidamente.',
    topics: [
      'O que está te bloqueando esta semana?',
      'Como eu posso te ajudar a destravar isso?',
    ],
  },
  {
    key: 'priorities',
    label: 'Prioridades',
    motivation:
      'Quero alinhar foco e despriorizações pra próxima semana.',
    topics: [
      'Quais são suas 3 prioridades para a próxima semana?',
      'Há algo que devamos pausar ou despriorizar?',
    ],
  },
];

export function findPulseIdea(key: string): PulseIdea | undefined {
  return PULSE_IDEAS.find((i) => i.key === key);
}
