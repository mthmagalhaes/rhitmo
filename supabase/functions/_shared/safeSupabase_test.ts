// Onda 4.2 — Testes do safeSupabase wrapper

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { safeRpc, safeFunctionInvoke, SafeSupabaseError } from "./safeSupabase.ts";

// Mock cliente Supabase mínimo
function makeClient(opts: {
  rpcResult?: { data?: unknown; error?: { message: string; code?: string } | null };
  invokeResult?: { data?: unknown; error?: { message: string } | null };
}) {
  return {
    rpc: (_name: string, _args?: Record<string, unknown>) =>
      Promise.resolve(opts.rpcResult ?? { data: null, error: null }),
    functions: {
      invoke: (_name: string, _opts?: unknown) =>
        Promise.resolve(opts.invokeResult ?? { data: null, error: null }),
    },
  } as any;
}

Deno.test("safeRpc — sucesso retorna data", async () => {
  const client = makeClient({ rpcResult: { data: { ok: true }, error: null } });
  const data = await safeRpc<{ ok: boolean }>(client, "any_rpc");
  assertEquals(data.ok, true);
});

Deno.test("safeRpc — erro lança SafeSupabaseError tipado", async () => {
  const client = makeClient({
    rpcResult: { data: null, error: { message: "permission denied", code: "42501" } },
  });
  await assertRejects(
    () => safeRpc(client, "any_rpc"),
    SafeSupabaseError,
    "any_rpc",
  );
});

Deno.test("safeFunctionInvoke — sucesso retorna data", async () => {
  const client = makeClient({ invokeResult: { data: { hello: "world" }, error: null } });
  const data = await safeFunctionInvoke<{ hello: string }>(client, "fn", {});
  assertEquals(data.hello, "world");
});

Deno.test("safeFunctionInvoke — erro lança SafeSupabaseError", async () => {
  const client = makeClient({
    invokeResult: { data: null, error: { message: "boom" } },
  });
  await assertRejects(
    () => safeFunctionInvoke(client, "fn", {}),
    SafeSupabaseError,
  );
});
