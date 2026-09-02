// Contrato único de note taker pessoal (BYOK).
//
// Cada provedor (Granola, Fireflies, ...) implementa esta interface e é
// registrado em `index.ts`. O sincronizador (`noteTakerSync.ts`) e a edge
// function `note-taker-connect` só conhecem este contrato.

/**
 * Fidelidade da matéria-prima que o provedor entrega.
 * - `transcript`: fala literal, citável palavra por palavra.
 * - `summary`: resumo produzido pelo provedor; a citação precisa deixar claro
 *   que é interpretação, não fala literal.
 */
export type NoteFidelity = "transcript" | "summary";

export interface NoteAttendee {
  name: string | null;
  email: string | null;
}

/** Item de listagem: barato de buscar, usado para deduplicar. */
export interface NoteRef {
  id: string;
  title: string | null;
  createdAt: string | null;
}

/** Nota completa, já normalizada para virar evidência. */
export interface FullNote extends NoteRef {
  content: string;
  fidelity: NoteFidelity;
  attendees: NoteAttendee[];
}

export interface ListPage {
  notes: NoteRef[];
  hasMore: boolean;
  cursor: string | null;
}

export interface ListOptions {
  createdAfter?: string | null;
  cursor?: string | null;
  limit?: number;
}

export type VerifyResult = { ok: true } | { ok: false; message: string };

export interface NoteTakerProvider {
  /** Identificador persistido em `leader_note_taker_connections.provider`. */
  id: string;
  /** Nome exibido ao usuário. */
  label: string;
  /** Fidelidade típica do provedor (usada quando a nota não diz outra coisa). */
  defaultFidelity: NoteFidelity;
  verifyKey(apiKey: string): Promise<VerifyResult>;
  listNotes(apiKey: string, opts: ListOptions): Promise<ListPage>;
  getNote(apiKey: string, noteId: string): Promise<FullNote | null>;
}

/** Converte qualquer data legível para ISO 8601; null quando inválida. */
export function toIsoOrNull(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const ms = typeof value === "number" ? value : Date.parse(String(value));
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

export function dedupeAttendees(raw: Array<NoteAttendee | null | undefined>): NoteAttendee[] {
  const seen = new Set<string>();
  const out: NoteAttendee[] = [];
  for (const p of raw) {
    const key = (p?.email ?? p?.name ?? "").toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name: p?.name ?? null, email: p?.email ?? null });
  }
  return out;
}
