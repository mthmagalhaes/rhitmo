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
          continue;
        }

        const full = (await getGranolaNote(apiKey, listed.id)) ?? listed;
        const content = noteToContent(full);
        if (content.length < MIN_CONTENT_LEN) {
          result.skipped += 1;
          continue;
        }

        const matched = matchMembers(full, members);
        const occurredAt = full.created_at ?? listed.created_at ?? new Date().toISOString();
        const title = full.title ?? listed.title ?? "Reunião (Granola)";

        if (matched.length === 0) {
          await supabase.from("note_taker_synced_notes").insert({
            user_id: connection.user_id,
            provider: connection.provider,
            external_note_id: listed.id,
            title,
            note_created_at: occurredAt,
          });
          result.unmatched += 1;
          continue;
        }

        for (const memberId of matched) {
          const { data: feedback, error } = await supabase
            .from("feedbacks")
            .insert({
              member_id: memberId,
              manager_id: connection.user_id,
              content,
              title,
              source: "granola",
              type: "neutral",
              visibility: "private_leader",
              occurred_at: occurredAt,
            })
            .select("id")
            .single();

          if (error) {
            console.error("granola feedback insert error", error);
            continue;
          }
          result.imported += 1;

          await supabase.from("note_taker_synced_notes").insert({
            user_id: connection.user_id,
            provider: connection.provider,
            external_note_id: `${listed.id}:${memberId}`,
            feedback_id: feedback.id,
            member_id: memberId,
            title,
            note_created_at: occurredAt,
          });

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
          })
          .then(() => undefined, () => undefined);
      }
    } while (cursor && pages < 5);
  } catch (e) {
    result.error = (e as Error).message;
  }

  await supabase
    .from("leader_note_taker_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      last_error: result.error ?? null,
      notes_imported: (await currentImported(supabase, connection.id)) + result.imported,
    })
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
