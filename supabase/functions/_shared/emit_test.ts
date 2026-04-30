// Onda 4.2 — Testes do Event Bus emit helper

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { emit } from "./emit.ts";

interface CapturedInsert {
  table?: string;
  row?: Record<string, unknown>;
}

function makeClient(captured: CapturedInsert, opts?: { failInsert?: boolean }) {
  return {
    from: (table: string) => {
      captured.table = table;
      return {
        insert: (row: Record<string, unknown>) => {
          captured.row = row;
          return {
            select: (_cols: string) => ({
              single: () =>
                Promise.resolve(
                  opts?.failInsert
                    ? { data: null, error: { message: "insert failed" } }
                    : { data: { id: "evt-123" }, error: null },
                ),
            }),
          };
        },
      };
    },
  } as any;
}

Deno.test("emit — insere row em events com payload normalizado", async () => {
  const captured: CapturedInsert = {};
  const client = makeClient(captured);
  const result = await emit(client, {
    type: "feedback.shared",
    workspace_id: "ws-1",
    target_user_id: "user-1",
    channels: ["email", "inapp"],
    payload: { feedback_id: "fb-1" },
  });
  assertEquals(captured.table, "events");
  assertEquals(captured.row?.event_type, "feedback.shared");
  assertEquals((captured.row?.channels as string[]).length, 2);
  assertEquals(captured.row?.status, "pending");
  assertEquals(result?.id, "evt-123");
});

Deno.test("emit — type vazio retorna null sem inserir", async () => {
  const captured: CapturedInsert = {};
  const client = makeClient(captured);
  const result = await emit(client, {
    type: "",
    workspace_id: "ws",
    channels: ["inapp"],
    payload: {},
  });
  assertEquals(result, null);
  assertEquals(captured.row, undefined);
});

Deno.test("emit — channels vazios retorna null sem inserir", async () => {
  const captured: CapturedInsert = {};
  const client = makeClient(captured);
  const result = await emit(client, {
    type: "feedback.shared",
    workspace_id: "ws",
    channels: [],
    payload: {},
  });
  assertEquals(result, null);
  assertEquals(captured.row, undefined);
});

Deno.test("emit — erro do insert retorna null silenciosamente", async () => {
  const captured: CapturedInsert = {};
  const client = makeClient(captured, { failInsert: true });
  const result = await emit(client, {
    type: "review.shared",
    workspace_id: "ws",
    channels: ["email"],
    payload: {},
  });
  assertEquals(result, null);
  // mas o insert foi chamado
  assert(captured.row !== undefined);
});
