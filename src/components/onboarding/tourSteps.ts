// Roteiros dos tours guiados. A mecânica vive em `useGuidedTour`;
// aqui ficam apenas os passos (rota + âncora + texto), para que
// líder e RH compartilhem exatamente o mesmo motor e o mesmo visual.

export interface TourStepDef {
  /** Rota para onde navegar antes de mostrar o passo. Omitir = ficar onde está. */
  route?: string;
  /** Seletor CSS do elemento destacado. */
  anchor: string;
  title: string;
  description: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export type TourVariant = 'leader' | 'hr';

export const LEADER_TOUR_STEPS: TourStepDef[] = [
  {
    anchor: '[data-tour="sidebar"]',
    title: 'Bem-vindo à Rhitmo',
    description:
      'Em 60 segundos eu mostro o caminho. Aqui na lateral ficam suas áreas: 1:1s, Anotações & Evidências, Pessoas e Avaliações.',
    side: 'right',
    align: 'start',
  },
  {
    route: '/lider/inicio',
    anchor: '[data-tour="notetaker-card"]',
    title: 'Comece conectando seu note taker',
    description:
      'Granola ou Fireflies. Suas notas de reunião chegam sozinhas e viram evidência, sem outro bot entrando na chamada.',
    side: 'bottom',
    align: 'start',
  },
  {
    route: '/lider/diario',
    anchor: '[data-tour="member-list"]',
    title: 'Anotações & Evidências',
    description:
      'Cada liderado tem um espaço privado. Cole uma transcrição e a Rhitmo extrai feedback, ações e padrões.',
    side: 'right',
    align: 'start',
  },
  {
    route: '/lider/inicio',
    anchor: '[data-tour="upcoming-1on1s"]',
    title: '1:1s com pauta pronta',
    description:
      'Antes da conversa, peça um rascunho de pauta. Ele nasce do que mudou desde a última 1:1.',
    side: 'top',
    align: 'start',
  },
  {
    route: '/lider/inicio',
    anchor: '[data-tour="mentor-entry"]',
    title: 'Pergunte à Rhitmo',
    description:
      'Pergunte sobre uma pessoa e receba a resposta com a origem citada. Nada de opinião solta: tudo apoiado no que foi registrado.',
    side: 'top',
    align: 'center',
  },
  {
    route: '/lider/avaliacoes',
    anchor: '[data-tour="reviews-list"]',
    title: 'Avaliações e calibração',
    description:
      'A avaliação já chega escrita a partir das evidências do trimestre, e a calibração compara critérios entre líderes.',
    side: 'right',
    align: 'start',
  },
];

export const HR_TOUR_STEPS: TourStepDef[] = [
  {
    route: '/hr',
    anchor: '[data-tour="hr-overview"]',
    title: 'Sua visão da empresa',
    description:
      'Cobertura, risco e pontos de atenção. É o retrato de como a liderança está acompanhando as pessoas.',
    side: 'bottom',
    align: 'start',
  },
  {
    route: '/hr/pessoas',
    anchor: '[data-tour="hr-people"]',
    title: 'Pessoas',
    description:
      'Quem está com ritmo em dia e quem ficou para trás, sem expor o conteúdo das conversas.',
    side: 'bottom',
    align: 'start',
  },
  {
    route: '/hr/ritmo',
    anchor: '[data-tour="hr-ritmo"]',
    title: 'Ritmo por líder',
    description:
      'Cadência real das 1:1s por líder. Você vê frequência e cobertura, nunca o que foi conversado.',
    side: 'bottom',
    align: 'start',
  },
  {
    route: '/hr/rede',
    anchor: '[data-tour="hr-network"]',
    title: 'Rede de colaboração',
    description:
      'Mapa de quem trabalha com quem, só pela intensidade da interação. Serve para achar gargalos e pessoas sobrecarregadas.',
    side: 'bottom',
    align: 'start',
  },
  {
    route: '/hr/governanca',
    anchor: '[data-tour="hr-governance"]',
    title: 'Governança',
    description:
      'Registro de acessos, prazo de guarda das transcrições, exportação e exclusão. É o que a área de segurança vai pedir.',
    side: 'bottom',
    align: 'start',
  },
  {
    route: '/hr',
    anchor: '[data-tour="hr-overview"]',
    title: 'Próximo passo: chame seus líderes',
    description:
      'A Rhitmo só ganha vida com os líderes registrando. Convide-os e acompanhe a adoção por aqui.',
    side: 'bottom',
    align: 'start',
  },
];

export function stepsFor(variant: TourVariant): TourStepDef[] {
  return variant === 'hr' ? HR_TOUR_STEPS : LEADER_TOUR_STEPS;
}
