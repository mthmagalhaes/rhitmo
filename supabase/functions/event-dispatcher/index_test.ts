import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Testes unitários do dispatchEvent (Onda 4.5).
// Para evitar dependência de servidor HTTP/Deno.serve, replicamos a lógica
// exata do dispatchEvent num módulo testável (mesmo arquivo abaixo).
// Em paralelo, validamos o mapa EVENT_EMAIL_TEMPLATE pelos casos canônicos.

const EVENT_EMAIL_TEMPLATE: Record<string, string> = {
  "feedback.shared": "feedback-shared",
  "review.shared": "review-shared",
};

interface EventRow {
  id: string;
  event_type: string;
  workspace_id: string | null;
  actor_user_id: string | null;
  target_user_id: string | null;
  payload: Record<string, unknown>;
  channels: string[];
  attempts: number;
}

type Calls = {
  notificationsInsert: any[];
  invokes: Array<{ fn: string; body: any }>;
  enqueues: Array<{ name: string; payload: any }>;
};

function makeMockSupabase(opts: {
  notificationsError?: string;
  invokeError?: string;
  enqueueError?: string;
  userEmail?: string | null;
} = {}) {
  const calls: Calls = { notificationsInsert: [], invokes: [], enqueues: [] };
  const supabase: any = {
    from(table: string) {
      return {
        insert: (row: any) => {
          if (table === "notifications") {
            calls.notificationsInsert.push(row);
            return Promise.resolve({ error: opts.notificationsError ? { message: opts.notificationsError } : null });
          }
          return Promise.resolve({ error: null });
        },
      };
    },
    rpc: (name: string, payload: any) => {
      calls.enqueues.push({ name, payload });
      return Promise.resolve({ error: opts.enqueueError ? { message: opts.enqueueError } : null });
    },
    functions: {
      invoke: (fn: string, args: any) => {
        calls.invokes.push({ fn, body: args?.body });
        return Promise.resolve({ error: opts.invokeError ? { message: opts.invokeError } : null });
      },
    },
    auth: {
      admin: {
        getUserById: (_id: string) => Promise.resolve({
          data: { user: opts.userEmail !== undefined ? { email: opts.userEmail } : null },
        }),
      },
    },
  };
  return { supabase, calls };
}

// Replica a função real (extraída pra teste — mantenha em sincronia com index.ts)
async function dispatchEvent(supabase: any, ev: EventRow): Promise<{ ok: boolean; error?: string }> {
  const errors: string[] = [];
  for (const channel of ev.channels) {
    try {
      if (channel === "inapp") {
        if (!ev.target_user_id) { errors.push("inapp: missing target_user_id"); continue; }
        const { error } = await supabase.from("notifications").insert({
          user_id: ev.target_user_id, type: ev.event_type, payload: ev.payload, workspace_id: ev.workspace_id,
        });
        if (error) errors.push(`inapp: ${error.message}`);
      } else if (channel === "email") {
        const templateName = EVENT_EMAIL_TEMPLATE[ev.event_type];
        if (!templateName) { errors.push(`email: no template registered for ${ev.event_type}`); continue; }
        let recipientEmail = (ev.payload as any)?.recipient_email as string | undefined;
        if (!recipientEmail && ev.target_user_id) {
          const { data: userInfo } = await supabase.auth.admin.getUserById(ev.target_user_id);
          recipientEmail = userInfo?.user?.email ?? undefined;
        }
        if (!recipientEmail) { errors.push("email: missing recipient (no payload.recipient_email and target_user has no email)"); continue; }
        const { error } = await supabase.functions.invoke("send-transactional-email", {
          body: { templateName, recipientEmail, idempotencyKey: `event-${ev.id}-email`, templateData: ev.payload },
        });
        if (error) errors.push(`email: ${(error as any)?.message ?? error}`);
      } else if (channel === "slack") {
        const { error } = await supabase.rpc("enqueue_email", {
          queue_name: "slack_outbound",
          payload: {
            event_type: ev.event_type, workspace_id: ev.workspace_id,
            actor_user_id: ev.actor_user_id, target_user_id: ev.target_user_id, data: ev.payload,
          },
        });
        if (error) errors.push(`slack: ${error.message}`);
      } else {
        errors.push(`unknown channel: ${channel}`);
      }
    } catch (e) {
      errors.push(`${channel}: ${(e as Error).message}`);
    }
  }
  return errors.length === 0 ? { ok: true } : { ok: false, error: errors.join("; ") };
}

const baseEv = (over: Partial<EventRow> = {}): EventRow => ({
  id: "evt-1",
  event_type: "feedback.shared",
  workspace_id: "ws-1",
  actor_user_id: "user-1",
  target_user_id: "user-2",
  payload: { recipient_email: "test@example.com", memberName: "Maria" },
  channels: ["inapp"],
  attempts: 0,
  ...over,
});

Deno.test("inapp com target_user_id insere notification e marca ok", async () => {
  const { supabase, calls } = makeMockSupabase();
  const r = await dispatchEvent(supabase, baseEv());
  assertEquals(r.ok, true);
  assertEquals(calls.notificationsInsert.length, 1);
  assertEquals(calls.notificationsInsert[0].user_id, "user-2");
});

Deno.test("inapp sem target_user_id reporta erro descritivo", async () => {
  const { supabase } = makeMockSupabase();
  const r = await dispatchEvent(supabase, baseEv({ target_user_id: null }));
  assertEquals(r.ok, false);
  assert(r.error?.includes("missing target_user_id"));
});

Deno.test("multi-canal email+inapp invoca send-transactional-email + insert", async () => {
  const { supabase, calls } = makeMockSupabase();
  const r = await dispatchEvent(supabase, baseEv({ channels: ["inapp", "email"] }));
  assertEquals(r.ok, true);
  assertEquals(calls.notificationsInsert.length, 1);
  assertEquals(calls.invokes.length, 1);
  assertEquals(calls.invokes[0].fn, "send-transactional-email");
  assertEquals(calls.invokes[0].body.templateName, "feedback-shared");
  assertEquals(calls.invokes[0].body.recipientEmail, "test@example.com");
});

Deno.test("email com event_type sem template retorna erro", async () => {
  const { supabase } = makeMockSupabase();
  const r = await dispatchEvent(supabase, baseEv({ event_type: "unknown.thing", channels: ["email"] }));
  assertEquals(r.ok, false);
  assert(r.error?.includes("no template registered"));
});

Deno.test("email sem recipient_email busca via auth.admin", async () => {
  const { supabase, calls } = makeMockSupabase({ userEmail: "fallback@example.com" });
  const r = await dispatchEvent(supabase, baseEv({ channels: ["email"], payload: { memberName: "X" } }));
  assertEquals(r.ok, true);
  assertEquals(calls.invokes[0].body.recipientEmail, "fallback@example.com");
});

Deno.test("slack invoca enqueue_email no slack_outbound", async () => {
  const { supabase, calls } = makeMockSupabase();
  const r = await dispatchEvent(supabase, baseEv({ event_type: "review.shared", channels: ["slack"] }));
  assertEquals(r.ok, true);
  assertEquals(calls.enqueues[0].name, "enqueue_email");
  assertEquals(calls.enqueues[0].payload.queue_name, "slack_outbound");
});

Deno.test("erro no canal inapp é reportado mas não throw", async () => {
  const { supabase } = makeMockSupabase({ notificationsError: "db down" });
  const r = await dispatchEvent(supabase, baseEv());
  assertEquals(r.ok, false);
  assert(r.error?.includes("db down"));
});
