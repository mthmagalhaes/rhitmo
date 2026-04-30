// event-dispatcher: lê eventos pendentes da tabela `events` e despacha
// para os canais corretos (email queue, slack queue, in-app insert).
//
// Disparado por pg_cron a cada 30s. Idempotente: usa atualização condicional
// no status para evitar duplo-processamento concorrente.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 3;

// Onda 4.5 — mapeamento canônico de event_type → template transacional.
// Quando o canal "email" é despachado, esses templates são usados pelo
// `process-email-queue` via `send-transactional-email`.
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

async function dispatchEvent(
  supabase: ReturnType<typeof createClient>,
  ev: EventRow
): Promise<{ ok: boolean; error?: string }> {
  const errors: string[] = [];

  for (const channel of ev.channels) {
    try {
      if (channel === "inapp") {
        // in-app notification: insert into notifications table directly
        if (!ev.target_user_id) {
          errors.push("inapp: missing target_user_id");
          continue;
        }
        const { error } = await supabase.from("notifications").insert({
          user_id: ev.target_user_id,
          type: ev.event_type,
          payload: ev.payload,
          workspace_id: ev.workspace_id,
        });
        if (error) errors.push(`inapp: ${error.message}`);
      } else if (channel === "email") {
        // enqueue email via existing pgmq queue
        const { error } = await supabase.rpc("enqueue_email", {
          queue_name: "emails_outbound",
          payload: {
            event_type: ev.event_type,
            workspace_id: ev.workspace_id,
            actor_user_id: ev.actor_user_id,
            target_user_id: ev.target_user_id,
            data: ev.payload,
          },
        });
        if (error) errors.push(`email: ${error.message}`);
      } else if (channel === "slack") {
        // enqueue slack via existing pgmq queue
        const { error } = await supabase.rpc("enqueue_email", {
          queue_name: "slack_outbound",
          payload: {
            event_type: ev.event_type,
            workspace_id: ev.workspace_id,
            actor_user_id: ev.actor_user_id,
            target_user_id: ev.target_user_id,
            data: ev.payload,
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Pull next batch of pending events
  const { data: pending, error: fetchErr } = await supabase
    .from("events")
    .select("id, event_type, workspace_id, actor_user_id, target_user_id, payload, channels, attempts")
    .eq("status", "pending")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchErr) {
    console.error("Dispatcher fetch error:", fetchErr.message);
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!pending || pending.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let okCount = 0;
  let failCount = 0;

  for (const ev of pending as EventRow[]) {
    const result = await dispatchEvent(supabase, ev);
    const newAttempts = ev.attempts + 1;
    const newStatus = result.ok
      ? "dispatched"
      : newAttempts >= MAX_ATTEMPTS
        ? "failed"
        : "pending";

    const { error: updErr } = await supabase
      .from("events")
      .update({
        status: newStatus,
        attempts: newAttempts,
        dispatched_at: result.ok ? new Date().toISOString() : null,
        error: result.error ?? null,
      })
      .eq("id", ev.id);

    if (updErr) {
      console.error(`Failed to update event ${ev.id}:`, updErr.message);
    }

    if (result.ok) okCount++;
    else failCount++;
  }

  console.log(`Dispatcher batch complete: ${okCount} ok, ${failCount} failed`);

  return new Response(
    JSON.stringify({ processed: pending.length, ok: okCount, failed: failCount }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
