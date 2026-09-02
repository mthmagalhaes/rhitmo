// Fireflies.ai — API key pessoal (Fireflies > Settings > Developer Settings).
// API GraphQL única em https://api.fireflies.ai/graphql com Bearer token.

import {
  dedupeAttendees,
  toIsoOrNull,
  type FullNote,
  type NoteAttendee,
  type NoteTakerProvider,
} from "./types.ts";

const ENDPOINT = "https://api.fireflies.ai/graphql";

async function gql<T>(apiKey: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}] ${text.slice(0, 300)}`);
  const parsed = JSON.parse(text) as { data?: T; errors?: Array<{ message: string }> };
  if (parsed.errors?.length) throw new Error(parsed.errors.map((e) => e.message).join("; "));
  return parsed.data as T;
}

const LIST_QUERY = `
  query Transcripts($limit: Int, $skip: Int, $fromDate: DateTime) {
    transcripts(limit: $limit, skip: $skip, fromDate: $fromDate) {
      id
      title
      dateString
    }
  }
`;

const DETAIL_QUERY = `
  query Transcript($transcriptId: String!) {
    transcript(id: $transcriptId) {
      id
      title
      dateString
      participants
      meeting_attendees { name displayName email }
      sentences { speaker_name text }
      summary { overview action_items shorthand_bullet }
    }
  }
`;

interface FfTranscriptRef {
  id: string;
  title?: string | null;
  dateString?: string | null;
}

interface FfTranscript extends FfTranscriptRef {
  participants?: string[] | null;
  meeting_attendees?: Array<{ name?: string | null; displayName?: string | null; email?: string | null }> | null;
  sentences?: Array<{ speaker_name?: string | null; text?: string | null }> | null;
  summary?: {
    overview?: string | null;
    action_items?: string | null;
    shorthand_bullet?: string | null;
  } | null;
}

function buildContent(t: FfTranscript): { content: string; fidelity: "transcript" | "summary" } {
  const parts: string[] = [];
  const overview = t.summary?.overview?.trim();
  if (overview) parts.push(overview);
  const actions = t.summary?.action_items?.trim();
  if (actions) parts.push(`\n**Próximos passos**\n${actions}`);

  const sentences = (t.sentences ?? [])
    .map((s) => {
      const text = (s.text ?? "").trim();
      if (!text) return null;
      const who = (s.speaker_name ?? "").trim();
      return who ? `${who}: ${text}` : text;
    })
    .filter((s): s is string => !!s);

  if (sentences.length > 0) {
    parts.push("\n---\n\n**Transcrição**\n");
    parts.push(sentences.join("\n"));
    return { content: parts.join("\n").trim(), fidelity: "transcript" };
  }

  return { content: parts.join("\n").trim(), fidelity: "summary" };
}

function attendeesOf(t: FfTranscript): NoteAttendee[] {
  const fromAttendees = (t.meeting_attendees ?? []).map((a) => ({
    name: a.displayName ?? a.name ?? null,
    email: a.email ?? null,
  }));
  const fromParticipants = (t.participants ?? []).map((email) => ({ name: null, email }));
  return dedupeAttendees([...fromAttendees, ...fromParticipants]);
}

export const firefliesProvider: NoteTakerProvider = {
  id: "fireflies",
  label: "Fireflies.ai",
  defaultFidelity: "transcript",

  async verifyKey(apiKey) {
    try {
      await gql<{ transcripts: FfTranscriptRef[] }>(apiKey, LIST_QUERY, { limit: 1, skip: 0 });
      return { ok: true };
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("401") || msg.includes("403") || /unauthor/i.test(msg)) {
        return {
          ok: false,
          message: "Chave rejeitada pelo Fireflies. Confira a API key em Settings > Developer Settings.",
        };
      }
      return { ok: false, message: `Fireflies respondeu: ${msg.slice(0, 200)}` };
    }
  },

  async listNotes(apiKey, opts) {
    // O Fireflies pagina por offset; usamos o cursor como `skip`.
    const limit = Math.min(opts.limit ?? 20, 50);
    const skip = Number(opts.cursor ?? 0) || 0;
    const data = await gql<{ transcripts: FfTranscriptRef[] }>(apiKey, LIST_QUERY, {
      limit,
      skip,
      fromDate: toIsoOrNull(opts.createdAfter ?? null),
    });
    const notes = (data.transcripts ?? []).map((t) => ({
      id: String(t.id),
      title: t.title ?? null,
      createdAt: toIsoOrNull(t.dateString),
    }));
    const hasMore = notes.length === limit;
    return { notes, hasMore, cursor: hasMore ? String(skip + limit) : null };
  },

  async getNote(apiKey, noteId) {
    const data = await gql<{ transcript: FfTranscript | null }>(apiKey, DETAIL_QUERY, {
      transcriptId: noteId,
    });
    const t = data.transcript;
    if (!t) return null;
    const { content, fidelity } = buildContent(t);
    return {
      id: String(t.id),
      title: t.title ?? null,
      createdAt: toIsoOrNull(t.dateString),
      content,
      fidelity,
      attendees: attendeesOf(t),
    } satisfies FullNote;
  },
};
