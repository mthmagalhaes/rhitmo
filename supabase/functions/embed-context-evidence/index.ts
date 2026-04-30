// Sprint 8.1 — Background embedder for context_evidence rows.
// Picks up rows with embedding IS NULL and fills them using OpenAI text-embedding-3-small.
// Designed to be called by cron or admin trigger. Idempotent + capped batch size.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const BATCH = 50;
const MODEL = "text-embedding-3-small";

interface Row {
  id: string;
  title: string | null;
  summary: string | null;
}

async function embedOne(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY missing");
    return null;
  }
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, input: text.slice(0, 8000) }),
  });
  if (!res.ok) {
    console.error("Embedding HTTP", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = await res.json();
  return data?.data?.[0]?.embedding ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: rows, error } = await supabase
      .from("context_evidence")
      .select("id, title, summary")
      .is("embedding", null)
      .order("created_at", { ascending: true })
      .limit(BATCH);

    if (error) throw error;
    const list = (rows ?? []) as Row[];
    if (list.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let ok = 0;
    let fail = 0;
    for (const r of list) {
      const text = (r.summary ?? r.title ?? "").trim();
      if (!text) {
        // Mark as zero-vector? Better: skip but set a sentinel by writing a tiny placeholder.
        // We can't satisfy NOT NULL because column is nullable. Skip.
        fail++;
        continue;
      }
      const emb = await embedOne(text);
      if (!emb) { fail++; continue; }
      const { error: upErr } = await supabase
        .from("context_evidence")
        .update({ embedding: JSON.stringify(emb) })
        .eq("id", r.id);
      if (upErr) { console.error("update", r.id, upErr.message); fail++; }
      else ok++;
    }

    return new Response(
      JSON.stringify({ ok: true, processed: ok, failed: fail, batch: list.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
