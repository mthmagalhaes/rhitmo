// Onda 4.2 — Testes do logger
// Foco: nunca propaga erro, gera request_id, e flush é idempotente.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createLogger, getOrCreateRequestId } from "./logger.ts";

Deno.test("getOrCreateRequestId — gera UUID se header ausente", () => {
  const req = new Request("http://x.test", { headers: {} });
  const id = getOrCreateRequestId(req);
  assert(/^[0-9a-f-]{36}$/i.test(id), "deve ser UUID");
});

Deno.test("getOrCreateRequestId — usa header válido quando presente", () => {
  const valid = "12345678-1234-1234-1234-123456789012";
  const req = new Request("http://x.test", { headers: { "x-request-id": valid } });
  assertEquals(getOrCreateRequestId(req), valid);
});

Deno.test("getOrCreateRequestId — descarta header inválido", () => {
  const req = new Request("http://x.test", { headers: { "x-request-id": "not-a-uuid" } });
  const id = getOrCreateRequestId(req);
  assert(/^[0-9a-f-]{36}$/i.test(id));
});

Deno.test("logger — métodos não lançam mesmo sem service role configurado", async () => {
  // Remove a service role key para simular ambiente sem permissão
  const original = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
  try {
    const log = createLogger({ functionName: "test", requestId: crypto.randomUUID() });
    log.info("start", { foo: "bar" });
    log.warn("oops");
    log.error("boom", new Error("kaboom"));
    log.aiCall({ model: "gemini-2.5-flash", durationMs: 120, status: 200 });
    await log.flush(); // não deve lançar
    await log.flush(); // idempotente
  } finally {
    if (original) Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", original);
  }
});

Deno.test("logger — setUser e setWorkspace mutam contexto", () => {
  const log = createLogger({ functionName: "test", requestId: crypto.randomUUID() });
  log.setUser("user-123");
  log.setWorkspace("ws-456");
  assertEquals(log.ctx.userId, "user-123");
  assertEquals(log.ctx.workspaceId, "ws-456");
});
