// Catálogo de note takers pessoais (BYOK) suportados pela Rhitmo.
// Espelha `supabase/functions/_shared/notetakers/index.ts`.

export type NoteTakerProviderId = 'granola' | 'fireflies';

export interface NoteTakerProviderMeta {
  id: NoteTakerProviderId;
  label: string;
  /** O que o líder ganha ao conectar. */
  description: string;
  /** Fidelidade típica da matéria-prima entregue pelo provedor. */
  fidelity: 'transcript' | 'summary';
  keyPlaceholder: string;
  /** Passo a passo para achar a chave pessoal. */
  steps: string[];
}

export const NOTE_TAKER_PROVIDERS: NoteTakerProviderMeta[] = [
  {
    id: 'granola',
    label: 'Granola',
    description:
      'Importe as notas do seu Granola direto para Anotações & Evidências, sem precisar do bot na reunião.',
    fidelity: 'summary',
    keyPlaceholder: 'Personal API key do Granola',
    steps: [
      'No app do Granola, abra Settings → Connectors.',
      'Na seção API, escolha Personal API keys e gere uma chave nova.',
      'Cole a chave abaixo. Ela fica criptografada e nunca é exibida de novo.',
    ],
  },
  {
    id: 'fireflies',
    label: 'Fireflies.ai',
    description:
      'Traga as transcrições completas do Fireflies e vire evidência citável nas suas avaliações.',
    fidelity: 'transcript',
    keyPlaceholder: 'API key do Fireflies',
    steps: [
      'No Fireflies, abra Settings → Developer Settings.',
      'Copie a sua API key pessoal (ou gere uma nova).',
      'Cole a chave abaixo. Ela fica criptografada e nunca é exibida de novo.',
    ],
  },
];

export function noteTakerProvider(id: NoteTakerProviderId): NoteTakerProviderMeta {
  return NOTE_TAKER_PROVIDERS.find((p) => p.id === id) ?? NOTE_TAKER_PROVIDERS[0];
}

export const FIDELITY_LABEL: Record<'transcript' | 'summary', string> = {
  transcript: 'Fala literal',
  summary: 'Resumo do provedor',
};
