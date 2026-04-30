// Onda 4.2 — Testes do safeSupabase wrapper (Deno side)

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { safeRpc, tryRpc, SupabaseSafeError } from "./safeSupabase.ts";

function makeClient(rpcResult: { data?: unknown; error?: { message: string; code?: string } | null }) {
  return {
    rpc: (_name: string, _args?: Record<string, unknown>) => Promise.resolve(rpcResult),
  } as any;
}

Deno.test("safeRpc — sucesso retorna data", async () => {
  const client = makeClient({ data: { ok: true }, error: null });
  const data = await safeRpc<{ ok: boolean }>(client, "any_rpc");
  assertEquals(data.ok, true);
});

Deno.test("safeRpc — erro lança SupabaseSafeError com nome do RPC", async () => {
  const client = makeClient({ data: null, error: { message: "permission denied", code: "42501" } });
  await assertRejects(
    () => safeRpc(client, "secret_rpc"),
    SupabaseSafeError,
    "secret_rpc",
  );
});

Deno.test("tryRpc — engole erro e devolve null", async () => {
  const client = makeClient({ data: null, error: { message: "boom" } });
  const result = await tryRpc(client, "cleanup_things");
  assertEquals(result, null);
});

Deno.test("tryRpc — em sucesso devolve mesmo data que safeRpc", async () => {
  const client = makeClient({ data: { count: 3 }, error: null });
  const result = await tryRpc<{ count: number }>(client, "cleanup_things");
  assertEquals(result?.count, 3);
});
