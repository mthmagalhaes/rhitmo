export interface SelfReviewQuestion {
  id: string;
  question: string;
  placeholder?: string;
}

export const SELF_REVIEW_QUESTIONS: SelfReviewQuestion[] = [
  {
    id: 'achievements',
    question: 'Quais foram as suas maiores entregas e conquistas neste ciclo?',
    placeholder: 'Pense em projetos, resultados, marcos importantes...',
  },
  {
    id: 'improvements',
    question: 'Onde você sente que poderia ter tido um desempenho melhor?',
    placeholder: 'Seja honesto consigo mesmo. Este é um espaço seguro.',
  },
  {
    id: 'support_needed',
    question: 'Quais recursos ou apoios você precisa do seu líder para o próximo ciclo?',
    placeholder: 'Treinamentos, mentoria, ferramentas, mudanças de processo...',
  },
];
