# Templates canônicos

Quatro shapes que cobrem 95% das edge functions da Rhitmo. Copie, adapte, nunca regrida em segurança.

---

## (a) Endpoint autenticado básico (usuário-logado → operação no banco)

```ts
// supabase/functions/<name>/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { logger } from "../_shared/logger.ts";
import { safeQuery, safeRpc } from "../_shared/safeSupabase.ts";

const BodySchema = z.object({
  member_id: z.string().uuid(),
  note: z.string().min(1).max(5000),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return json({ error: "missing_authorization" }, 401);
    }

    // user-client: respeita RLS, usa o JWT do usuário
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "invalid_jwt" }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const { member_id, note } = parsed.data;

    // OWNERSHIP CHECK antes de tocar service_role
    const owner = await safeQuery(
      userClient.from("team_members").select("id").eq("id", member_id).maybeSingle(),
      { context: "ownership_check" },
    );
    if (!owner.data) return json({ error: "forbidden" }, 403);

    // Agora pode usar service_role para mutações cross-RLS
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const result = await safeRpc(adminClient, "create_leader_note", {
      p_member_id: member_id,
      p_manager_id: user.id,
      p_note: note,
    });

    if (result.error) {
      logger.error("create_leader_note_failed", { err: result.error, user: user.id });
      return json({ error: "internal" }, 500);
    }

    return json({ id: result.data });
  } catch (e) {
    logger.error("unhandled", { err: String(e) });
    return json({ error: "internal" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

---

## (b) Cron-only (sem usuário)

```ts
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { assertCronSecret } from "../_shared/cronAuth.ts";
import { logger } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronErr = assertCronSecret(req);
  if (cronErr) return cronErr; // já é Response 401 c/ CORS

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // EdgeRuntime.waitUntil: responde rápido, processa depois
  EdgeRuntime.waitUntil((async () => {
    try {
      // ... trabalho pesado (iterar tenants, enviar DMs, etc.)
    } catch (e) {
      logger.error("cron_job_failed", { err: String(e) });
    }
  })());

  return new Response(JSON.stringify({ accepted: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

---

## (c) Webhook externo (Slack / Stripe)

Resposta 200 vazia em <3s, processamento via `waitUntil`.

```ts
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { verifySlackSignature } from "../_shared/slackCommands.ts"; // se existir, senão inline

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const raw = await req.text();
  if (!verifySlackSignature(req.headers, raw)) {
    return new Response("invalid signature", { status: 401, headers: corsHeaders });
  }

  const payload = parseSlackPayload(raw);

  // ACK imediato
  EdgeRuntime.waitUntil(handleSlackEvent(payload));

  return new Response("", { status: 200, headers: corsHeaders });
});
```

Para Slack interactions específicas: usar `payload.response_url` para responder depois (não o canal de origem do POST).

---

## (d) Chamada AI (Lovable AI Gateway + soul loader)

```ts
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAI } from "../_shared/aiGateway.ts";
import { composeSystemPrompt } from "../_shared/soul/loader.ts";
import { safeRpc } from "../_shared/safeSupabase.ts";

// ... auth + ownership igual ao template (a)

const system = await composeSystemPrompt({
  mode: "mentor",        // ver _shared/soul/modes/
  channel: "web",        // "web" | "slack"
  vars: { leader_name: user.user_metadata?.name ?? "líder" },
});

const ai = await callAI({
  model: "google/gemini-2.5-flash", // pro só quando justificado
  system,
  messages: [{ role: "user", content: userQuestion }],
  // opcional: response_format JSON, tools, etc.
});

if (ai.error) {
  logger.error("ai_call_failed", { err: ai.error });
  return json({ error: "ai_unavailable" }, 502);
}

// Persistir resposta via RPC (com safeRpc, jamais .catch())
await safeRpc(admin, "save_mentor_message", { p_session: sessionId, p_content: ai.text });

return json({ text: ai.text, usage: ai.usage });
```

Regra: **nunca** colar o system prompt da Rhitmo no código. Toda mudança de identidade/tom passa por `_shared/soul/*.md` (skill `rhitmo-soul-editor`).
