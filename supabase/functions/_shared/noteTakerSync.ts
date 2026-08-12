// Sincronização de notas de note taker (Granola) → Diário de Bordo.
//
// Usado tanto pelo cron (`sync-note-taker`) quanto pelo "sincronizar agora"
// da tela de Conectores (`note-taker-connect`).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptApiKey } from "./noteTakerCrypto.ts";
import {
  getGranolaNote,
  listGranolaNotes,
  noteEmails,
  noteToContent,
  type GranolaNote,
} from "./granolaClient.ts";

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

function matchMembers(
  note: GranolaNote,
  members: Array<{ id: string; name: string; email: string | null }>,
): string[] {
  const emails = new Set(noteEmails(note));
  const byEmail = members
    .filter((m) => m.email && emails.has(m.email.toLowerCase()))
    .map((m) => m.id);
  if (byEmail.length > 0) return byEmail;

  // Fallback: nome do liderado citado no título da nota ("1:1 Camila").
  const title = (note.title ?? "").toLowerCase();
  if (!title) return [];
  return members
    .filter((m) => {
      const first = m.name.split(/\s+/)[0]?.toLowerCase();
      return first && first.length > 2 && title.includes(first);
    })
    .map((m) => m.id);
}

function noteAttendees(note: GranolaNote) {
  const raw = [...(note.people ?? []), ...(note.attendees ?? [])];
  const seen = new Set<string>();
  const out: Array<{ name: string | null; email: string | null }> = [];
  for (const p of raw) {
    const key = (p?.email ?? p?.name ?? "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name: p?.name ?? null, email: p?.email ?? null });
  }
  return out;
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
    attendees?: Array<{ name: string | null; email: string | null }>;
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
): Promise<SyncResult> {
  const result: SyncResult = { imported: 0, skipped: 0, unmatched: 0 };

  let apiKey: string;
  try {
    apiKey = await decryptApiKey(connection.api_key_ciphertext);
  } catch (e) {
    result.error = `Falha ao ler a chave armazenada: ${(e as Error).message}`;
    return result;
  }

  const members = await loadMembers(supabase, connection.user_id);

  // Marca d'água: só avança até a nota mais recente que conseguimos processar,
  // e apenas se o ciclo terminar sem erro. Assim uma falha no meio não faz
  // a janela pular notas que nunca foram lidas.
  let watermark: string | null = null;
  const bumpWatermark = (iso: string) => {
    if (!watermark || new Date(iso) > new Date(watermark)) watermark = iso;
  };

  let cursor: string | null = null;
  let pages = 0;
  try {
    do {
      const page = await listGranolaNotes(apiKey, {
        createdAfter: connection.last_synced_at,
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
          if (listed.created_at) bumpWatermark(listed.created_at);
          continue;
        }

        const full = (await getGranolaNote(apiKey, listed.id)) ?? listed;
        const content = noteToContent(full);
        const occurredAt = full.created_at ?? listed.created_at ?? new Date().toISOString();
        const title = full.title ?? listed.title ?? "Reunião (Granola)";
        const attendees = noteAttendees(full);

        if (content.length < MIN_CONTENT_LEN) {
          result.skipped += 1;
          await supabase.from("note_taker_synced_notes").insert({
            user_id: connection.user_id,
            provider: connection.provider,
            external_note_id: listed.id,
            title,
            note_created_at: occurredAt,
            status: "dismissed",
            attendees,
          });
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

async function currentImported(supabase: SupabaseClient, id: string): Promise<number> {
  const { data } = await supabase
    .from("leader_note_taker_connections")
    .select("notes_imported")
    .eq("id", id)
    .maybeSingle();
  return data?.notes_imported ?? 0;
}

