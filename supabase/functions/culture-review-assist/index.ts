// Caminho "Guiado pela cultura" da avaliação formal.
// init: cria um cartão por valor/comportamento/extra da cultura publicada.
// suggest: IA sugere texto + nível da régua para um cartão (ou todos pendentes).
// assemble: junta os cartões revisados num documento editável (mesmo editor do rascunho completo).
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { composeSystemPrompt } from "../_shared/soul/loader.ts";
import {
  assessableItems, callAI, loadPeriodEvidence, loadPublishedOrgContext, loadReviewWithAccess, orgContextToPrompt, scaleLevels, toolArgs,
} from "../_shared/orgContext.ts";

const Body = z.object({
  action: z.enum(["init", "suggest", "suggest_all", "assemble"]),
  reviewId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
});
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function normalizeReviewHeadings(md: string): string {
  return md.replace(/^(#{2,4})[ \t]+(.+)$/gm, (line, hashes: string, body: string) => {
    if (body.length <= 90) return line;
    const dash = body.search(/\s[—–-]\s/);
    const from = dash >= 0 ? dash + 3 : 0;
    const rel = body.slice(from).search(/[.:]\s+\S/);
    if (rel < 0) return line;
    const cut = from + rel;
    const title = body.slice(0, cut).trim();
    const rest = body.slice(cut + 1).trim();
    return title && rest ? `${hashes} ${title}\n\n${rest}` : line;
  });
}
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
    const { action, reviewId, itemId } = parsed.data;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { review, allowed, workspaceId } = await loadReviewWithAccess(admin, reviewId, u.user.id);
    if (!review) return json({ error: "Avaliação não encontrada" }, 404);
    if (!allowed) return json({ error: "Sem permissão para esta avaliação" }, 403);

    if (action === "init") {
      const ctx = await loadPublishedOrgContext(admin, workspaceId);
      if (!ctx) return json({ error: "A empresa ainda não publicou cultura e régua." }, 400);
      const items = assessableItems(ctx);
      const rows = items.map((it, idx) => ({
        review_id: reviewId, org_item_id: it.id, item_title: it.category_label && it.kind === "custom" ? `${it.category_label}: ${it.title}` : it.title,
        item_kind: it.kind, position: idx,
      }));
      if (rows.length) await admin.from("review_culture_items").upsert(rows, { onConflict: "review_id,org_item_id", ignoreDuplicates: true });
      await admin.from("performance_reviews").update({ authoring_mode: "culture_guided", org_context_version_id: ctx.versionId }).eq("id", reviewId);
      return json({ count: rows.length });
    }

    if (action === "assemble") {
      const { data: cards } = await admin.from("review_culture_items").select("*").eq("review_id", reviewId).neq("item_kind", "custom").order("position");
      const used = (cards ?? []).filter((c: any) => c.status !== "skipped" && (c.final_text || c.suggested_text));
      if (!used.length) return json({ error: "Revise ao menos um item antes de montar o documento." }, 400);
      const member = review.team_members;
      const firstName = member.name.split(" ")[0];
      const periodLabel = `de ${fmt(review.period_start)} a ${fmt(review.period_end)}`;
      const evidence = await loadPeriodEvidence(admin, member.id, review.period_start, review.period_end);
      const valuesText = used.map((c: any) => {
        const level = c.final_level || c.suggested_level;
        return `### ${c.item_title}${level ? ` — ${level}` : ""}\n${(c.final_text || c.suggested_text || "").trim()}`;
      }).join("\n\n");
      const systemPrompt = await composeSystemPrompt({
        mode: "culture-guided-assemble", channel: "document",
        vars: { memberName: member.name, firstName, memberRole: member.role || "cargo não definido", periodLabel },
      });
      const lowEvidence = evidence.count < 3 ? "\n\n⚠️ ALERTA DE EVIDÊNCIA BAIXA" : "";
      const userPrompt = `VALORES REVISADOS PELO LÍDER:\n${valuesText}\n\nEVIDÊNCIAS DO PERÍODO (${evidence.count}):\n${evidence.text || "Nenhuma evidência registrada."}${lowEvidence}`;
      const ai = await callAI({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      });
      let md: string = (ai?.choices?.[0]?.message?.content ?? "").trim().replace(/^```(?:markdown)?\s*/i, "").replace(/```\s*$/, "").trim();
      md = normalizeReviewHeadings(md);
      if (!md) throw Object.assign(new Error("A Rhitmo não conseguiu montar o documento. Tente novamente."), { status: 502 });
      await admin.from("performance_reviews").update({ content: md, updated_at: new Date().toISOString() }).eq("id", reviewId);
      return json({ content: md });
    }

    // suggest / suggest_all
    const ctx = review.org_context_version_id
      ? await (async () => {
        const { data: items } = await admin.from("org_context_items")
          .select("id, kind, category_label, parent_id, title, description, examples, position").eq("version_id", review.org_context_version_id).neq("kind", "custom").order("position");
        return items?.length ? { versionId: review.org_context_version_id, version: 0, items } : null;
      })()
      : await loadPublishedOrgContext(admin, workspaceId);
    if (!ctx) return json({ error: "Cultura da empresa indisponível." }, 400);

    let q = admin.from("review_culture_items").select("*").eq("review_id", reviewId).neq("item_kind", "custom");
    if (action === "suggest") {
      if (!itemId) return json({ error: "itemId é obrigatório" }, 400);
      q = q.eq("id", itemId);
    } else q = q.is("suggested_text", null);
    const { data: cards } = await q.order("position");
    if (!cards?.length) return json({ updated: 0 });

    const member = review.team_members;
    const firstName = member.name.split(" ")[0];
    const periodLabel = `de ${fmt(review.period_start)} a ${fmt(review.period_end)}`;
    const evidence = await loadPeriodEvidence(admin, member.id, review.period_start, review.period_end);
    const levels = scaleLevels(ctx as any);
    const systemPrompt = await composeSystemPrompt({
      mode: "culture-guided-item", channel: "document",
      vars: { memberName: member.name, firstName, memberRole: member.role || "cargo não definido", periodLabel },
    });
    const cultureText = orgContextToPrompt(ctx as any);

    const suggestOne = async (card: any) => {
      const org = (ctx as any).items.find((i: any) => i.id === card.org_item_id);
      const behaviors = (ctx as any).items.filter((i: any) => i.parent_id === card.org_item_id);
      const itemText = `ITEM A AVALIAR: **${card.item_title}**\n${org?.description ?? ""}\n${behaviors.map((b: any) => `- Comportamento: ${b.title}${b.description ? ` — ${b.description}` : ""}`).join("\n")}\n${org?.examples && Object.keys(org.examples).length ? `Exemplos: ${JSON.stringify(org.examples)}` : ""}`;
      const userPrompt = `CULTURA E RÉGUA DA EMPRESA:\n${cultureText}\n\n${itemText}\n\nNÍVEIS DA RÉGUA: ${levels.length ? levels.join(" / ") : "Precisa subir / Dentro do esperado / Subindo a barra / Acima do esperado"}\n\nEVIDÊNCIAS DO PERÍODO (${evidence.count}):\n${evidence.text || "Nenhuma evidência registrada."}`;
      const ai = await callAI({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "suggest_item",
            parameters: {
              type: "object",
              properties: {
                text: { type: "string" },
                level: { type: "string" },
                justification: { type: "string" },
                insufficient_evidence: { type: "boolean" },
                doc_ids: { type: "array", items: { type: "string" } },
              },
              required: ["text", "level", "justification", "insufficient_evidence"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_item" } },
      });
      const out = toolArgs(ai);
      if (!out) throw new Error("IA não retornou sugestão");
      await admin.from("review_culture_items").update({
        suggested_text: out.text,
        suggested_level: out.level,
        level_justification: out.justification,
        citations: out.doc_ids ?? [],
        status: card.status === "pending" && out.insufficient_evidence ? "insufficient" : card.status,
        updated_at: new Date().toISOString(),
      }).eq("id", card.id);
    };

    // Concorrência limitada para não estourar rate limit.
    let updated = 0;
    for (let i = 0; i < cards.length; i += 3) {
      const batch = cards.slice(i, i + 3);
      const res = await Promise.allSettled(batch.map(suggestOne));
      updated += res.filter((r) => r.status === "fulfilled").length;
      const rejected = res.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      if (rejected && (rejected.reason as any)?.status) throw rejected.reason;
    }
    return json({ updated });
  } catch (e: any) {
    console.error("[culture-review-assist]", e);
    return json({ error: e?.message ?? "Erro desconhecido" }, e?.status ?? 500);
  }
});
