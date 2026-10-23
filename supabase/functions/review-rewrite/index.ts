// AI Magic: reescreve só um trecho selecionado da avaliação formal (ou escreve um trecho para um alerta de cobertura).
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { composeSystemPrompt } from "../_shared/soul/loader.ts";
import { callAI, loadPeriodEvidence, loadReviewWithAccess, toolArgs } from "../_shared/orgContext.ts";

const Body = z.object({
  reviewId: z.string().uuid(),
  action: z.enum(["less_formal", "more_formal", "shorter", "constructive", "add_evidence", "custom", "suggest_insert"]),
  text: z.string().min(1).max(6000),
  instruction: z.string().max(500).optional(),
});
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const CITE = /\[doc:([0-9a-f-]{32,36})\]/gi;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: ue } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (ue || !u?.user) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { reviewId, action, text, instruction } = parsed.data;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { review, allowed } = await loadReviewWithAccess(admin, reviewId, u.user.id);
    if (!review) return json({ error: "Avaliação não encontrada" }, 404);
    if (!allowed) return json({ error: "Sem permissão para esta avaliação" }, 403);
    if (review.shared_with_member) return json({ error: "Avaliação já compartilhada" }, 409);

    const member = review.team_members;
    const evidence = await loadPeriodEvidence(admin, member.id, review.period_start, review.period_end);
    const systemPrompt = await composeSystemPrompt({ mode: "review-rewrite", channel: "document", vars: { memberName: member.name } });
    const task = action === "suggest_insert"
      ? `AÇÃO: escrever um parágrafo novo e curto (2 a 4 frases) que resolva o alerta abaixo, usando só evidências do contexto, com citações [doc:UUID]. Se não houver evidência, escreva com leveza que não há evidência suficiente no período e marque no_evidence.\n\nALERTA:\n${text}`
      : `AÇÃO: ${action}${instruction ? `\nINSTRUÇÃO DO LÍDER: ${instruction}` : ""}\n\nTRECHO SELECIONADO:\n${text}`;

    const ai = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${task}\n\nEVIDÊNCIAS DO PERÍODO (${evidence.count}):\n${evidence.text || "Nenhuma evidência registrada."}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_text",
          parameters: {
            type: "object",
            properties: { text: { type: "string" }, no_evidence: { type: "boolean" } },
            required: ["text"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_text" } },
      max_tokens: 4096,
    });
    if (ai?.choices?.[0]?.finish_reason === "length") {
      return json({ error: "A resposta ficou longa demais e veio incompleta. Tente selecionar um trecho menor." }, 502);
    }
    const out = toolArgs(ai) ?? {};
    let result = String(out.text ?? "").trim();
    if (!result) return json({ error: "A Rhitmo não conseguiu reescrever agora. Tente de novo." }, 502);

    // Só citações reais: remove UUIDs que não existem no contexto, e garante que as originais sobrevivem.
    const known = new Set([...evidence.text.matchAll(/doc_id: ([0-9a-f-]{32,36})/gi)].map((m) => m[1].toLowerCase()));
    for (const m of text.matchAll(CITE)) known.add(m[1].toLowerCase());
    result = result.replace(CITE, (full, id) => (known.has(id.toLowerCase()) ? full : ""));
    const missing = [...text.matchAll(CITE)].map((m) => m[0]).filter((c) => !result.includes(c));
    if (missing.length) result = `${result} ${missing.join(" ")}`;

    return json({ text: result, no_evidence: !!out.no_evidence });
  } catch (e: any) {
    console.error("[review-rewrite]", e);
    return json({ error: e?.message ?? "Erro desconhecido" }, e?.status ?? 500);
  }
});
