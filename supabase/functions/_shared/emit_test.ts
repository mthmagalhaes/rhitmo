// Onda 4.2 — Testes do Event Bus emit helper

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { emit } from "./emit.ts";

function makeClient(captured: { row?: Record<string, unknown> }) {
  return {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        captured.row = { ...row, __table: table };
        return Promise.resolve({ data: row, error: null });
      },
    }),
  } as any;
}

Deno.test("emit — insere row na tabela events com payload normalizado", async () => {
  const captured: { row?: Record<string, unknown> } = {};
  const client = makeClient(captured);
  await emit(client, {
    type: "feedback.shared",
    workspace_id: "ws-1",
    target_user_id: "user-1",
    channels: ["email", "inapp"],
    payload: { feedback_id: "fb-1" },
  });
  assertEquals(captured.row?.__table, "events");
  assertEquals(captured.row?.type, "feedback.shared");
  assertEquals((captured.row?.channels as string[])?.length, 2);
});

Deno.test("emit — rejeita type vazio", async () => {
  const client = makeClient({});
  await assertRejects(
    () =>
      emit(client, {
        type: "" as any,
        workspace_id: "ws",
        channels: ["inapp"],
        payload: {},
      }),
    Error,
  );
});

Deno.test("emit — rejeita channels vazios", async () => {
  const client = makeClient({});
  await assertRejects(
    () =>
      emit(client, {
        type: "feedback.shared",
        workspace_id: "ws",
        channels: [] as any,
        payload: {},
      }),
    Error,
  );
});
