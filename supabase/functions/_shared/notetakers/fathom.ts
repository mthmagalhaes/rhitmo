// Fathom — API key pessoal (Fathom > Settings > API Access).
// API REST em https://api.fathom.ai/external/v1 com header `X-Api-Key`.

import {
  dedupeAttendees,
  toIsoOrNull,
  type FullNote,
  type NoteTakerProvider,
} from "./types.ts";

const BASE = "https://api.fathom.ai/external/v1";

async function call<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Api-Key": apiKey, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}] ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

interface FathomMeeting {
  recording_id: number | string;
  title?: string | null;
  meeting_title?: string | null;
  created_at?: string | null;
  scheduled_start_time?: string | null;
  calendar_invitees?: Array<{ name?: string | null; email?: string | null }> | null;
}
interface FathomList { items: FathomMeeting[]; next_cursor?: string | null }
interface FathomTranscript {
  transcript?: Array<{ speaker?: { display_name?: string | null } | null; text?: string | null }> | null;
}
interface FathomSummary { summary?: { markdown_formatted?: string | null } | null }

export const fathomProvider: NoteTakerProvider = {
  id: "fathom",
  label: "Fathom",
  defaultFidelity: "transcript",

  async verifyKey(apiKey) {
    try {
      await call<FathomList>(apiKey, "/meetings");
      return { ok: true };
    } catch (e) {
      const msg = (e as Error).message;
      if (/\[(401|403)\]/.test(msg)) {
        return { ok: false, message: "Chave rejeitada pelo Fathom. Gere uma nova em Settings > API Access." };
      }
      return { ok: false, message: `Fathom respondeu: ${msg.slice(0, 200)}` };
    }
  },

  async listNotes(apiKey, opts) {
    const qs = new URLSearchParams();
    if (opts.createdAfter) qs.set("created_after", opts.createdAfter);
    if (opts.cursor) qs.set("cursor", opts.cursor);
    const data = await call<FathomList>(apiKey, `/meetings?${qs}`);
    const notes = (data.items ?? []).map((m) => ({
      id: String(m.recording_id),
      title: m.meeting_title ?? m.title ?? null,
      createdAt: toIsoOrNull(m.scheduled_start_time ?? m.created_at),
    }));
    const cursor = data.next_cursor ?? null;
    return { notes, hasMore: !!cursor, cursor };
  },

  async getNote(apiKey, noteId) {
    const id = encodeURIComponent(noteId);
    const [t, s] = await Promise.all([
      call<FathomTranscript>(apiKey, `/recordings/${id}/transcript`).catch(() => null),
      call<FathomSummary>(apiKey, `/recordings/${id}/summary`).catch(() => null),
    ]);
    const lines = (t?.transcript ?? [])
      .map((x) => {
        const text = (x.text ?? "").trim();
        if (!text) return null;
        const who = (x.speaker?.display_name ?? "").trim();
        return who ? `${who}: ${text}` : text;
      })
      .filter((x): x is string => !!x);
    const summary = s?.summary?.markdown_formatted?.trim() ?? "";
    if (!summary && lines.length === 0) return null;

    // Metadados (título, data, convidados) vêm da listagem filtrada pelo id.
    let meta: FathomMeeting | null = null;
    try {
      const list = await call<FathomList>(apiKey, `/meetings?include_transcript=false`);
      meta = (list.items ?? []).find((m) => String(m.recording_id) === String(noteId)) ?? null;
    } catch { /* metadados opcionais */ }

    const parts: string[] = [];
    if (summary) parts.push(summary);
    if (lines.length) parts.push(`\n---\n\n**Transcrição**\n\n${lines.join("\n")}`);
    return {
      id: String(noteId),
      title: meta?.meeting_title ?? meta?.title ?? null,
      createdAt: toIsoOrNull(meta?.scheduled_start_time ?? meta?.created_at ?? null),
      content: parts.join("\n").trim(),
      fidelity: lines.length ? "transcript" : "summary",
      attendees: dedupeAttendees((meta?.calendar_invitees ?? []).map((p) => ({ name: p.name ?? null, email: p.email ?? null }))),
    } satisfies FullNote;
  },
};
