import { TeamMember, Feedback } from '@/types/team';

export const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Ana Silva',
    role: 'Desenvolvedora Sênior',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
    lastFeedback: '2025-11-20',
    feedbackCount: 12,
    performanceScore: 92
  },
  {
    id: '2',
    name: 'Carlos Santos',
    role: 'Designer UX',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
    lastFeedback: '2025-11-18',
    feedbackCount: 8,
    performanceScore: 88
  },
  {
    id: '3',
    name: 'Mariana Costa',
    role: 'Product Manager',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mariana',
    lastFeedback: '2025-11-25',
    feedbackCount: 15,
    performanceScore: 95
  },
  {
    id: '4',
    name: 'Roberto Lima',
    role: 'Engenheiro Backend',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto',
    lastFeedback: '2025-11-15',
    feedbackCount: 10,
    performanceScore: 85
  }
];

export const mockFeedbacks: Record<string, Feedback[]> = {
  '1': [
    {
      id: 'f1',
      date: '2025-11-20',
      content: 'Excelente trabalho na implementação da nova feature de autenticação. Demonstrou proatividade e atenção aos detalhes de segurança.',
      type: 'positive'
    },
    {
      id: 'f2',
      date: '2025-11-10',
      content: 'Reunião 1:1 - Discutimos metas do Q4 e plano de carreira. Ana expressou interesse em mentorar desenvolvedores júnior.',
      type: 'neutral'
    },
    {
      id: 'f3',
      date: '2025-10-28',
      content: 'Sugestão de melhoria: comunicar mais cedo quando encontrar blockers. Isso ajudará a equipe a reagir mais rapidamente.',
      type: 'constructive'
    }
  ],
  '2': [
    {
      id: 'f4',
      date: '2025-11-18',
      content: 'Apresentação do novo design system foi muito bem recebida pelo time. Interface ficou mais intuitiva e acessível.',
      type: 'positive'
    },
    {
      id: 'f5',
      date: '2025-11-05',
      content: 'Feedback da sprint review - ótima colaboração com desenvolvimento na implementação dos componentes.',
      type: 'positive'
    }
  ],
  '3': [
    {
      id: 'f6',
      date: '2025-11-25',
      content: 'Reunião de planejamento - Mariana liderou excelente sessão de priorização de backlog com stakeholders.',
      type: 'positive'
    },
    {
      id: 'f7',
      date: '2025-11-12',
      content: 'Check-in semanal - Discutimos roadmap do produto e dependências entre equipes. Boa visão estratégica.',
      type: 'neutral'
    }
  ],
  '4': [
    {
      id: 'f8',
      date: '2025-11-15',
      content: 'Implementação da API de pagamentos concluída com sucesso. Código bem estruturado e com boa cobertura de testes.',
      type: 'positive'
    },
    {
      id: 'f9',
      date: '2025-10-30',
      content: 'Oportunidade de desenvolvimento: participar mais ativamente das discussões de arquitetura.',
      type: 'constructive'
    }
  ]
};
