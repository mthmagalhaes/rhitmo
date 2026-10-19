// Cultura e régua da empresa (versão publicada pelo RH).
// Fonte única para generate-formal-review, culture-review-assist e review-mirror.
// deno-lint-ignore-file no-explicit-any

export interface OrgContextItem {
  id: string;
  kind: string; // value | behavior | scale_level | custom
  category_label: string | null;
  parent_id: string | null;
  title: string;
  description: string | null;
  examples: Record<string, string> | null;
  position: number;
}

export interface OrgContext {
  versionId: string;
  version: number;
  items: OrgContextItem[];
}

export async function loadPublishedOrgContext(supabase: any, workspaceId: string | null | undefined): Promise<OrgContext | null> {
  if (!workspaceId) return null;
  const { data: v } = await supabase
    .from("org_context_versions")
    .select("id, version")
    .eq("workspace_id", workspaceId)
    .eq("status", "published")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!v) return null;
  const { data: items } = await supabase
    .from("org_context_items")
    .select("id, kind, category_label, parent_id, title, description, examples, position")
    .eq("version_id", v.id)
    .order("position", { ascending: true });
  if (!items || items.length === 0) return null;
  return { versionId: v.id, version: v.version, items };
}

export function scaleLevels(ctx: OrgContext | null): string[] {
  return (ctx?.items ?? []).filter((i) => i.kind === "scale_level").map((i) => i.title);
}

/** Texto compacto para injetar como apêndice de prompt. */
export function orgContextToPrompt(ctx: OrgContext): string {
  const values = ctx.items.filter((i) => i.kind === "value");
  const behaviors = ctx.items.filter((i) => i.kind === "behavior");
  const scale = ctx.items.filter((i) => i.kind === "scale_level");
  const custom = ctx.items.filter((i) => i.kind === "custom");
  let out = "";
  if (values.length) {
    out += "### Valores\n";
    for (const v of values) {
      out += `- **${v.title}**${v.description ? `: ${v.description}` : ""}\n`;
      for (const b of behaviors.filter((b) => b.parent_id === v.id)) out += `  - Comportamento: ${b.title}${b.description ? ` — ${b.description}` : ""}\n`;
    }
  }
  const loose = behaviors.filter((b) => !b.parent_id || !values.some((v) => v.id === b.parent_id));
  if (loose.length) {
    out += "### Comportamentos\n";
    for (const b of loose) out += `- ${b.title}${b.description ? ` — ${b.description}` : ""}\n`;
  }
  if (scale.length) {
    out += "### Régua de desempenho (do mais baixo ao mais alto)\n";
    for (const s of scale) out += `- **${s.title}**${s.description ? `: ${s.description}` : ""}\n`;
  }
  if (custom.length) {
    const cats = [...new Set(custom.map((c) => c.category_label || "Outros"))];
    for (const c of cats) {
      out += `### ${c}\n`;
      for (const i of custom.filter((x) => (x.category_label || "Outros") === c)) out += `- **${i.title}**${i.description ? `: ${i.description}` : ""}\n`;
    }
  }
  return out;
}

/** Itens avaliáveis no caminho guiado: valores (com comportamentos) + categorias extras + comportamentos soltos. */
export function assessableItems(ctx: OrgContext): (OrgContextItem & { behaviors: OrgContextItem[] })[] {
  const values = ctx.items.filter((i) => i.kind === "value");
  const behaviors = ctx.items.filter((i) => i.kind === "behavior");
  const loose = behaviors.filter((b) => !b.parent_id || !values.some((v) => v.id === b.parent_id));
  return [
    ...values.map((v) => ({ ...v, behaviors: behaviors.filter((b) => b.parent_id === v.id) })),
    ...loose.map((b) => ({ ...b, behaviors: [] })),
    ...ctx.items.filter((i) => i.kind === "custom").map((c) => ({ ...c, behaviors: [] })),
  ];
}

/** Resolve workspace + permissão de uma review (autor, líder do time ou owner). */
export async function loadReviewWithAccess(supabase: any, reviewId: string, callerId: string) {
  const { data: review } = await supabase
    .from("performance_reviews")
    .select("*, team_members!performance_reviews_member_id_fkey(id, name, role, teams!inner(leader_user_id, workspace_id, workspaces!inner(owner_id)))")
    .eq("id", reviewId)
    .maybeSingle();
  if (!review) return { review: null, allowed: false, workspaceId: null };
  const team = review.team_members?.teams;
  const allowed = callerId === review.author_user_id || callerId === team?.leader_user_id || callerId === team?.workspaces?.owner_id;
  return { review, allowed, workspaceId: team?.workspace_id ?? null };
}

/** Evidências do período (anotações + 1:1s) com doc_id para citações. */
export async function loadPeriodEvidence(supabase: any, memberId: string, start: string, end: string) {
  const [{ data: feedbacks }, { data: meetings }] = await Promise.all([
    supabase.from("feedbacks").select("id, content, summary, type, occurred_at, evidence_id")
      .eq("member_id", memberId).gte("occurred_at", start).lte("occurred_at", end).order("occurred_at", { ascending: true }).limit(80),
    supabase.from("meeting_transcripts").select("id, leader_notes, extracted_themes, created_at")
      .eq("member_id", memberId).gte("created_at", start).lte("created_at", end).eq("processing_status", "completed").order("created_at", { ascending: true }).limit(30),
  ]);
  const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR");
  let text = "";
  for (const f of feedbacks ?? []) {
    const body = (f.summary || f.content || "").toString().slice(0, 600);
    text += `- [doc_id: ${f.evidence_id || f.id}] Anotação ${fmt(f.occurred_at)} (${f.type ?? "nota"}): ${body}\n`;
  }
  for (const m of meetings ?? []) {
    const body = (m.leader_notes || JSON.stringify(m.extracted_themes ?? "")).toString().slice(0, 600);
    text += `- [doc_id: ${m.id}] 1:1 de ${fmt(m.created_at)}: ${body}\n`;
  }
  return { text, count: (feedbacks?.length ?? 0) + (meetings?.length ?? 0) };
}

export async function callAI(body: Record<string, unknown>) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY não configurada");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw Object.assign(new Error("Limite de requisições excedido. Tente novamente em instantes."), { status: 429 });
  if (res.status === 402) throw Object.assign(new Error("Créditos de IA esgotados."), { status: 402 });
  if (!res.ok) throw new Error(`AI error ${res.status}: ${await res.text()}`);
  return await res.json();
}

export function toolArgs(aiData: any): any {
  const call = aiData?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return null;
  try { return JSON.parse(call.function.arguments); } catch { return null; }
}

// ---- Extração: helpers puros (testáveis) ----
const normTitle = (s: string) => (s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

/** Acha o valor-pai pelo título: exato normalizado, depois "contém" em qualquer direção. */
export function matchValueTitle(valueTitles: string[], wanted: string | null | undefined): string | null {
  if (!wanted) return null;
  const w = normTitle(wanted);
  if (!w) return null;
  const exact = valueTitles.find((t) => normTitle(t) === w);
  if (exact) return exact;
  const partial = valueTitles.filter((t) => { const n = normTitle(t); return n && (w.includes(n) || n.includes(w)); });
  return partial.length === 1 ? partial[0] : null;
}

/** Ordena níveis da régua do mais baixo ao mais alto usando `order` quando vier. */
export function sortScaleLevels<T extends { order?: number | null }>(levels: T[]): T[] {
  return levels.map((l, i) => ({ l, i })).sort((a, b) => {
    const ao = typeof a.l.order === "number" ? a.l.order : Number.MAX_SAFE_INTEGER;
    const bo = typeof b.l.order === "number" ? b.l.order : Number.MAX_SAFE_INTEGER;
    return ao - bo || a.i - b.i;
  }).map((x) => x.l);
}
