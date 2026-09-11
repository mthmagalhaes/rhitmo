/**
 * purge-recall-recordings — retenção de 90 dias das gravações no Recall.ai.
 *
 * Storage/playback é cumulativo na fatura (~16% em Jul/2026). Este cron apaga
 * a mídia no provedor depois de 90 dias. A transcrição já está no nosso banco,
 * então nada é perdido para o líder — só o vídeo/áudio bruto.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateCronSecret } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const RETENTION_DAYS = 90;
const BATCH_SIZE = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = validateCronSecret(req);
  if (!auth.valid) return auth.error!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const recallApiKey = Deno.env.get("RECALL_API_KEY");

  if (!recallApiKey) {
    return new Response(JSON.stringify({ error: "RECALL_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: bots, error } = await supabaseAdmin
    .from("recall_bots")
    .select("id, recall_bot_id")
    .is("media_purged_at", null)
    .not("recall_bot_id", "is", null)
    .lt("created_at", cutoff)
    .limit(BATCH_SIZE);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let purged = 0;
  let failed = 0;

  for (const bot of bots ?? []) {
    try {
      const resp = await fetch(
        `https://us-west-2.recall.ai/api/v1/bot/${bot.recall_bot_id}/delete_media/`,
        { method: "POST", headers: { Authorization: `Token ${recallApiKey}` } },
      );
      // 404 = mídia já não existe no provedor: tratamos como expurgada.
      if (resp.ok || resp.status === 404) {
        await supabaseAdmin
          .from("recall_bots")
          .update({ media_purged_at: new Date().toISOString() })
          .eq("id", bot.id);
        purged++;
      } else {
        failed++;
        console.warn(`purge: bot ${bot.recall_bot_id} → ${resp.status} ${await resp.text()}`);
      }
    } catch (e) {
      failed++;
      console.warn(`purge: bot ${bot.recall_bot_id} falhou:`, e);
    }
  }

  // Prazo de guarda por empresa: apaga o texto das transcrições vencidas
  // conforme `workspaces.transcript_retention_days` (padrão 365 dias).
  let transcriptsPurged = 0;
  const { data: retentionRows, error: retentionError } = await supabaseAdmin.rpc(
    "purge_expired_transcripts",
    { _limit: 500 },
  );
  if (retentionError) {
    console.warn("purge: retenção de transcrições falhou:", retentionError.message);
  } else {
    for (const row of (retentionRows ?? []) as Array<{ workspace_id: string; retention_days: number; purged: number }>) {
      transcriptsPurged += row.purged;
      await supabaseAdmin.from("access_audit_log").insert({
        workspace_id: row.workspace_id,
        action: "purge_transcripts",
        resource_type: "meeting_transcripts",
        metadata: { retention_days: row.retention_days, purged: row.purged },
      });
    }
  }

  console.log(
    `purge-recall-recordings: ${purged} mídias expurgadas, ${failed} falhas, ${transcriptsPurged} transcrições limpas, cutoff ${cutoff}`,
  );

  return new Response(JSON.stringify({ purged, failed, transcripts_purged: transcriptsPurged, cutoff }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
