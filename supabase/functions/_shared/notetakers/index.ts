// Registro de provedores de note taker pessoal (BYOK).
//
// Otter não entra aqui de propósito: não existe API pública documentada para
// leitura de notas. Para Otter (e qualquer outro), o caminho é o Magic Paste.

import { granolaProvider } from "./granola.ts";
import { firefliesProvider } from "./fireflies.ts";
import type { NoteTakerProvider } from "./types.ts";

export const NOTE_TAKER_PROVIDERS = {
  granola: granolaProvider,
  fireflies: firefliesProvider,
} as const satisfies Record<string, NoteTakerProvider>;

export type NoteTakerProviderId = keyof typeof NOTE_TAKER_PROVIDERS;

export const NOTE_TAKER_PROVIDER_IDS = Object.keys(
  NOTE_TAKER_PROVIDERS,
) as [NoteTakerProviderId, ...NoteTakerProviderId[]];

export function getProvider(id: string): NoteTakerProvider | null {
  return (NOTE_TAKER_PROVIDERS as Record<string, NoteTakerProvider>)[id] ?? null;
}

export * from "./types.ts";
