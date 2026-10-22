// Lê texto de imagens e PDFs via Lovable AI Gateway (visão multimodal).
// Modo `extract_meta` também devolve a data do ocorrido, só se estiver literal no conteúdo.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BodySchema = z.object({
  base64Image: z.string().min(10).max(22_000_000),
  mimeType: z.string().regex(/^(image\/(png|jpeg|jpg|webp)|application\/pdf)$/),
  mode: z.enum(["text", "extract_meta"]).optional(),
});

const OCR_RULES = `Extraia TODO o texto visível deste conteúdo. Mantenha a formatação original (parágrafos, listas, quebras de linha, títulos de slides).

REGRAS:
- Responda APENAS com o texto extraído, sem comentários ou explicações
- Se não houver texto, responda apenas: "[Nenhum texto detectado]"
- Preserve a estrutura visual (títulos, listas, parágrafos)`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Não autenticado" }, 401);

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { base64Image, mimeType, mode = "text" } = parsed.data;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI gateway not configured" }, 500);

    const dataUrl = `data:${mimeType};base64,${base64Image}`;
    const mediaPart = mimeType === "application/pdf"
      ? { type: "file", file: { filename: "documento.pdf", file_data: dataUrl } }
      : { type: "image_url", image_url: { url: dataUrl, detail: "high" } };

    const wantsMeta = mode === "extract_meta";
    const today = new Date().toISOString().slice(0, 10);
    const instructions = wantsMeta
      ? `${OCR_RULES}\n\nAlém do texto, informe occurred_at (AAAA-MM-DD) SOMENTE se uma data aparecer literalmente no conteúdo (ex.: carimbo de mensagem "12/03/2026", "ontem" NÃO conta). Hoje é ${today}. Se não houver data explícita, devolva null. Nunca invente.`
      : OCR_RULES;

    const body: Record<string, unknown> = {
      model: "google/gemini-2.5-pro",
      messages: [{ role: "user", content: [{ type: "text", text: instructions }, mediaPart] }],
      max_tokens: 8192,
    };
    if (wantsMeta) {
      body.tools = [{
        type: "function",
        function: {
          name: "return_extraction",
          description: "Texto extraído e data explícita (se houver).",
          parameters: {
            type: "object",
            properties: {
              text: { type: "string" },
              occurred_at: { type: ["string", "null"], description: "AAAA-MM-DD ou null" },
            },
            required: ["text", "occurred_at"],
            additionalProperties: false,
          },
        },
      }];
      body.tool_choice = { type: "function", function: { name: "return_extraction" } };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const t = await response.text();
      console.error("extract-text-vision gateway error:", response.status, t.slice(0, 500));
      if (response.status === 429) return json({ error: "Limite de uso da IA excedido. Tente novamente em instantes." }, 429);
      if (response.status === 402) return json({ error: "Créditos de IA esgotados." }, 402);
      return json({ error: "Failed to process file" }, 500);
    }

    const data = await response.json();
    if (wantsMeta) {
      const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      let out: { text?: string; occurred_at?: string | null } = {};
      try { out = args ? JSON.parse(args) : {}; } catch { /* ignore */ }
      const text = out.text || data?.choices?.[0]?.message?.content || "";
      const occ = typeof out.occurred_at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(out.occurred_at) ? out.occurred_at : null;
      return json({ text, occurred_at: occ });
    }
    return json({ text: data?.choices?.[0]?.message?.content || "" });
  } catch (error: any) {
    if (error?.name === "AbortError") return json({ error: "Request timeout" }, 504);
    console.error("Error in extract-text-vision:", error);
    return json({ error: "Erro ao processar arquivo" }, 500);
  }
});
