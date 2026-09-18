// Cliente mínimo da API pública do Granola.
//
// Auth é BYOK: cada líder cola a própria Personal API key
// (Granola > Settings > Connectors > API > Personal API keys).
// Por isso NÃO passamos pelo connector gateway da Lovable (que usa uma
// conexão única de workspace) — chamamos a API pública direto com a chave
// pessoal do líder.

const GRANOLA_API = "https://public-api.granola.ai";

export interface GranolaTranscriptSegment {
  text?: string | null;
  start_time?: string | null;
  speaker?: { source?: string | null; attribution?: string | null } | null;
}

export interface GranolaNote {
  id: string;
  title?: string | null;
  created_at?: string | null;
  summary?: string | null;
  summary_text?: string | null;
  summary_markdown?: string | null;
  private_notes_markdown?: string | null;
  markdown?: string | null;
  content?: string | null;
  /** Lista de trechos de fala; em notas antigas pode vir como texto corrido. */
  transcript?: string | GranolaTranscriptSegment[] | null;
  owner?: { name?: string | null; email?: string | null } | null;
  people?: Array<{ name?: string | null; email?: string | null }> | null;
  attendees?: Array<{ name?: string | null; email?: string | null }> | null;
  calendar_event?: {
    invitees?: Array<{ name?: string | null; email?: string | null }> | null;
  } | null;
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

/** Converte qualquer data legível para ISO 8601; null quando inválida. */
export function toIsoOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

export async function listGranolaNotes(
  apiKey: string,
  opts: { createdAfter?: string | null; cursor?: string | null; limit?: number },
): Promise<GranolaListResult> {
  const params = new URLSearchParams({ limit: String(opts.limit ?? 20) });
  // O Postgres devolve timestamptz como "2026-08-12 13:35:23.397+00"; a API do
  // Granola só aceita ISO 8601. Normaliza e ignora datas inválidas.
  const createdAfter = toIsoOrNull(opts.createdAfter);
  if (createdAfter) params.set("created_after", createdAfter);
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

/** Primeiro nome do dono da nota, usado para rotular os trechos "me". */
function ownerLabel(note: GranolaNote): string {
  const name = (note.owner?.name ?? "").trim();
  return name || "Eu";
}

/**
 * Converte a transcrição do Granola (lista de trechos com `speaker`) em
 * "Nome: fala" linha a linha. Notas antigas que vierem como texto corrido
 * continuam funcionando.
 */
export function transcriptLines(note: GranolaNote): string[] {
  const raw = note.transcript;
  if (!raw) return [];
  if (typeof raw === "string") {
    const text = raw.trim();
    return text ? [text] : [];
  }
  if (!Array.isArray(raw)) return [];

  const me = ownerLabel(note);
  const lines: string[] = [];
  let lastWho: string | null = null;

  for (const seg of raw) {
    const text = (seg?.text ?? "").trim();
    if (!text) continue;
    const attribution = (seg?.speaker?.attribution ?? "").trim();
    const who = !attribution
      ? null
      : attribution.toLowerCase() === "me"
        ? me
        : attribution.toLowerCase() === "them"
          ? "Participante"
          : attribution;

    if (who && who !== lastWho) {
      lines.push(`${who}: ${text}`);
      lastWho = who;
    } else {
      lines.push(text);
    }
  }
  return lines;
}

/** Texto que vai virar conteúdo de Anotações & Evidências: resumo do Granola + fala literal. */
export function noteToContent(note: GranolaNote): {
  content: string;
  fidelity: "transcript" | "summary";
} {
  const parts: string[] = [];
  const summary =
    note.summary_markdown ??
    note.summary_text ??
    note.summary ??
    note.markdown ??
    note.content ??
    null;
  if (summary) parts.push(String(summary).trim());

  const privateNotes = (note.private_notes_markdown ?? "").trim();
  if (privateNotes) parts.push(`\n**Notas do líder**\n${privateNotes}`);

  const lines = transcriptLines(note);
  if (lines.length > 0) {
    parts.push("\n---\n\n**Transcrição**\n");
    parts.push(lines.join("\n"));
    return { content: parts.join("\n").trim(), fidelity: "transcript" };
  }

  return { content: parts.join("\n").trim(), fidelity: "summary" };
}

export function noteEmails(note: GranolaNote): string[] {
  const people = [
    ...(note.people ?? []),
    ...(note.attendees ?? []),
    ...(note.calendar_event?.invitees ?? []),
  ];
  return people
    .map((p) => (p?.email ?? "").trim().toLowerCase())
    .filter((e) => e.length > 3);
}

