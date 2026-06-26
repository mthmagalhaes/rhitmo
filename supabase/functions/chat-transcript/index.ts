// Edge function: chat-transcript
// -----------------------------------------------------------------------------
// "Granola-style" chat bar scoped to a single meeting transcript.
// The leader opens a transcript in the Diário, switches to the "Conversar" tab
// and asks questions about THAT specific meeting only — no other team data is
// loaded into the prompt. This keeps latency low and privacy tight.
//
// Auth: requires the caller to be the manager_id (owner) of the feedback.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChatText, gatewayErrorResponse } from "../_shared/aiGateway.ts";
import { createLogger, getOrCreateRequestId } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Expose-Headers": "x-request-id",
};

function clip(text: string, maxChars = 50_000): string {
  if (text.length <= maxChars) return text;
  const half = Math.floor(maxChars / 2) - 200;
  return `${text.slice(0, half)}\n\n[... truncado ...]\n\n${text.slice(-half)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ functionName: "chat-transcript", requestId });
  const respHeaders = { ...corsHeaders, "Content-Type": "application/json", "x-request-id": requestId };

  try {
    const { feedbackId, question, history } = await req.json();
    if (!feedbackId || !question?.trim()) {
      return new Response(JSON.stringify({ error: "feedbackId and question required" }), {
        status: 400,
        headers: respHeaders,
      });
    }

    // Auth: user must own the feedback (manager_id) or be the member it's about.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: respHeaders,
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: respHeaders,
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: fb, error: fbErr } = await admin
      .from("feedbacks")
      .select("id, manager_id, member_id, content, title, structured_summary, occurred_at")
      .eq("id", feedbackId)
      .maybeSingle();

    if (fbErr || !fb) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: respHeaders,
      });
    }
    if (fb.manager_id !== user.id && fb.member_id !== user.id) {
      log.warn("chat_transcript_forbidden", { caller: user.id, feedbackId });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: respHeaders,
      });
    }

    const summary = fb.structured_summary
      ? `\n\nResumo estruturado já extraído:\n${JSON.stringify(fb.structured_summary, null, 2)}`
      : "";

    const system = `Você é a Rhitmo conversando sobre UMA reunião 1:1 específica. Responda apenas com base na transcrição e no resumo abaixo — se não houver evidência, diga claramente que aquilo não foi discutido. Tom: curto, direto, em português brasileiro. Cite trechos entre aspas quando útil.

Título: ${fb.title || "(sem título)"}
Data: ${fb.occurred_at || "n/d"}
${summary}

Transcrição completa:
"""
${clip(fb.content || "")}
"""`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: system },
    ];
    if (Array.isArray(history)) {
      for (const m of history.slice(-6)) {
        if (m?.role === "user" || m?.role === "assistant") {
          messages.push({ role: m.role, content: String(m.content || "") });
        }
      }
    }
    messages.push({ role: "user", content: String(question) });

    const reply = await aiChatText({
      messages,
      temperature: 0.3,
      logger: log,
    });

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: respHeaders,
    });
  } catch (err) {
    return gatewayErrorResponse(err, corsHeaders);
  }
});
