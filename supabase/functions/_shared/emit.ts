// Event Bus emitter — shared helper for edge functions to enqueue
// notification events. The event-dispatcher edge function (or pg_cron-driven
// loop) reads these and fans them out to email/slack/in-app channels.
//
// Usage from any edge function:
//   import { emit } from "../_shared/emit.ts";
//   await emit(supabaseAdmin, {
//     type: "feedback.shared",
//     workspace_id,
//     actor_user_id,
//     target_user_id: member.linked_user_id,
//     channels: ["email", "inapp"],
//     payload: { feedback_id, summary }
//   });

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type EventChannel = "email" | "slack" | "inapp";

export interface EmitArgs {
  type: string;                       // ex: "feedback.shared", "review.acknowledged"
  workspace_id?: string | null;
  actor_user_id?: string | null;
  target_user_id?: string | null;
  channels: EventChannel[];
  payload?: Record<string, unknown>;
}

export async function emit(
  supabaseAdmin: SupabaseClient,
  args: EmitArgs
): Promise<{ id: string } | null> {
  if (!args.type) {
    console.error("emit() called without event type");
    return null;
  }
  if (!args.channels?.length) {
    console.warn(`emit() ${args.type} called with no channels — skipping`);
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("events")
    .insert({
      event_type: args.type,
      workspace_id: args.workspace_id ?? null,
      actor_user_id: args.actor_user_id ?? null,
      target_user_id: args.target_user_id ?? null,
      channels: args.channels,
      payload: args.payload ?? {},
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error(`emit() failed for ${args.type}:`, error.message);
    return null;
  }

  console.log(`emit() ${args.type} → event ${data.id} (channels: ${args.channels.join(",")})`);
  return { id: data.id as string };
}
