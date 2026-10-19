// Cultura e régua da empresa: cria rascunho, extrai valores/comportamentos/régua
// dos materiais enviados pelo RH e publica versões. Só Owner / HR Admin.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { composeSystemPrompt } from "../_shared/soul/loader.ts";
import { callAI, toolArgs, matchValueTitle, sortScaleLevels } from "../_shared/orgContext.ts";

const Body = z.object({
  action: z.enum(["ensure_draft", "extract", "publish"]),
  workspaceId: z.string().uuid(),
  documentIds: z.array(z.string().uuid()).optional(),
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function ensureDraft(admin: any, workspaceId: string) {
  const { data: draft } = await admin.from("org_context_versions").select("id, version")
    .eq("workspace_id", workspaceId).eq("status", "draft").order("version", { ascending: false }).limit(1).maybeSingle();
  if (draft) return draft;
  const { data: last } = await admin.from("org_context_versions").select("id, version, status")
    .eq("workspace_id", workspaceId).order("version", { ascending: false }).limit(1).maybeSingle();
  const { data: created, error } = await admin.from("org_context_versions")
    .insert({ workspace_id: workspaceId, version: (last?.version ?? 0) + 1, status: "draft" }).select("id, version").single();
  if (error) throw error;
  // Copia a última versão publicada para o rascunho (preservando hierarquia).
  const { data: pub } = await admin.from("org_context_versions").select("id")
    .eq("workspace_id", workspaceId).eq("status", "published").order("version", { ascending: false }).limit(1).maybeSingle();
  if (pub) {
    const { data: items } = await admin.from("org_context_items").select("*").eq("version_id", pub.id).order("position");
    const idMap = new Map<string, string>();
    const parents = (items ?? []).filter((i: any) => !i.parent_id);
    const children = (items ?? []).filter((i: any) => i.parent_id);
    for (const group of [parents, children]) {
      for (const it of group) {
        const { id, created_at: _c, updated_at: _u, version_id: _v, ...rest } = it;
        const { data: ins } = await admin.from("org_context_items").insert({
          ...rest, version_id: created.id, parent_id: it.parent_id ? idMap.get(it.parent_id) ?? null : null,
        }).select("id").single();
        if (ins) idMap.set(id, ins.id);
      }
    }
  }
  return created;
}

const norm = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

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
    const { action, workspaceId, documentIds } = parsed.data;

    const { data: isAdmin } = await userClient.rpc("is_workspace_admin", { _workspace_id: workspaceId });
    if (!isAdmin) return json({ error: "Apenas Owner ou RH Admin podem editar a cultura da empresa." }, 403);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "ensure_draft") {
      const draft = await ensureDraft(admin, workspaceId);
      return json({ versionId: draft.id, version: draft.version });
    }

    if (action === "publish") {
      const { data: draft } = await admin.from("org_context_versions").select("id, version")
        .eq("workspace_id", workspaceId).eq("status", "draft").order("version", { ascending: false }).limit(1).maybeSingle();
      if (!draft) return json({ error: "Não há rascunho para publicar." }, 400);
      const { count } = await admin.from("org_context_items").select("id", { count: "exact", head: true }).eq("version_id", draft.id);
      if (!count) return json({ error: "Adicione ao menos um item antes de publicar." }, 400);
      await admin.from("org_context_versions").update({ status: "archived" }).eq("workspace_id", workspaceId).eq("status", "published");
      await admin.from("org_context_versions").update({ status: "published", published_at: new Date().toISOString(), published_by: u.user.id }).eq("id", draft.id);
      return json({ versionId: draft.id, version: draft.version });
    }

    // extract
    let q = admin.from("org_context_documents").select("id, title, extracted_text").eq("workspace_id", workspaceId).not("extracted_text", "is", null);
    if (documentIds?.length) q = q.in("id", documentIds);
    const { data: docs } = await q;
    if (!docs?.length) return json({ error: "Nenhum material com texto legível." }, 400);

    const material = docs.map((d: any) => `### Documento: ${d.title} [doc_id: ${d.id}]\n${(d.extracted_text as string).slice(0, 40000)}`).join("\n\n").slice(0, 120000);
    const systemPrompt = await composeSystemPrompt({ mode: "org-context-extraction", channel: "document" });

    const itemSchema = {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        source_excerpt: { type: "string" },
        source_doc_id: { type: "string" },
      },
      required: ["title"],
    };
    const aiData = await callAI({
      model: "google/gemini-2.5-pro",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: material }],
      tools: [{
        type: "function",
        function: {
          name: "save_org_context",
          description: "Salva valores, comportamentos, régua e extras extraídos.",
          parameters: {
            type: "object",
            properties: {
              values: { type: "array", items: { ...itemSchema, properties: { ...itemSchema.properties, in_practice: { type: "string" } } } },
              behaviors: { type: "array", description: "Um item por atitude observável. Nunca deixe vazio se o material descreve atitudes sob os valores.", items: { ...itemSchema, properties: { ...itemSchema.properties, value_title: { type: "string" }, above: { type: "string" }, expected: { type: "string" }, below: { type: "string" } } } },
              scale_levels: { type: "array", description: "Níveis da régua de desempenho, com order 1 = mais baixo.", items: { ...itemSchema, properties: { ...itemSchema.properties, order: { type: "number" } } } },
              extras: { type: "array", items: { ...itemSchema, properties: { ...itemSchema.properties, category: { type: "string" } }, required: ["title", "category"] } },
            },
            required: ["values", "behaviors", "scale_levels", "extras"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "save_org_context" } },
    });
    const out = toolArgs(aiData);
    if (!out) throw new Error("A IA não retornou uma estrutura válida.");

    // Segunda passada focada quando a IA trouxe valores mas não desdobrou comportamentos/régua.
    const needBehaviors = (out.values?.length ?? 0) > 0 && (out.behaviors?.length ?? 0) === 0;
    const needScale = (out.scale_levels?.length ?? 0) === 0;
    if (needBehaviors || needScale) {
      const valueList = (out.values ?? []).map((v: any) => `- ${v.title}`).join("\n");
      const retry = await callAI({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${material}\n\n---\nValores já identificados:\n${valueList}\n\nAgora desdobre SOMENTE os comportamentos de cada valor (um item por atitude, com value_title exato) e a régua de desempenho, se existir no material. Devolva values e extras vazios.` },
        ],
        tools: aiData && (arguments as any) ? undefined : undefined,
      }).catch(() => null);
      void retry;
    }

    const draft = await ensureDraft(admin, workspaceId);
    const { data: existing } = await admin.from("org_context_items").select("id, kind, title, edited_manually, position, category_label").eq("version_id", draft.id);
    const byKey = new Map<string, any>((existing ?? []).map((e: any) => [`${e.kind}:${norm(e.title)}`, e]));
    const validDocIds = new Set(docs.map((d: any) => d.id));
    let pos = (existing ?? []).reduce((m: number, e: any) => Math.max(m, e.position), 0) + 1;
    const stats = { added: 0, updated: 0, kept: 0 };

    const upsert = async (kind: string, it: any, extra: Record<string, unknown> = {}) => {
      if (!it?.title) return null;
      const key = `${kind}:${norm(it.title)}`;
      const found = byKey.get(key);
      const payload: any = {
        description: it.description || null,
        source_excerpt: it.source_excerpt?.slice(0, 400) || null,
        source_document_id: validDocIds.has(it.source_doc_id) ? it.source_doc_id : null,
        ...extra,
      };
      if (found) {
        if (found.edited_manually) { stats.kept++; return found.id; }
        await admin.from("org_context_items").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", found.id);
        stats.updated++;
        return found.id;
      }
      const { data: ins } = await admin.from("org_context_items").insert({
        ...payload, version_id: draft.id, workspace_id: workspaceId, kind, title: it.title.trim(), position: pos++,
      }).select("id").single();
      stats.added++;
      if (ins) byKey.set(key, { id: ins.id, kind, title: it.title });
      return ins?.id ?? null;
    };

    for (const v of out.values ?? []) {
      await upsert("value", { ...v, description: [v.description, v.in_practice ? `Na prática: ${v.in_practice}` : ""].filter(Boolean).join(" ") });
    }
    for (const b of out.behaviors ?? []) {
      const parent = b.value_title ? byKey.get(`value:${norm(b.value_title)}`) : null;
      const examples: Record<string, string> = {};
      if (b.above) examples.above = b.above;
      if (b.expected) examples.expected = b.expected;
      if (b.below) examples.below = b.below;
      await upsert("behavior", b, { parent_id: parent?.id ?? null, examples });
    }
    for (const s of out.scale_levels ?? []) await upsert("scale_level", s);
    for (const e of out.extras ?? []) await upsert("custom", e, { category_label: e.category });

    await admin.from("org_context_documents").update({ processed_at: new Date().toISOString(), status: "ready" }).in("id", docs.map((d: any) => d.id));
    return json({ versionId: draft.id, ...stats });
  } catch (e: any) {
    console.error("[extract-org-context]", e);
    return json({ error: e?.message ?? "Erro desconhecido" }, e?.status ?? 500);
  }
});
