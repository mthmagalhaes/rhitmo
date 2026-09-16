// Edge function: recover-recall-bot
// -----------------------------------------------------------------------------
// Resgate de uma reunião que o bot GRAVOU mas que nunca chegou ao Rhitmo porque
// o registro em `recall_bots` não foi salvo (falha no INSERT). Sem esse registro
// o webhook da Recall descarta o evento `bot.done` e a transcrição se perde.
//
// A função:
//   1. Exige super_admin.
//   2. Busca o bot na Recall e confere que existe gravação com transcrição pronta.
//   3. Insere a linha faltante em `recall_bots` (idempotente por recall_bot_id).
//   4. Dispara `recall-webhook` com gatilho interno (x-internal-key) para
//      reaproveitar TODA a lógica de bot.done: matching de liderados, criação de
//      meeting_transcripts + feedbacks, resumo estruturado e sinais da reunião.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECALL_BASE = "https://us-west-2.recall.ai/api/v1";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RECALL_API_KEY = Deno.env.get("RECALL_API_KEY")!;

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No auth" }, 401);

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roleCheck) return json({ error: "Not admin" }, 403);

    const body = await req.json().catch(() => ({}));
    const recallBotId = typeof body.recall_bot_id === "string" ? body.recall_bot_id.trim() : "";
    const leaderEmail = typeof body.leader_email === "string" ? body.leader_email.trim().toLowerCase() : "";
    const titleOverride = typeof body.title === "string" ? body.title.trim() : "";

    if (!recallBotId || !leaderEmail) {
      return json({ error: "recall_bot_id e leader_email são obrigatórios" }, 400);
    }

    // ── Resolve o líder pelo email ───────────────────────────────────────────
    const { data: usersPage, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersErr) return json({ error: `Falha ao listar usuários: ${usersErr.message}` }, 500);
    const leader = usersPage.users.find((u) => (u.email ?? "").toLowerCase() === leaderEmail);
    if (!leader) return json({ error: `Líder não encontrado: ${leaderEmail}` }, 404);

    // ── Confere a gravação na Recall ─────────────────────────────────────────
    const botResp = await fetch(`${RECALL_BASE}/bot/${recallBotId}/`, {
      headers: { Authorization: `Token ${RECALL_API_KEY}` },
    });
    if (!botResp.ok) {
      return json({ error: `Bot não encontrado na Recall (${botResp.status})` }, 404);
    }
    const botData = await botResp.json();
    const recording = (botData.recordings ?? [])[0];
    const transcriptStatus = recording?.media_shortcuts?.transcript?.status?.code;
    if (!recording || transcriptStatus !== "done") {
      return json(
        { error: `Gravação sem transcrição pronta (status=${transcriptStatus ?? "nenhuma"})` },
        409,
      );
    }

    const meetingUrl = botData.meeting_url?.meeting_id
      ? `https://meet.google.com/${botData.meeting_url.meeting_id}`
      : (typeof botData.meeting_url === "string" ? botData.meeting_url : null);

    // ── Cria a linha faltante (idempotente) ──────────────────────────────────
    const { data: existing } = await supabaseAdmin
      .from("recall_bots")
      .select("id, status, meeting_transcript_id")
      .eq("recall_bot_id", recallBotId)
      .maybeSingle();

    if (existing?.status === "done" && existing.meeting_transcript_id) {
      return json({ ok: true, already_recovered: true, bot_row_id: existing.id });
    }

    let botRowId = existing?.id as string | undefined;
    if (!botRowId) {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from("recall_bots")
        .insert({
          user_id: leader.id,
          recall_bot_id: recallBotId,
          meeting_url: meetingUrl,
          status: "processing",
          trigger_source: "manual_retroactive",
          leader_email: leaderEmail,
          leader_detected: true,
          scheduled_at: recording.started_at ?? new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        return json({ error: `Falha ao registrar o bot: ${insErr?.message}` }, 500);
      }
      botRowId = inserted.id;
    }

    // ── Reprocessa via webhook (gatilho interno) ─────────────────────────────
    const hookResp = await fetch(`${SUPABASE_URL}/functions/v1/recall-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        event: "bot.done",
        data: { bot: { id: recallBotId } },
        internal: { title_override: titleOverride || null },
      }),
    });
    const hookBody = await hookResp.text();

    const { data: finalRow } = await supabaseAdmin
      .from("recall_bots")
      .select("id, status, meeting_transcript_id, error_message")
      .eq("id", botRowId!)
      .maybeSingle();

    const { data: created } = await supabaseAdmin
      .from("feedbacks")
      .select("id, member_id, title")
      .eq("manager_id", leader.id)
      .eq("source", "recall_bot")
      .order("created_at", { ascending: false })
      .limit(5);

    return json({
      ok: hookResp.ok,
      bot_row_id: botRowId,
      webhook_status: hookResp.status,
      webhook_body: hookBody.slice(0, 300),
      bot: finalRow,
      recent_feedbacks: created,
    });
  } catch (err) {
    console.error("recover-recall-bot error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
