import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Testes do roteamento do ai-router. Validamos a forma da decisão sem
// precisar subir Deno.serve nem ter LOVABLE_API_KEY. Replica a lógica
// de roteamento minimamente (mantenha em sincronia com index.ts).

type TaskHandler = (input: any, ctx: { userId: string }) => Promise<unknown>;

const TASKS: Record<string, TaskHandler> = {
  summarize_text: async (input: any) => ({ echoed: input?.text ?? "" }),
};

interface RouteResult { status: number; body: any; }

async function route(req: { method: string; auth?: string | null; body?: any }): Promise<RouteResult> {
  if (req.method === "OPTIONS") return { status: 200, body: null };
  if (req.method !== "POST") return { status: 405, body: { ok: false, error: "Method not allowed" } };
  if (!req.auth) return { status: 401, body: { ok: false, error: "Missing authorization" } };

  const body = req.body;
  if (!body || typeof body !== "object") return { status: 400, body: { ok: false, error: "Invalid JSON" } };
  const task = body.task;
  if (!task || typeof task !== "string") return { status: 400, body: { ok: false, error: "Missing 'task' field" } };

  const handler = TASKS[task];
  if (!handler) return { status: 400, body: { ok: false, error: `Unknown task: ${task}`, available: Object.keys(TASKS) } };

  try {
    const result = await handler(body.input ?? {}, { userId: "test-user" });
    return { status: 200, body: { ok: true, result } };
  } catch (err) {
    return { status: 500, body: { ok: false, error: (err as Error).message } };
  }
}

Deno.test("sem Authorization retorna 401", async () => {
  const r = await route({ method: "POST", auth: null, body: { task: "summarize_text" } });
  assertEquals(r.status, 401);
});

Deno.test("método não-POST retorna 405", async () => {
  const r = await route({ method: "GET", auth: "Bearer x", body: {} });
  assertEquals(r.status, 405);
});

Deno.test("body sem task retorna 400", async () => {
  const r = await route({ method: "POST", auth: "Bearer x", body: { input: {} } });
  assertEquals(r.status, 400);
  assert(r.body.error.includes("Missing 'task'"));
});

Deno.test("task desconhecida retorna 400 com lista available", async () => {
  const r = await route({ method: "POST", auth: "Bearer x", body: { task: "nonexistent" } });
  assertEquals(r.status, 400);
  assert(Array.isArray(r.body.available));
  assert(r.body.available.includes("summarize_text"));
});

Deno.test("task válida roteia para handler e retorna ok:true", async () => {
  const r = await route({ method: "POST", auth: "Bearer x", body: { task: "summarize_text", input: { text: "hello" } } });
  assertEquals(r.status, 200);
  assertEquals(r.body.ok, true);
  assertEquals((r.body.result as any).echoed, "hello");
});
