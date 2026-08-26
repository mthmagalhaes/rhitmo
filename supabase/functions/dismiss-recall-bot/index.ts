// Tira o bot da Rhitmo da sala AGORA.
//
// Existe porque o líder muitas vezes não é o organizador do Google Meet e,
// portanto, não consegue remover o bot pela UI do Meet. Aqui pedimos a saída
// ao Recall e marcamos a linha como `dismissed`.
//
// Ownership: dono da linha (recall_bots.user_id), super admin, ou dono do
// workspace do liderado associado ao bot.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RECALL_API_KEY = Deno.env.get("RECALL_API_KEY");

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const botId = typeof body?.bot_id === "string" ? body.bot_id.trim() : "";
    if (!UUID_RE.test(botId)) return json({ error: "bot_id inválido" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: bot, error: botErr } = await admin
      .from("recall_bots")
      .select("id, user_id, member_id, recall_bot_id, status, meeting_url")
      .eq("id", botId)
      .maybeSingle();

    if (botErr) return json({ error: botErr.message }, 500);
    if (!bot) return json({ error: "Bot não encontrado" }, 404);

    // ── Ownership chain (antes de qualquer operação com service_role) ──
    let allowed = bot.user_id === user.id;

    if (!allowed) {
      const { data: isAdmin } = await supabase.rpc("is_admin");
      allowed = Boolean(isAdmin);
    }

    if (!allowed && bot.member_id) {
      const { data: isOwner } = await supabase.rpc("is_workspace_owner_of_member", {
        _member_id: bot.member_id,
      });
      allowed = Boolean(isOwner);
    }

    if (!allowed) return json({ error: "Sem permissão para remover este bot" }, 403);

    // Pede a saída ao Recall (best-effort: se a chamada falhar, ainda marcamos
    // a linha para o card parar de mostrar o bot como ativo).
    let recallOk = false;
    let recallDetail: string | null = null;
    const isRealBot = bot.recall_bot_id && !bot.recall_bot_id.startsWith("failed-");

    if (RECALL_API_KEY && isRealBot) {
      try {
        const resp = await fetch(
          `https://us-west-2.recall.ai/api/v1/bot/${bot.recall_bot_id}/leave_call/`,
          { method: "POST", headers: { Authorization: `Token ${RECALL_API_KEY}` } },
        );
        recallOk = resp.ok;
        if (!resp.ok) {
          recallDetail = (await resp.text()).slice(0, 300);
          // Bot ainda agendado (não entrou): o endpoint correto é o delete do agendamento.
          const del = await fetch(
            `https://us-west-2.recall.ai/api/v1/bot/${bot.recall_bot_id}/`,
            { method: "DELETE", headers: { Authorization: `Token ${RECALL_API_KEY}` } },
          );
          recallOk = del.ok;
          if (!del.ok) recallDetail = `${recallDetail} | delete: ${(await del.text()).slice(0, 200)}`;
        }
      } catch (e) {
        recallDetail = e instanceof Error ? e.message : String(e);
      }
    }

    const { error: updErr } = await admin
      .from("recall_bots")
      .update({
        status: "dismissed",
        error_message: "Bot removido da reunião pelo líder.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bot.id);

    if (updErr) return json({ error: updErr.message }, 500);

    console.log(
      JSON.stringify({
        tag: "[dismiss-recall-bot]",
        bot_id: bot.id,
        recall_bot_id: bot.recall_bot_id,
        by_user: user.id,
        recall_ok: recallOk,
        recall_detail: recallDetail,
      }),
    );

    return json({ ok: true, recall_ok: recallOk });
  } catch (e) {
    console.error("[dismiss-recall-bot] unexpected", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
