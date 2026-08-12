// Cliente mínimo da API pública do Granola.
//
// Auth é BYOK: cada líder cola a própria Personal API key
// (Granola > Settings > Connectors > API > Personal API keys).
// Por isso NÃO passamos pelo connector gateway da Lovable (que usa uma
// conexão única de workspace) — chamamos a API pública direto com a chave
// pessoal do líder.

const GRANOLA_API = "https://public-api.granola.ai";

export interface GranolaNote {
  id: string;
  title?: string | null;
  created_at?: string | null;
  summary?: string | null;
  markdown?: string | null;
  content?: string | null;
  transcript?: string | null;
  people?: Array<{ name?: string | null; email?: string | null }> | null;
  attendees?: Array<{ name?: string | null; email?: string | null }> | null;
  [key: string]: unknown;
}

export interface GranolaListResult {
  notes: GranolaNote[];
  hasMore: boolean;
  cursor: string | null;
}

async function granolaFetch(apiKey: string, path: string): Promise<Response> {
  return await fetch(`${GRANOLA_API}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
}

/** Valida a chave sem efeitos colaterais. Retorna erro legível ao usuário. */
export async function verifyGranolaKey(
  apiKey: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const res = await granolaFetch(apiKey, "/v1/notes?limit=1");
  if (res.ok) return { ok: true };
  const body = await res.text();
  const message =
    res.status === 401 || res.status === 403
      ? "Chave rejeitada pelo Granola. Confira se copiou a Personal API key completa."
      : `Granola respondeu ${res.status}: ${body.slice(0, 200)}`;
  return { ok: false, status: res.status, message };
}

export async function listGranolaNotes(
  apiKey: string,
  opts: { createdAfter?: string | null; cursor?: string | null; limit?: number },
): Promise<GranolaListResult> {
  const params = new URLSearchParams({ limit: String(opts.limit ?? 20) });
  if (opts.createdAfter) params.set("created_after", opts.createdAfter);
  if (opts.cursor) params.set("cursor", opts.cursor);

  const res = await granolaFetch(apiKey, `/v1/notes?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[${res.status}] ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return {
    notes: Array.isArray(data?.notes) ? data.notes : [],
    hasMore: Boolean(data?.hasMore),
    cursor: data?.cursor ?? null,
  };
}

export async function getGranolaNote(
  apiKey: string,
  noteId: string,
  includeTranscript = true,
): Promise<GranolaNote | null> {
  const qs = includeTranscript ? "?include=transcript" : "";
  const res = await granolaFetch(apiKey, `/v1/notes/${noteId}${qs}`);
  if (!res.ok) return null;
  const data = await res.json();
  return (data?.note ?? data) as GranolaNote;
}

/** Texto que vai virar conteúdo do Diário: transcrição quando houver, senão resumo. */
export function noteToContent(note: GranolaNote): string {
  const parts: string[] = [];
  const summary = note.summary ?? note.markdown ?? note.content ?? null;
  if (summary) parts.push(String(summary).trim());
  if (note.transcript) {
    parts.push("\n---\n\n**Transcrição**\n");
    parts.push(String(note.transcript).trim());
  }
  return parts.join("\n").trim();
}

export function noteEmails(note: GranolaNote): string[] {
  const people = [...(note.people ?? []), ...(note.attendees ?? [])];
  return people
    .map((p) => (p?.email ?? "").trim().toLowerCase())
    .filter((e) => e.length > 3);
}
