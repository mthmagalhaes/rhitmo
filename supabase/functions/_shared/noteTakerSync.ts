// Sincronização de notas de note taker pessoal → Anotações & Evidências.
//
// Usado tanto pelo cron (`sync-note-taker`) quanto pelo "sincronizar agora"
// da tela de Conectores (`note-taker-connect`).
//
// O provedor concreto (Granola, Fireflies, ...) vem do registro em
// `notetakers/index.ts`; este arquivo não conhece nenhuma API externa.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptApiKey } from "./noteTakerCrypto.ts";
import { getProvider } from "./notetakers/index.ts";
import {
  toIsoOrNull,
  type FullNote,
  type NoteAttendee,
  type NoteFidelity,
} from "./notetakers/types.ts";

export interface SyncResult {
  imported: number;
  skipped: number;
  unmatched: number;
  error?: string;
}

const MIN_CONTENT_LEN = 200;

/** Liderados do líder (via times onde ele é leader_user_id), indexados por e-mail. */
async function loadMembers(supabase: SupabaseClient, userId: string) {
  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("leader_user_id", userId);
  const teamIds = (teams ?? []).map((t: { id: string }) => t.id);
  if (teamIds.length === 0) return [];

  const { data: members } = await supabase
    .from("team_members")
    .select("id, name, email")
    .in("team_id", teamIds)
    .is("archived_at", null);
  return (members ?? []) as Array<{ id: string; name: string; email: string | null }>;
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Nomes ("Yasmin", "Yas", "Gabi") citados no texto → ids dos liderados. */
function membersByName(
  text: string,
  members: Array<{ id: string; name: string }>,
): string[] {
  const tokens = new Set(
    normalize(text).split(/[^a-z0-9]+/).filter((t) => t.length >= 3),
  );
  if (tokens.size === 0) return [];
  return members
    .filter((m) => {
      const first = normalize(m.name.split(/\s+/)[0] ?? "");
      if (first.length < 3) return false;
      for (const t of tokens) {
        if (t === first || (t.length >= 3 && first.startsWith(t))) return true;
      }
      return false;
    })
    .map((m) => m.id);
}

/**
 * Decide o dono da nota.
 * - e-mail dos convidados: pode atribuir a vários (reunião com mais de um liderado)
 * - nome/apelido no título ou no começo do texto: atribui só com um único candidato;
 *   ambíguo vira sugestão e a nota fica esperando o líder.
 */
export function matchMembers(
  note: { title: string | null; content?: string; attendees: NoteAttendee[] },
  members: Array<{ id: string; name: string; email: string | null }>,
): { ids: string[]; suggested: string | null } {
  const emails = new Set(
    note.attendees
      .map((a) => (a.email ?? "").trim().toLowerCase())
      .filter((e) => e.length > 3),
  );
  const byEmail = members
    .filter((m) => m.email && emails.has(m.email.toLowerCase()))
    .map((m) => m.id);
  if (byEmail.length > 0) return { ids: byEmail, suggested: null };

  const byTitle = membersByName(
    `${note.title ?? ""} ${note.attendees.map((a) => a.name ?? "").join(" ")}`,
    members,
  );
  if (byTitle.length === 1) return { ids: byTitle, suggested: null };
  if (byTitle.length > 1) return { ids: [], suggested: byTitle[0] };

  const byContent = membersByName((note.content ?? "").slice(0, 600), members);
  if (byContent.length === 1) return { ids: byContent, suggested: null };
  return { ids: [], suggested: byContent[0] ?? null };
}

/**
 * Grava a nota como evidência de um liderado e dispara o pipeline de resumo.
 * Reutilizado pela sincronização e pela atribuição manual de notas pendentes.
 */
export async function ingestNoteForMember(
  supabase: SupabaseClient,
  params: {
    userId: string;
    provider: string;
    externalNoteId: string;
    memberId: string;
    title: string;
    content: string;
    occurredAt: string;
    fidelity?: NoteFidelity;
    attendees?: NoteAttendee[];
    autoAssigned?: boolean;
  },
  supabaseUrl: string,
  serviceKey: string,
): Promise<{ feedbackId: string } | { error: string }> {
  const { data: feedback, error } = await supabase
    .from("feedbacks")
    .insert({
      member_id: params.memberId,
      manager_id: params.userId,
      content: params.content,
      title: params.title,
      source: params.provider,
      source_fidelity: params.fidelity ?? "summary",
      type: "neutral",
      visibility: "private_leader",
      occurred_at: params.occurredAt,
    })
    .select("id")
    .single();

  if (error || !feedback) {
    console.error("note taker feedback insert error", error);
    return { error: error?.message ?? "Falha ao gravar a nota" };
  }

  await supabase.from("note_taker_synced_notes").upsert(
    {
      user_id: params.userId,
      provider: params.provider,
      external_note_id: `${params.externalNoteId}:${params.memberId}`,
      feedback_id: feedback.id,
      member_id: params.memberId,
      title: params.title,
      note_created_at: params.occurredAt,
      status: "imported",
      attendees: params.attendees ?? [],
      auto_assigned: params.autoAssigned ?? false,
    },
    { onConflict: "user_id,provider,external_note_id" },
  );

  // Resumo estruturado + lente pessoal (fire-and-forget, mesmo
  // pipeline do bot e dos uploads).
  fetch(`${supabaseUrl}/functions/v1/summarize-transcript`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ feedbackId: feedback.id }),
  }).catch((e) => console.error("summarize-transcript trigger failed", e));

  return { feedbackId: feedback.id };
}

export async function syncNoteTakerConnection(
  supabase: SupabaseClient,
  connection: {
    id: string;
    user_id: string;
    provider: string;
    api_key_ciphertext: string;
    last_synced_at: string | null;
  },
  supabaseUrl: string,
  serviceKey: string,
  opts: { lookbackHours?: number } = {},
): Promise<SyncResult> {
  const result: SyncResult = { imported: 0, skipped: 0, unmatched: 0 };

  const provider = getProvider(connection.provider);
  if (!provider) {
    result.error = `Provedor não suportado: ${connection.provider}`;
    return result;
  }

  let apiKey: string;
  try {
    apiKey = await decryptApiKey(connection.api_key_ciphertext);
  } catch (e) {
    result.error = `Falha ao ler a chave armazenada: ${(e as Error).message}`;
    return result;
  }

  const members = await loadMembers(supabase, connection.user_id);

  // Marca d'água: só avança quando chega nota de verdade e o ciclo termina
  // sem erro. A consulta sempre olha para trás com margem (lookback), porque
  // o provedor carimba a nota com o horário de INÍCIO da reunião: uma conversa
  // que termina depois da última rodada fica com data anterior ao ponteiro.
  let watermark: string | null = null;
  const bumpWatermark = (value: string) => {
    const iso = toIsoOrNull(value);
    if (!iso) return;
    if (!watermark || new Date(iso) > new Date(watermark)) watermark = iso;
  };

  const lookbackMs = (opts.lookbackHours ?? 48) * 3600 * 1000;
  const base = connection.last_synced_at
    ? Math.min(new Date(connection.last_synced_at).getTime(), Date.now())
    : null;
  const createdAfter = base !== null && !Number.isNaN(base)
    ? new Date(base - lookbackMs).toISOString()
    : null;

  let cursor: string | null = null;
  let pages = 0;
  try {
    do {
      const page = await provider.listNotes(apiKey, {
        createdAfter,
        cursor,
        limit: 20,
      });
      cursor = page.hasMore ? page.cursor : null;
      pages += 1;

      for (const listed of page.notes) {
        const { data: existing } = await supabase
          .from("note_taker_synced_notes")
          .select("id")
          .eq("user_id", connection.user_id)
          .eq("provider", connection.provider)
          .eq("external_note_id", listed.id)
          .maybeSingle();
        if (existing) {
          result.skipped += 1;
          if (listed.createdAt) bumpWatermark(listed.createdAt);
          continue;
        }

        const full: FullNote = (await provider.getNote(apiKey, listed.id)) ?? {
          ...listed,
          content: "",
          fidelity: provider.defaultFidelity,
          attendees: [],
        };
        const content = full.content;
        const occurredAt = full.createdAt ?? listed.createdAt ?? new Date().toISOString();
        const title = full.title ?? listed.title ?? `Reunião (${provider.label})`;
        const attendees = full.attendees;

        // Conteúdo ilegível (ex.: transcrição que não foi normalizada) nunca
        // vira evidência silenciosamente.
        const unreadable = content.includes("[object Object]");
        if (content.length < MIN_CONTENT_LEN || unreadable) {
          result.skipped += 1;
          await supabase.from("note_taker_synced_notes").insert({
            user_id: connection.user_id,
            provider: connection.provider,
            external_note_id: listed.id,
            title,
            note_created_at: occurredAt,
            // Ilegível fica pendente (dá para reprocessar); nota curta demais
            // continua descartada.
            status: unreadable ? "pending" : "dismissed",
            attendees,
          });
          if (unreadable) {
            result.unmatched += 1;
            console.warn(`nota ${listed.id} com conteúdo ilegível; marcada como pendente`);
          }
          bumpWatermark(occurredAt);
          continue;
        }

        const matched = matchMembers(full, members);

        if (matched.length === 0) {
          // Fica pendente: o líder decide de quem é na tela de Conectores.
          await supabase.from("note_taker_synced_notes").insert({
            user_id: connection.user_id,
            provider: connection.provider,
            external_note_id: listed.id,
            title,
            note_created_at: occurredAt,
            status: "pending",
            attendees,
          });
          result.unmatched += 1;
          bumpWatermark(occurredAt);
          continue;
        }

        for (const memberId of matched) {
          const ingest = await ingestNoteForMember(
            supabase,
            {
              userId: connection.user_id,
              provider: connection.provider,
              externalNoteId: listed.id,
              memberId,
              title,
              content,
              occurredAt,
              fidelity: full.fidelity,
              attendees,
            },
            supabaseUrl,
            serviceKey,
          );
          if ("feedbackId" in ingest) result.imported += 1;
        }

        // Marca o id "cru" como visto para não reprocessar a nota inteira.
        await supabase
          .from("note_taker_synced_notes")
          .insert({
            user_id: connection.user_id,
            provider: connection.provider,
            external_note_id: listed.id,
            title,
            note_created_at: occurredAt,
            status: "seen",
            attendees,
          })
          .then(() => undefined, () => undefined);

        bumpWatermark(occurredAt);
      }
    } while (cursor && pages < 5);
  } catch (e) {
    result.error = (e as Error).message;
  }

  const update: Record<string, unknown> = {
    last_error: result.error ?? null,
    notes_imported: (await currentImported(supabase, connection.id)) + result.imported,
  };
  if (!result.error) {
    // Sem erro: avança a janela. Usa a nota mais recente vista (ou agora,
    // quando nada novo apareceu) para não pular notas atrasadas.
    update.last_synced_at = watermark ?? new Date().toISOString();
  }

  await supabase
    .from("leader_note_taker_connections")
    .update(update)
    .eq("id", connection.id);

  return result;
}

async function currentImported(supabase: SupabaseClient, connectionId: string): Promise<number> {
  const { data } = await supabase
    .from("leader_note_taker_connections")
    .select("notes_imported")
    .eq("id", connectionId)
    .maybeSingle();
  return Number((data as { notes_imported?: number } | null)?.notes_imported ?? 0);
}
