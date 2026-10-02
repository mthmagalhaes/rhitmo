// Gerador público (sem login) de rascunho de avaliação de desempenho.
// Isca de conteúdo do rhitmo.co: limite por IP/dia e teto global diário
// para conter custo de IA. Prompt vem da alma (soul/modes/public-review-generator.md).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { aiChatText, gatewayErrorResponse } from "../_shared/aiGateway.ts";
import { composeSystemPrompt } from "../_shared/soul/loader.ts";

const IP_DAILY = 20;
const GLOBAL_DAILY = 500;

const Body = z.object({
  role: z.string().trim().min(2).max(120),
  facts: z.array(z.string().trim().min(3).max(500)).min(1).max(5),
  tone: z.enum(["desenvolvimento", "reconhecimento", "correcao"]),
});

async function hashIp(ip: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`rhitmo:${ip}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Preencha o cargo e pelo menos um fato." }, 400);
    const { role, facts, tone } = parsed.data;

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const ipHash = await hashIp(ip);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();

    const [{ count: ipCount }, { count: globalCount }] = await Promise.all([
      admin.from("public_ai_usage").select("id", { count: "exact", head: true })
        .eq("tool", "review_generator").eq("ip_hash", ipHash).gte("created_at", since),
      admin.from("public_ai_usage").select("id", { count: "exact", head: true })
        .eq("tool", "review_generator").gte("created_at", since),
    ]);
    if ((ipCount ?? 0) >= IP_DAILY) {
      return json({ error: "Você atingiu o limite de hoje. Volte amanhã ou teste a Rhitmo grátis por 14 dias." }, 429);
    }
    if ((globalCount ?? 0) >= GLOBAL_DAILY) {
      return json({ error: "O gerador está muito procurado hoje. Tente de novo amanhã." }, 429);
    }

    const system = await composeSystemPrompt({ mode: "public-review-generator", channel: "document" });
    const user = [
      `Cargo da pessoa avaliada: ${role}`,
      `Tom desejado: ${tone}`,
      "Fatos observados pelo líder:",
      ...facts.map((f, i) => `${i + 1}. ${f}`),
    ].join("\n");

    const draft = await aiChatText({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.5,
      max_tokens: 1400,
    });

    await admin.from("public_ai_usage").insert({ email: "-", ip_hash: ipHash, tool: "review_generator" });
    return json({ draft: draft.trim() });
  } catch (e) {
    console.error("generate-review-draft-public error", e);
    return gatewayErrorResponse(e, corsHeaders);
  }
});
