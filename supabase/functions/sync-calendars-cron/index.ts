import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateCronSecret } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

/**
 * Sincroniza o Google Calendar de todos os líderes com auto_transcribe = true.
 *
 * Motivo: até 07/08/2026 não existia cron para fetch-calendar-events — a sync
 * (e portanto o agendamento automático do bot) só rodava quando o líder abria
 * o app. Reuniões marcadas depois do último acesso nunca ganhavam bot.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { valid, error } = validateCronSecret(req);
  if (!valid) return error!;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: tokens, error: tokensError } = await admin
    .from("google_calendar_tokens")
    .select("user_id, email")
    .eq("auto_transcribe", true);

  if (tokensError) {
    console.error("[sync-cron] failed to list tokens:", tokensError.message);
    return new Response(JSON.stringify({ error: tokensError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ user_id: string; ok: boolean; detail?: string }> = [];

  for (const t of tokens ?? []) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/fetch-calendar-events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          "x-cron-secret": CRON_SECRET,
        },
        body: JSON.stringify({ user_id: t.user_id }),
      });
      const text = await resp.text();
      results.push({ user_id: t.user_id, ok: resp.ok, detail: resp.ok ? undefined : text.slice(0, 200) });
      if (!resp.ok) console.error(`[sync-cron] ${t.email} failed (${resp.status}): ${text.slice(0, 200)}`);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      results.push({ user_id: t.user_id, ok: false, detail });
      console.error(`[sync-cron] ${t.email} threw: ${detail}`);
    }
  }

  console.log(`[sync-cron] synced ${results.filter((r) => r.ok).length}/${results.length} calendars`);

  return new Response(JSON.stringify({ synced: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
