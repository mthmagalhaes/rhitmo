// Captura de lead dos materiais públicos do rhitmo.co (gerador, modelo, guias).
// Salva em content_leads, avisa o admin e envia o material ao lead
// (exceto quem já tem conta).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { sendAppEmail } from "../_shared/appEmail.ts";
import { findUserByEmail } from "../_shared/findUserByEmail.ts";

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  company: z.string().trim().max(160).optional().default(""),
  source: z.enum(["gerador", "modelo", "guia-avaliacao", "guia-1on1", "guia-pdi"]),
  utm: z.record(z.string().max(200)).optional(),
});

const SOURCE_LABEL: Record<string, string> = {
  gerador: "Gerador de avaliação",
  modelo: "Modelo de avaliação",
  "guia-avaliacao": "Guia avaliação",
  "guia-1on1": "Guia 1:1",
  "guia-pdi": "Guia PDI",
};

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
    if (!parsed.success) return json({ error: "Confira nome e e-mail." }, 400);
    const { name, email, company, source, utm } = parsed.data;

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const ipHash = await hashIp(ip);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();

    const { count } = await admin.from("content_leads").select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).gte("created_at", since);
    if ((count ?? 0) >= 15) return json({ error: "Muitas tentativas hoje. Tente amanhã." }, 429);

    // Mesmo e-mail + mesma origem nas últimas 24h: libera sem duplicar.
    const { data: dup } = await admin.from("content_leads").select("id")
      .eq("email", email).eq("source", source).gte("created_at", since).limit(1);
    if (dup && dup.length) return json({ ok: true });

    const { data: row, error } = await admin.from("content_leads")
      .insert({ name, email, company: company || null, source, utm: utm ?? null, ip_hash: ipHash })
      .select("id").single();
    if (error) {
      console.error("content_leads insert", error);
      return json({ error: "Não consegui salvar agora. Tente de novo." }, 500);
    }

    try {
      await sendAppEmail("admin-new-lead", "matheus@rhitmo.co", {
        idempotencyKey: `content-lead-admin-${row.id}`,
        templateData: { leadEmail: email, leadName: name, leadTeamSize: `${SOURCE_LABEL[source]}${company ? ` · ${company}` : ""}` },
      });
    } catch (e) { console.error("admin notify failed", e); }

    try {
      const existing = await findUserByEmail(admin, email, { maxPages: 3 });
      if (!existing) {
        await sendAppEmail("content-lead-welcome", email, {
          idempotencyKey: `content-lead-welcome-${row.id}`,
          templateData: { name, source: source === "gerador" ? "gerador" : "modelo" },
        });
      }
    } catch (e) { console.error("lead welcome failed", e); }

    return json({ ok: true });
  } catch (e) {
    console.error("content-lead error", e);
    return json({ error: "Erro inesperado." }, 500);
  }
});
