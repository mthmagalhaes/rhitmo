// Sprint 10.4 — Perguntas estáticas para Upwards Review (liderado avalia o líder).
export interface UpwardsReviewQuestion {
  id: string;
  question: string;
  placeholder?: string;
}

export const UPWARDS_REVIEW_QUESTIONS: UpwardsReviewQuestion[] = [
  {
    id: 'helps',
    question: 'O que o seu líder faz que te ajuda a trabalhar melhor?',
    placeholder: 'Comportamentos, decisões ou apoios concretos que fazem diferença...',
  },
  {
    id: 'could_improve',
    question: 'O que o seu líder poderia fazer de diferente para te apoiar mais?',
    placeholder: 'Seja específico e construtivo. O que destravaria você?',
  },
  {
    id: 'communication_clarity',
    question: 'Como você avalia a comunicação e a clareza dos objetivos passados a você?',
    placeholder: 'Você sabe o que se espera de você? As prioridades estão claras?',
  },
];
