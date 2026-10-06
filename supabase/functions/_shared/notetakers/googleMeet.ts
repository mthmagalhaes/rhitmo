// Google Meet — transcrições nativas do Meet via Meet REST API.
//
// Não é BYOK: a "chave" recebida aqui é o access token Google do líder,
// resolvido por `noteTakerCredential.ts` a partir de `google_calendar_tokens`
// (escopo `meetings.space.readonly`). Não lê o Drive.

import {
  dedupeAttendees,
  toIsoOrNull,
  type FullNote,
  type NoteTakerProvider,
} from "./types.ts";

const MEET = "https://meet.googleapis.com/v2";

async function meetGet<T>(token: string, path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${MEET}/${path}${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Meet [${res.status}]: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

interface ConferenceRecord { name: string; startTime?: string; endTime?: string }
interface Transcript { name: string; state?: string; startTime?: string }
interface Participant {
  name: string;
  signedinUser?: { displayName?: string };
  anonymousUser?: { displayName?: string };
  phoneUser?: { displayName?: string };
}
interface Entry { participant?: string; text?: string; startTime?: string }

function participantName(p: Participant): string | null {
  return p.signedinUser?.displayName ?? p.anonymousUser?.displayName ?? p.phoneUser?.displayName ?? null;
}

async function listAll<T>(token: string, path: string, key: string, maxPages = 20): Promise<T[]> {
  const out: T[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const params: Record<string, string> = { pageSize: "100" };
    if (pageToken) params.pageToken = pageToken;
    const page = await meetGet<Record<string, unknown>>(token, path, params);
    out.push(...((page[key] as T[] | undefined) ?? []));
    pageToken = page.nextPageToken as string | undefined;
    if (!pageToken) break;
  }
  return out;
}

function fmtTime(iso: string | undefined, base: string | undefined): string {
  if (!iso || !base) return "";
  const s = Math.max(0, Math.round((Date.parse(iso) - Date.parse(base)) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `[${mm}:${ss}] `;
}

export const googleMeetProvider: NoteTakerProvider = {
  id: "google_meet",
  label: "Google Meet",
  defaultFidelity: "transcript",

  async verifyKey(token) {
    try {
      await meetGet(token, "conferenceRecords", { pageSize: "1" });
      return { ok: true };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  },

  // Cada transcrição pronta vira uma "nota". id = nome do recurso do transcript.
  async listNotes(token, opts) {
    const since = opts.createdAfter ?? new Date(Date.now() - 14 * 86400_000).toISOString();
    const params: Record<string, string> = {
      pageSize: String(Math.min(opts.limit ?? 20, 50)),
      filter: `start_time>="${since}"`,
    };
    if (opts.cursor) params.pageToken = opts.cursor;
    const page = await meetGet<{ conferenceRecords?: ConferenceRecord[]; nextPageToken?: string }>(
      token, "conferenceRecords", params,
    );
    const notes = [];
    for (const rec of page.conferenceRecords ?? []) {
      if (!rec.endTime) continue; // reunião ainda em andamento
      const tr = await meetGet<{ transcripts?: Transcript[] }>(token, `${rec.name}/transcripts`);
      for (const t of tr.transcripts ?? []) {
        if (t.state && t.state !== "FILE_GENERATED" && t.state !== "ENDED") continue;
        notes.push({ id: t.name, title: null, createdAt: toIsoOrNull(rec.startTime ?? t.startTime) });
      }
    }
    return { notes, hasMore: !!page.nextPageToken, cursor: page.nextPageToken ?? null };
  },

  async getNote(token, transcriptName) {
    const recordName = transcriptName.split("/transcripts/")[0];
    const record = await meetGet<ConferenceRecord>(token, recordName);
    const participants = await listAll<Participant>(token, `${recordName}/participants`, "participants");
    const names = new Map(participants.map((p) => [p.name, participantName(p) ?? "Participante"]));
    const entries = await listAll<Entry>(token, `${transcriptName}/entries`, "transcriptEntries", 50);
    if (entries.length === 0) return null;

    const lines = entries
      .filter((e) => e.text?.trim())
      .map((e) => `${fmtTime(e.startTime, record.startTime)}${names.get(e.participant ?? "") ?? "Participante"}: ${e.text!.trim()}`);

    const people = [...new Set([...names.values()])];
    const date = record.startTime ? new Date(record.startTime).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";
    const full: FullNote = {
      id: transcriptName,
      title: `Google Meet · ${people.slice(0, 4).join(", ")}${date ? ` (${date})` : ""}`,
      createdAt: toIsoOrNull(record.startTime),
      content: lines.join("\n"),
      fidelity: "transcript",
      attendees: dedupeAttendees(people.map((n) => ({ name: n, email: null }))),
    };
    return full;
  },
};
