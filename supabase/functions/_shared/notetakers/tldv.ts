// tl;dv — API key pessoal (tl;dv > Settings > Personal Settings > API Keys).
// API REST em https://pasta.tldv.io/v1alpha1 com header `x-api-key`.
// Requer plano pago do tl;dv (Pro/Business) para gerar a chave.

import {
  dedupeAttendees,
  toIsoOrNull,
  type FullNote,
  type NoteTakerProvider,
} from "./types.ts";

const BASE = "https://pasta.tldv.io/v1alpha1";

async function call<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-api-key": apiKey, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}] ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

interface TldvPerson { name?: string | null; email?: string | null }
interface TldvMeeting {
  id: string;
  name?: string | null;
  happenedAt?: string | null;
  invitees?: TldvPerson[] | null;
  organizer?: TldvPerson | null;
}
interface TldvList { page: number; pages: number; results: TldvMeeting[] }
interface TldvTranscript { data?: Array<{ speaker?: string | null; text?: string | null }> | null }

export const tldvProvider: NoteTakerProvider = {
  id: "tldv",
  label: "tl;dv",
  defaultFidelity: "transcript",

  async verifyKey(apiKey) {
    try {
      await call<TldvList>(apiKey, "/meetings?page=1&limit=1");
      return { ok: true };
    } catch (e) {
      const msg = (e as Error).message;
      if (/\[(401|403)\]/.test(msg)) {
        return {
          ok: false,
          message: "Chave rejeitada pelo tl;dv. Confira a API key em Settings > API Keys (exige plano pago do tl;dv).",
        };
      }
      return { ok: false, message: `tl;dv respondeu: ${msg.slice(0, 200)}` };
    }
  },

  async listNotes(apiKey, opts) {
    const limit = Math.min(opts.limit ?? 20, 50);
    const page = Number(opts.cursor ?? 1) || 1;
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (opts.createdAfter) qs.set("from", opts.createdAfter);
    const data = await call<TldvList>(apiKey, `/meetings?${qs}`);
    const notes = (data.results ?? []).map((m) => ({
      id: String(m.id),
      title: m.name ?? null,
      createdAt: toIsoOrNull(m.happenedAt),
    }));
    const hasMore = page < (data.pages ?? 1);
    return { notes, hasMore, cursor: hasMore ? String(page + 1) : null };
  },

  async getNote(apiKey, noteId) {
    const id = encodeURIComponent(noteId);
    const meeting = await call<TldvMeeting>(apiKey, `/meetings/${id}`).catch(() => null);
    if (!meeting) return null;
    let lines: string[] = [];
    try {
      const t = await call<TldvTranscript>(apiKey, `/meetings/${id}/transcript`);
      lines = (t.data ?? [])
        .map((s) => {
          const text = (s.text ?? "").trim();
          if (!text) return null;
          const who = (s.speaker ?? "").trim();
          return who ? `${who}: ${text}` : text;
        })
        .filter((s): s is string => !!s);
    } catch {
      // Transcrição ainda processando: a nota volta na próxima rodada.
    }
    if (lines.length === 0) return null;
    return {
      id: String(meeting.id),
      title: meeting.name ?? null,
      createdAt: toIsoOrNull(meeting.happenedAt),
      content: `**Transcrição**\n\n${lines.join("\n")}`,
      fidelity: "transcript",
      attendees: dedupeAttendees([...(meeting.invitees ?? []), meeting.organizer ?? null].map((p) =>
        p ? { name: p.name ?? null, email: p.email ?? null } : null
      )),
    } satisfies FullNote;
  },
};
