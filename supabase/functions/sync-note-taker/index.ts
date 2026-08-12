// Cron: sincroniza as notas de todos os líderes com note taker conectado.
// Agendado a cada 30 minutos.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateCronSecret } from "../_shared/cronAuth.ts";
import { syncNoteTakerConnection } from "../_shared/noteTakerSync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cron = validateCronSecret(req);
  if (!cron.valid) return cron.error!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: connections, error } = await admin
    .from("leader_note_taker_connections")
    .select("id, user_id, provider, api_key_ciphertext, last_synced_at");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const summary: Array<Record<string, unknown>> = [];
  for (const connection of connections ?? []) {
    try {
      const result = await syncNoteTakerConnection(admin, connection, supabaseUrl, serviceKey);
      summary.push({ user_id: connection.user_id, ...result });
    } catch (e) {
      console.error("sync-note-taker failed", connection.user_id, e);
      summary.push({ user_id: connection.user_id, error: (e as Error).message });
    }
  }

  return new Response(JSON.stringify({ processed: summary.length, summary }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
