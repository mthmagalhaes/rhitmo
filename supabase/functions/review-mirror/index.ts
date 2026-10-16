// Espelho de coerência e viés: revisa o texto da avaliação antes de compartilhar.
// Funciona nos dois caminhos (rascunho completo e guiado pela cultura).
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { composeSystemPrompt } from "../_shared/soul/loader.ts";
import { callAI, loadPeriodEvidence, loadPublishedOrgContext, loadReviewWithAccess, orgContextToPrompt, toolArgs } from "../_shared/orgContext.ts";

const Body = z.object({
  reviewId: z.string().uuid(),
  content: z.string().max(60000).optional(),
  dismissIndex: z.number().int().min(0).optional(),
});
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR");

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
    const { reviewId, content, dismissIndex } = parsed.data;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { review, allowed, workspaceId } = await loadReviewWithAccess(admin, reviewId, u.user.id);
    if (!review) return json({ error: "Avaliação não encontrada" }, 404);
    if (!allowed) return json({ error: "Sem permissão para esta avaliação" }, 403);

    // Registrar "ignorar" de um alerta (o líder decide sempre).
    if (dismissIndex !== undefined) {
      const { data: row } = await admin.from("review_mirror_checks").select("findings, checked_at").eq("review_id", reviewId).maybeSingle();
      const findings = (row?.findings ?? []) as any[];
      if (findings[dismissIndex]) findings[dismissIndex].dismissed = true;
      await admin.from("review_mirror_checks").update({ findings }).eq("review_id", reviewId);
      return json({ findings, checked_at: row?.checked_at });
    }

    const text = (content ?? review.content ?? "").toString().replace(/<[^>]+>/g, " ").trim();
    if (text.length < 40) return json({ error: "Escreva a avaliação antes de revisar." }, 400);

    const member = review.team_members;
    const evidence = await loadPeriodEvidence(admin, member.id, review.period_start, review.period_end);
    const ctx = await loadPublishedOrgContext(admin, workspaceId);
    const systemPrompt = await composeSystemPrompt({
      mode: "review-mirror", channel: "document",
      vars: { memberName: member.name, periodLabel: `de ${fmt(review.period_start)} a ${fmt(review.period_end)}` },
    });
    const userPrompt = `TEXTO DA AVALIAÇÃO:\n${text.slice(0, 20000)}\n\nCLASSIFICAÇÃO ESCOLHIDA: ${review.classification ?? "não definida"}\n\n${ctx ? `CULTURA E RÉGUA DA EMPRESA:\n${orgContextToPrompt(ctx)}\n\n` : ""}EVIDÊNCIAS DO PERÍODO (${evidence.count}):\n${evidence.text || "Nenhuma evidência registrada."}`;

    const ai = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      tools: [{
        type: "function",
        function: {
          name: "report_findings",
          parameters: {
            type: "object",
            properties: {
              findings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["bias", "unsupported", "scale_mismatch", "history_conflict", "recency", "coverage"] },
                    severity: { type: "string", enum: ["low", "medium", "high"] },
                    excerpt: { type: "string" },
                    explanation: { type: "string" },
                    suggestion: { type: "string" },
                    doc_id: { type: "string" },
                  },
                  required: ["type", "severity", "explanation", "suggestion"],
                },
              },
            },
            required: ["findings"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "report_findings" } },
    });
    const out = toolArgs(ai) ?? { findings: [] };
    const result = { findings: (out.findings ?? []).slice(0, 10), checked_at: new Date().toISOString() };
    // Tabela separada: liderado lê avaliações compartilhadas, mas nunca o Espelho.
    await admin.from("review_mirror_checks").upsert({ review_id: reviewId, findings: result.findings, checked_at: result.checked_at, checked_by: u.user.id });
    return json(result);
  } catch (e: any) {
    console.error("[review-mirror]", e);
    return json({ error: e?.message ?? "Erro desconhecido" }, e?.status ?? 500);
  }
});
