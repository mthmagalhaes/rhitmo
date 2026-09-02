// Granola — Personal API key (Granola > Settings > Connectors > API).
// Adaptador sobre o cliente já existente em `../granolaClient.ts`.

import {
  getGranolaNote,
  listGranolaNotes,
  noteToContent,
  verifyGranolaKey,
  type GranolaNote,
} from "../granolaClient.ts";
import {
  dedupeAttendees,
  toIsoOrNull,
  type FullNote,
  type NoteTakerProvider,
} from "./types.ts";

function toFullNote(note: GranolaNote): FullNote {
  return {
    id: String(note.id),
    title: note.title ?? null,
    createdAt: toIsoOrNull(note.created_at),
    content: noteToContent(note),
    fidelity: note.transcript ? "transcript" : "summary",
    attendees: dedupeAttendees([...(note.people ?? []), ...(note.attendees ?? [])]),
  };
}

export const granolaProvider: NoteTakerProvider = {
  id: "granola",
  label: "Granola",
  defaultFidelity: "summary",

  async verifyKey(apiKey) {
    const res = await verifyGranolaKey(apiKey);
    return res.ok ? { ok: true } : { ok: false, message: res.message };
  },

  async listNotes(apiKey, opts) {
    const page = await listGranolaNotes(apiKey, {
      createdAfter: opts.createdAfter ?? null,
      cursor: opts.cursor ?? null,
      limit: opts.limit ?? 20,
    });
    return {
      notes: page.notes.map((n) => ({
        id: String(n.id),
        title: n.title ?? null,
        createdAt: toIsoOrNull(n.created_at),
      })),
      hasMore: page.hasMore,
      cursor: page.cursor,
    };
  },

  async getNote(apiKey, noteId) {
    const note = await getGranolaNote(apiKey, noteId);
    return note ? toFullNote(note) : null;
  },
};
