// Conectar / desconectar / sincronizar o note taker pessoal do líder.
//
// Ações:
//   connect    → valida a Personal API key no provedor e guarda criptografada
//   disconnect → apaga a conexão (não apaga notas já importadas)
//   sync       → roda a sincronização agora
//
// A chave só trafega uma vez (no connect) e nunca volta para o browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { decryptApiKey, encryptApiKey } from "../_shared/noteTakerCrypto.ts";
import { getProvider, NOTE_TAKER_PROVIDER_IDS } from "../_shared/notetakers/index.ts";
import { ingestNoteForMember, syncNoteTakerConnection } from "../_shared/noteTakerSync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  action: z.enum(["connect", "disconnect", "sync", "list_pending", "assign", "dismiss"]),
  provider: z.enum(NOTE_TAKER_PROVIDER_IDS).default("granola"),
  api_key: z.string().min(10).max(500).optional(),
  note_id: z.string().uuid().optional(),
  member_id: z.string().uuid().optional(),
});


function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const { data: { user }, error: userError } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const { action, provider } = parsed.data;

    const providerImpl = getProvider(provider);
    if (!providerImpl) return json({ error: `Provedor não suportado: ${provider}` }, 400);

    if (action === "disconnect") {
      await admin
        .from("leader_note_taker_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);
      return json({ ok: true });
    }

    if (action === "connect") {
      const apiKey = parsed.data.api_key?.trim();
      if (!apiKey) return json({ error: "api_key é obrigatório" }, 400);

      const check = await providerImpl.verifyKey(apiKey);
      if (!check.ok) return json({ error: check.message }, 400);

      const { error } = await admin
        .from("leader_note_taker_connections")
        .upsert(
          {
            user_id: user.id,
            provider,
            api_key_ciphertext: await encryptApiKey(apiKey),
            last_error: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,provider" },
        );
      if (error) throw error;
      return json({ ok: true });
    }

    // As ações abaixo dependem da conexão do próprio usuário (ownership check
    // antes de qualquer operação com service role).
    const { data: connection } = await admin
      .from("leader_note_taker_connections")
      .select("id, user_id, provider, api_key_ciphertext, last_synced_at")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .maybeSingle();
    if (!connection) return json({ error: "Nenhuma conexão encontrada" }, 404);

    if (action === "list_pending") {
      const { data, error } = await admin
        .from("note_taker_synced_notes")
        .select("id, external_note_id, title, note_created_at, attendees")
        .eq("user_id", user.id)
        .eq("provider", provider)
        .eq("status", "pending")
        .order("note_created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return json({ ok: true, pending: data ?? [] });
    }

    if (action === "dismiss") {
      if (!parsed.data.note_id) return json({ error: "note_id é obrigatório" }, 400);
      const { error } = await admin
        .from("note_taker_synced_notes")
        .update({ status: "dismissed" })
        .eq("id", parsed.data.note_id)
        .eq("user_id", user.id)
        .eq("provider", provider);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "assign") {
      const { note_id: noteId, member_id: memberId } = parsed.data;
      if (!noteId || !memberId) {
        return json({ error: "note_id e member_id são obrigatórios" }, 400);
      }

      const { data: note } = await admin
        .from("note_taker_synced_notes")
        .select("id, external_note_id, title, note_created_at, attendees, status")
        .eq("id", noteId)
        .eq("user_id", user.id)
        .eq("provider", provider)
        .maybeSingle();
      if (!note) return json({ error: "Nota não encontrada" }, 404);

      // O liderado precisa pertencer a um time liderado por este usuário.
      const { data: teams } = await admin
        .from("teams")
        .select("id")
        .eq("leader_user_id", user.id);
      const teamIds = (teams ?? []).map((t: { id: string }) => t.id);
      const { data: member } = await admin
        .from("team_members")
        .select("id")
        .eq("id", memberId)
        .in("team_id", teamIds.length > 0 ? teamIds : ["00000000-0000-0000-0000-000000000000"])
        .maybeSingle();
      if (!member) return json({ error: "Liderado inválido" }, 403);

      const apiKey = await decryptApiKey(connection.api_key_ciphertext);
      const full = await providerImpl.getNote(apiKey, note.external_note_id);
      if (!full) {
        return json({ error: `A nota não está mais disponível no ${providerImpl.label}` }, 404);
      }
      const content = full.content;
      if (!content) return json({ error: "Nota sem conteúdo para importar" }, 400);

      const ingest = await ingestNoteForMember(
        admin,
        {
          userId: user.id,
          provider,
          externalNoteId: note.external_note_id,
          memberId,
          title: note.title ?? full.title ?? `Reunião (${providerImpl.label})`,
          content,
          occurredAt: note.note_created_at ?? new Date().toISOString(),
          fidelity: full.fidelity,
          attendees: (note.attendees as Array<{ name: string | null; email: string | null }>) ?? [],
        },
        supabaseUrl,
        serviceKey,
      );
      if ("error" in ingest) return json({ error: ingest.error }, 500);

      await admin
        .from("note_taker_synced_notes")
        .update({ status: "imported", member_id: memberId, feedback_id: ingest.feedbackId })
        .eq("id", note.id);

      return json({ ok: true, feedback_id: ingest.feedbackId });
    }

    // action === "sync"
    const result = await syncNoteTakerConnection(admin, connection, supabaseUrl, serviceKey);
    return json({ ok: !result.error, ...result });

  } catch (err) {
    console.error("note-taker-connect error:", err);
    return json({ error: (err as Error).message ?? "Erro inesperado" }, 500);
  }
});
