import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";
import { safeMaybeQuery, safeQuery } from "../_shared/safeSupabase.ts";
import {
  LEGACY_ADDON_INCLUDED_HOURS,
  V2_ADDON_INCLUDED_HOURS,
  V2_BOT_ADDON_PRICE_IDS,
  type BillingCycle,
  cycleFromV2Price,
  findBotAddonItem,
  findSeatItem,
  type StripeSubscription,
  stripeFetch,
} from "../_shared/stripeV2.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  workspace_id: z.string().uuid(),
  /** Modelo legado: add-on por liderado. */
  member_id: z.string().uuid().optional(),
  /** Modelo v3: add-on do líder (default = quem chamou, se for líder). */
  leader_user_id: z.string().uuid().optional(),
  action: z.enum(["activate", "deactivate"]),
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const { workspace_id, member_id, action } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // ---- Ownership chain: owner do workspace, HR Admin OU o próprio líder ----
    const workspace = await safeMaybeQuery<
      {
        id: string;
        owner_id: string;
        hr_admin_ids: string[] | null;
        billing_model: string | null;
      }
    >(
      admin
        .from("workspaces")
        .select("id, owner_id, hr_admin_ids, billing_model")
        .eq("id", workspace_id)
        .maybeSingle(),
    );
    if (!workspace) return json({ error: "Workspace não encontrado" }, 404);

    const isLegacy = (workspace.billing_model ?? "legacy") !== "v3";
    const leaderUserId = parsed.data.leader_user_id ?? user.id;

    const leaderTeam = await safeMaybeQuery<{ id: string }>(
      admin
        .from("teams")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("leader_user_id", leaderUserId)
        .limit(1)
        .maybeSingle(),
    );

    const isOwnerOrHr = workspace.owner_id === user.id ||
      (workspace.hr_admin_ids ?? []).includes(user.id);
    const isSelfLeader = leaderUserId === user.id && !!leaderTeam;
    if (!isOwnerOrHr && !isSelfLeader) {
      return json({ error: "Sem permissão neste workspace" }, 403);
    }

    if (isLegacy) {
      if (!member_id) return json({ error: "member_id é obrigatório no plano legado" }, 400);
      const member = await safeMaybeQuery<{ id: string }>(
        admin
          .from("team_members")
          .select("id")
          .eq("id", member_id)
          .eq("workspace_id", workspace_id)
          .maybeSingle(),
      );
      if (!member) return json({ error: "Liderado não encontrado neste workspace" }, 404);
    } else if (!leaderTeam) {
      return json({ error: "Líder não encontrado neste workspace" }, 404);
    }

    // ---- Assinatura Stripe ativa do workspace ----
    const subRow = await safeMaybeQuery<{ stripe_subscription_id: string | null; status: string }>(
      admin
        .from("subscriptions")
        .select("stripe_subscription_id, status")
        .eq("workspace_id", workspace_id)
        .maybeSingle(),
    );

    if (
      !subRow?.stripe_subscription_id ||
      !["active", "trialing", "past_due"].includes(subRow.status)
    ) {
      return json(
        {
          error: "no_subscription",
          message:
            "Este workspace ainda não tem uma assinatura ativa. Assine os assentos antes de ativar o add-on de bot.",
        },
        409,
      );
    }

    const subscriptionId = subRow.stripe_subscription_id;
    const sub = await stripeFetch<StripeSubscription>(`/subscriptions/${subscriptionId}`);
    const cycle: BillingCycle = cycleFromV2Price(findSeatItem(sub)?.price?.id) ?? "monthly";
    const addonItem = findBotAddonItem(sub);
    const currentQty = addonItem?.quantity ?? 0;
    const includedHours = isLegacy ? LEGACY_ADDON_INCLUDED_HOURS : V2_ADDON_INCLUDED_HOURS;

    // Linhas ativas atuais (fonte de verdade local)
    const activeRows = await safeQuery<
      { id: string; member_id: string | null; leader_user_id: string | null }[]
    >(
      admin
        .from("seat_addons")
        .select("id, member_id, leader_user_id")
        .eq("workspace_id", workspace_id)
        .eq("addon_type", "bot")
        .eq("status", "active"),
    );

    const matchesTarget = (r: { member_id: string | null; leader_user_id: string | null }) =>
      isLegacy ? r.member_id === member_id : r.leader_user_id === leaderUserId;
    const alreadyActive = activeRows.some(matchesTarget);

    if (action === "activate") {
      if (alreadyActive) {
        return json({ ok: true, unchanged: true, addon_quantity: currentQty });
      }

      // No v3 a quantidade é sempre 1 por líder.
      const targetQty = isLegacy
        ? Math.max(activeRows.length + 1, currentQty + 1)
        : Math.max(activeRows.length + 1, 1);
      let itemId = addonItem?.id;

      if (itemId) {
        await stripeFetch(`/subscription_items/${itemId}`, {
          method: "POST",
          body: new URLSearchParams({
            quantity: String(targetQty),
            proration_behavior: "create_prorations",
          }),
        });
      } else {
        const created = await stripeFetch<{ id: string }>("/subscription_items", {
          method: "POST",
          body: new URLSearchParams({
            subscription: subscriptionId,
            price: V2_BOT_ADDON_PRICE_IDS[cycle],
            quantity: String(targetQty),
            proration_behavior: "create_prorations",
          }),
        });
        itemId = created.id;
      }

      // Reativa linha cancelada do mesmo alvo, se existir; senão insere.
      const existingQuery = admin
        .from("seat_addons")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("addon_type", "bot")
        .neq("status", "active")
        .limit(1);

      const existing = await safeMaybeQuery<{ id: string }>(
        (isLegacy
          ? existingQuery.eq("member_id", member_id!)
          : existingQuery.eq("leader_user_id", leaderUserId)
        ).maybeSingle(),
      );

      if (existing) {
        await safeQuery(
          admin
            .from("seat_addons")
            .update({
              status: "active",
              billing_cycle: cycle,
              included_hours: includedHours,
              stripe_subscription_item_id: itemId,
            })
            .eq("id", existing.id)
            .select("id"),
        );
      } else {
        await safeQuery(
          admin
            .from("seat_addons")
            .insert({
              workspace_id,
              member_id: isLegacy ? member_id : null,
              leader_user_id: isLegacy ? null : leaderUserId,
              addon_type: "bot",
              status: "active",
              billing_cycle: cycle,
              included_hours: includedHours,
              stripe_subscription_item_id: itemId,
            })
            .select("id"),
        );
      }

      return json({ ok: true, action, addon_quantity: targetQty, subscription_item_id: itemId });
    }

    // ---- deactivate ----
    if (!alreadyActive) {
      return json({ ok: true, unchanged: true, addon_quantity: currentQty });
    }

    const targetQty = Math.max(0, Math.min(activeRows.length - 1, Math.max(currentQty - 1, 0)));

    if (addonItem) {
      if (targetQty === 0) {
        await stripeFetch(`/subscription_items/${addonItem.id}`, {
          method: "DELETE",
          body: new URLSearchParams({ proration_behavior: "create_prorations" }),
        });
      } else {
        await stripeFetch(`/subscription_items/${addonItem.id}`, {
          method: "POST",
          body: new URLSearchParams({
            quantity: String(targetQty),
            proration_behavior: "create_prorations",
          }),
        });
      }
    }

    const cancelQuery = admin
      .from("seat_addons")
      .update({ status: "canceled", stripe_subscription_item_id: null })
      .eq("workspace_id", workspace_id)
      .eq("addon_type", "bot")
      .eq("status", "active");

    await safeQuery(
      (isLegacy
        ? cancelQuery.eq("member_id", member_id!)
        : cancelQuery.eq("leader_user_id", leaderUserId)
      ).select("id"),
    );

    return json({ ok: true, action, addon_quantity: targetQty });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[toggle-seat-addon] error", message);
    return json({ error: message }, 500);
  }
});
