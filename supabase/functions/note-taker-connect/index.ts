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
import { getGranolaNote, noteToContent, verifyGranolaKey } from "../_shared/granolaClient.ts";
import { ingestNoteForMember, syncNoteTakerConnection } from "../_shared/noteTakerSync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  action: z.enum(["connect", "disconnect", "sync", "list_pending", "assign", "dismiss"]),
  provider: z.literal("granola").default("granola"),
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

      const check = await verifyGranolaKey(apiKey);
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

    // action === "sync"
    const { data: connection } = await admin
      .from("leader_note_taker_connections")
      .select("id, user_id, provider, api_key_ciphertext, last_synced_at")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .maybeSingle();
    if (!connection) return json({ error: "Nenhuma conexão encontrada" }, 404);

    const result = await syncNoteTakerConnection(admin, connection, supabaseUrl, serviceKey);
    return json({ ok: !result.error, ...result });
  } catch (err) {
    console.error("note-taker-connect error:", err);
    return json({ error: (err as Error).message ?? "Erro inesperado" }, 500);
  }
});
