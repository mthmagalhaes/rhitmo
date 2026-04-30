// Sprint 10.3 — Catálogo estático de perguntas de Peer Review.
// Mesmo padrão de pulseTemplates.ts e selfReviewQuestions.ts.
export interface PeerReviewQuestion {
  id: string;
  question: string;
  placeholder?: string;
}

export const PEER_REVIEW_QUESTIONS: PeerReviewQuestion[] = [
  {
    id: 'strengths',
    question: 'O que esta pessoa faz de melhor?',
    placeholder: 'Pontos fortes que se destacam no dia a dia...',
  },
  {
    id: 'improvement',
    question: 'Onde ela poderia melhorar?',
    placeholder: 'Áreas de oportunidade. Seja construtivo.',
  },
  {
    id: 'collab',
    question: 'Como é trabalhar com ela?',
    placeholder: 'Estilo de colaboração, comunicação, ritmo...',
  },
];
