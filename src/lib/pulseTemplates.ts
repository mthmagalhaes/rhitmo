// Sprint 9.2 — Catálogo estático de templates de Pulse Survey.
// Cada tipo (`pulse_surveys.type`) mapeia para um conjunto de perguntas com `id` estável.
// O `id` é persistido em `pulse_surveys.questions[].id` e referenciado em
// `pulse_surveys.responses[].question_id`, permitindo evolução do texto sem perder histórico.

export type PulseType = 'blockers' | 'priorities' | 'retro' | 'goal_progress';

export interface PulseQuestion {
  id: string;
  text: string;
  placeholder?: string;
}

export interface PulseTemplate {
  type: PulseType;
  label: string;
  description: string;
  questions: PulseQuestion[];
}

export const PULSE_TEMPLATES: Record<PulseType, PulseTemplate> = {
  blockers: {
    type: 'blockers',
    label: 'Bloqueios',
    description: 'Identifique o que está impedindo o avanço do trabalho.',
    questions: [
      {
        id: 'q1',
        text: 'O que está bloqueando o seu trabalho hoje?',
        placeholder: 'Pode ser técnico, organizacional, dependências de outras pessoas...',
      },
      {
        id: 'q2',
        text: 'Como eu (líder) posso ajudar a destravar isso?',
        placeholder: 'Conexões, decisões, recursos, presença em reuniões...',
      },
    ],
  },
  priorities: {
    type: 'priorities',
    label: 'Prioridades da Semana',
    description: 'Alinhe foco e despriorizações para a semana.',
    questions: [
      {
        id: 'q1',
        text: 'Quais são as suas 3 prioridades para esta semana?',
        placeholder: '1) ...\n2) ...\n3) ...',
      },
      {
        id: 'q2',
        text: 'Há algo que devamos despriorizar ou pausar?',
        placeholder: 'Tarefas que perderam relevância ou estão drenando tempo...',
      },
    ],
  },
  retro: {
    type: 'retro',
    label: 'Retrospectiva',
    description: 'Reflita sobre o ciclo recente.',
    questions: [
      { id: 'q1', text: 'O que funcionou bem no último período?' },
      { id: 'q2', text: 'O que não funcionou?' },
      { id: 'q3', text: 'O que queremos mudar a partir de agora?' },
    ],
  },
  goal_progress: {
    type: 'goal_progress',
    label: 'Progresso de Metas',
    description: 'Status atualizado das metas em andamento.',
    questions: [
      {
        id: 'q1',
        text: 'Como está o progresso da sua meta principal?',
        placeholder: 'Onde você está em relação ao objetivo, em sua percepção...',
      },
      {
        id: 'q2',
        text: 'Algum risco ou apoio necessário para chegar lá?',
        placeholder: 'Riscos, dependências, decisões que precisam ser tomadas...',
      },
    ],
  },
};

export const PULSE_TYPE_ORDER: PulseType[] = ['blockers', 'priorities', 'retro', 'goal_progress'];
