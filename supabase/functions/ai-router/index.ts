// ai-router: ponto único de entrada para tarefas de IA.
// Substitui dezenas de edge functions específicas, roteando por `task` no body.
//
// Skeleton inicial — Onda 3.3. Adicionar novas tasks em `tasks/` e registrar
// no mapa `TASKS` abaixo.
//
// Request shape:
//   POST /ai-router
//   { "task": "summarize_text", "input": { ... } }
//
// Response shape:
//   { "ok": true, "result": ... }   on success
//   { "ok": false, "error": "..." } on validation or runtime error

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gatewayErrorResponse, GatewayError } from "../_shared/aiGateway.ts";

import { summarizeText } from "./tasks/summarize_text.ts";
import { classifyIntent } from "./tasks/classify_intent.ts";
import { extractActionItems } from "./tasks/extract_action_items.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TaskHandler = (
  input: any,
  ctx: { userId: string }
) => Promise<unknown>;

// ============================================
// Task registry — adicionar novas tasks aqui
// ============================================
const TASKS: Record<string, TaskHandler> = {
  summarize_text: summarizeText,
  classify_intent: classifyIntent,
  extract_action_items: extractActionItems,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- Auth (mandatory: signing keys system requires in-code validation)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- Parse and route
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const task = body?.task as string | undefined;
  const input = body?.input ?? {};

  if (!task || typeof task !== "string") {
    return new Response(JSON.stringify({ ok: false, error: "Missing 'task' field" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const handler = TASKS[task];
  if (!handler) {
    return new Response(
      JSON.stringify({ ok: false, error: `Unknown task: ${task}`, available: Object.keys(TASKS) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // --- Execute
  const startedAt = Date.now();
  try {
    const result = await handler(input, { userId: userData.user.id });
    console.log(`ai-router task=${task} ok in ${Date.now() - startedAt}ms`);
    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`ai-router task=${task} failed:`, err);
    if (err instanceof GatewayError) {
      return gatewayErrorResponse(err, corsHeaders);
    }
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : "Task execution failed",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
