// Catálogo único da Central de Conectores.
// Note takers BYOK espelham `noteTakerProviders.ts`; os demais são integrações
// próprias (Google Agenda, Slack) ou vitrine "Em breve" para medir demanda.

import type { NoteTakerProviderId } from '@/lib/noteTakerProviders';

export type ConnectorCategory = 'note_takers' | 'agenda' | 'comunicacao';
export type ConnectorKind = 'byok' | 'google_meet' | 'google_calendar' | 'slack' | 'coming_soon';

export interface ConnectorEntry {
  id: string;
  label: string;
  tagline: string;
  category: ConnectorCategory;
  kind: ConnectorKind;
  /** Só para kind = byok. */
  providerId?: NoteTakerProviderId;
  /** Selo extra opcional. */
  tag?: 'Novo' | 'Beta';
  /** Iniciais/monograma exibidos no logo. */
  mono: string;
  /** Não consome horas do bot de reunião. */
  savesBotHours?: boolean;
  note?: string;
}

export const CATEGORY_LABEL: Record<ConnectorCategory, string> = {
  note_takers: 'Note takers',
  agenda: 'Agenda e reuniões',
  comunicacao: 'Comunicação',
};

export const CONNECTORS: ConnectorEntry[] = [
  { id: 'granola', label: 'Granola', mono: 'G', category: 'note_takers', kind: 'byok', providerId: 'granola', savesBotHours: true,
    tagline: 'Notas e resumos do Granola viram evidência citável.' },
  { id: 'fireflies', label: 'Fireflies.ai', mono: 'Ff', category: 'note_takers', kind: 'byok', providerId: 'fireflies', savesBotHours: true,
    tagline: 'Transcrições completas do Fireflies, por falante.' },
  { id: 'tldv', label: 'tl;dv', mono: 'tl', category: 'note_takers', kind: 'byok', providerId: 'tldv', tag: 'Novo', savesBotHours: true,
    tagline: 'Transcrições do tl;dv direto em Anotações & Evidências.', note: 'Exige plano pago do tl;dv.' },
  { id: 'fathom', label: 'Fathom', mono: 'Fa', category: 'note_takers', kind: 'byok', providerId: 'fathom', tag: 'Novo', savesBotHours: true,
    tagline: 'Resumo e transcrição das reuniões gravadas pelo Fathom.' },
  { id: 'google_meet', label: 'Google Meet', mono: 'Me', category: 'note_takers', kind: 'google_meet', providerId: 'google_meet', tag: 'Beta', savesBotHours: true,
    tagline: 'As transcrições do próprio Meet viram evidência e são atribuídas ao liderado.',
    note: 'A transcrição precisa estar ativada na reunião (Google Workspace pago). Beta: liberado para contas de teste enquanto o Google revisa o acesso.' },
  { id: 'google_calendar', label: 'Google Agenda', mono: 'Ag', category: 'agenda', kind: 'google_calendar',
    tagline: 'Sincroniza suas 1:1s e prepara a pauta antes de cada conversa.' },
  { id: 'zoom', label: 'Zoom', mono: 'Zm', category: 'agenda', kind: 'coming_soon',
    tagline: 'Transcrições do Zoom AI Companion como evidência.' },
  { id: 'teams', label: 'Microsoft Teams', mono: 'Ms', category: 'agenda', kind: 'coming_soon',
    tagline: 'Transcrições do Teams e Copilot como evidência.' },
  { id: 'slack', label: 'Slack', mono: 'Sl', category: 'comunicacao', kind: 'slack',
    tagline: 'Briefs, lembretes e captura de feedback direto no Slack.' },
];
