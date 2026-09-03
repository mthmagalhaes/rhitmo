import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  V2_ADDON_INCLUDED_HOURS,
  cycleFromV2Price,
  isV2BotAddonPrice,
  isV2SeatPrice,
} from "../_shared/stripeV2.ts";

/**
 * Backstop: reconcilia `seat_addons` com a quantidade de add-ons de bot
 * presentes na assinatura Stripe. O toggle-seat-addon é o caminho normal,
 * mas mudanças feitas direto no Stripe também precisam refletir aqui.
 */
async function syncV2SeatAddons(
  admin: SupabaseClient,
  workspaceId: string,
  // deno-lint-ignore no-explicit-any
  items: any[],
) {
  const hasV2Seat = items.some((i) => isV2SeatPrice(i?.price?.id));
  const addonItem = items.find((i) => isV2BotAddonPrice(i?.price?.id));
  if (!hasV2Seat && !addonItem) return; // assinatura v1: não mexe em nada

  const targetQty = addonItem?.quantity ?? 0;
  const cycle = cycleFromV2Price(addonItem?.price?.id) ??
    cycleFromV2Price(items.find((i) => isV2SeatPrice(i?.price?.id))?.price?.id) ??
    "monthly";

  const { data: active, error } = await admin
    .from("seat_addons")
    .select("id, member_id, created_at")
    .eq("workspace_id", workspaceId)
    .eq("addon_type", "bot")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[syncV2SeatAddons] select error", error);
    return;
  }

  const rows = active ?? [];

  if (rows.length > targetQty) {
    // Sobra local: cancela as linhas mais recentes.
    const toCancel = rows.slice(targetQty).map((r) => r.id);
    const { error: cancelErr } = await admin
      .from("seat_addons")
      .update({ status: "canceled", stripe_subscription_item_id: null })
      .in("id", toCancel);
    if (cancelErr) console.error("[syncV2SeatAddons] cancel error", cancelErr);
  } else if (rows.length < targetQty) {
    // Falta local (add-on adicionado direto no Stripe): cria linhas sem
    // membro atribuído, para o líder alocar depois em /v2/billing.
    const missing = Array.from({ length: targetQty - rows.length }, () => ({
      workspace_id: workspaceId,
      member_id: null,
      addon_type: "bot",
      status: "active",
      billing_cycle: cycle,
      included_hours: V2_ADDON_INCLUDED_HOURS,
      stripe_subscription_item_id: addonItem?.id ?? null,
    }));
    const { error: insErr } = await admin.from("seat_addons").insert(missing);
    if (insErr) console.error("[syncV2SeatAddons] insert error", insErr);
  }

  if (targetQty > 0 && addonItem?.id) {
    const { error: itemErr } = await admin
      .from("seat_addons")
      .update({ stripe_subscription_item_id: addonItem.id, billing_cycle: cycle })
      .eq("workspace_id", workspaceId)
      .eq("addon_type", "bot")
      .eq("status", "active");
    if (itemErr) console.error("[syncV2SeatAddons] item update error", itemErr);
  }
}


// Mapeamento de price IDs Stripe → tier no DB.
// IMPORTANTE: preços "business" são mantidos APENAS para grandfathering de
// clientes legados (ex: Faster Ops). Novos checkouts usam exclusivamente os
// 3 preços Pro (quarterly/semiannual/annual). Manter o tier "business" no DB
// preserva acesso a HR Dashboard + assisted onboarding desses clientes
// fundadores, sem cobrança extra e sem ação requerida deles.
// Per-seat (Windmill v3) — preços novos
const SEAT_PRICE_MONTHLY = "price_1TUqnLIF4fHxJpjH3WthrrBs";
const SEAT_PRICE_ANNUAL = "price_1TUqnmIF4fHxJpjHG44CIrIL";

const PRICE_TO_PLAN: Record<string, string> = {
  // === Per-seat (Windmill v3) ===
  [SEAT_PRICE_MONTHLY]: "pro",
  [SEAT_PRICE_ANNUAL]: "pro",
  // === Legacy Pro (mantido só para webhooks tardios) ===
  "price_1TNNnEIF4fHxJpjHA4cMp1tm": "pro",
  "price_1TNNnXIF4fHxJpjH6uHkOIIJ": "pro",
  "price_1TNNnlIF4fHxJpjHfVwPUqAb": "pro",
  "price_1TCQeZIF4fHxJpjH7w0wOhaf": "pro",
  "price_1TC52fIF4fHxJpjHPaJXH14r": "pro",
  "price_1TB0QgIF4fHxJpjHoIlCeHP6": "pro",
  // === Business legado (grandfathering) ===
  "price_1TCQf0IF4fHxJpjH4Bx2aIbg": "business",
  "price_1TCPcjIF4fHxJpjHWtZucdwy": "business",
  "price_1TB0QgIF4fHxJpjH032DMzZH": "business",
};

function priceToCycle(priceId: string | undefined): "monthly" | "annual" | null {
  if (priceId === SEAT_PRICE_MONTHLY) return "monthly";
  if (priceId === SEAT_PRICE_ANNUAL) return "annual";
  return null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

async function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const parts = signature.split(",");
  const timestamp = parts.find((p) => p.startsWith("t="))?.split("=")[1];
  const v1Sig = parts.find((p) => p.startsWith("v1="))?.split("=")[1];

  if (!timestamp || !v1Sig) return false;

  // Check timestamp tolerance (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  const payload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expectedSig = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedSig === v1Sig;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
      console.error("Missing signature or webhook secret");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isValid = await verifyStripeSignature(body, signature, webhookSecret);
    if (!isValid) {
      console.error("Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(body);
    console.log("Stripe event:", event.type);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const workspaceId = session.metadata?.workspace_id;
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        if (!workspaceId || !subscriptionId) {
          console.error("Missing workspace_id or subscription in session");
          break;
        }

        // Fetch subscription details from Stripe
        const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
        const subRes = await fetch(
          `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
          { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } }
        );
        const sub = await subRes.json();

        const priceId = sub.items?.data?.[0]?.price?.id;
        const planTier = PRICE_TO_PLAN[priceId] || "pro";
        const quantity = sub.items?.data?.[0]?.quantity || 1;

        // Upsert subscription
        const { error: subError } = await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              workspace_id: workspaceId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              stripe_price_id: priceId,
              plan_tier: planTier,
              status: sub.status === "trialing" ? "trialing" : "active",
              quantity,
              trial_ends_at: sub.trial_end
                ? new Date(sub.trial_end * 1000).toISOString()
                : null,
              current_period_end: sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null,
            },
            { onConflict: "workspace_id" }
          );

        if (subError) console.error("Upsert subscription error:", subError);

        // Update workspace plan_tier + per-seat fields
        const seatCycle = priceToCycle(priceId);
        const wsUpdate: Record<string, unknown> = { plan_tier: planTier };
        if (seatCycle) {
          wsUpdate.paid_seats = quantity;
          wsUpdate.seat_cycle = seatCycle;
        }
        const { error: wsError } = await supabaseAdmin
          .from("workspaces")
          .update(wsUpdate)
          .eq("id", workspaceId);

        if (wsError) console.error("Update workspace error:", wsError);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const workspaceId = sub.metadata?.workspace_id;

        if (!workspaceId) {
          console.error("Missing workspace_id in subscription metadata");
          break;
        }

        const priceId = sub.items?.data?.[0]?.price?.id;
        const planTier = PRICE_TO_PLAN[priceId] || "pro";
        const quantity = sub.items?.data?.[0]?.quantity || 1;

        const { error: subError } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: sub.status,
            plan_tier: planTier,
            stripe_price_id: priceId,
            quantity,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            trial_ends_at: sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString()
              : null,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          })
          .eq("workspace_id", workspaceId);

        if (subError) console.error("Update subscription error:", subError);

        const seatCycleU = priceToCycle(priceId);
        const wsUpdateU: Record<string, unknown> = { plan_tier: planTier };
        if (seatCycleU) {
          wsUpdateU.paid_seats = quantity;
          wsUpdateU.seat_cycle = seatCycleU;
        }
        const { error: wsError } = await supabaseAdmin
          .from("workspaces")
          .update(wsUpdateU)
          .eq("id", workspaceId);

        if (wsError) console.error("Update workspace error:", wsError);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const workspaceId = sub.metadata?.workspace_id;

        if (!workspaceId) break;

        const { error: subError } = await supabaseAdmin
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("workspace_id", workspaceId);

        if (subError) console.error("Cancel subscription error:", subError);

        const { error: wsError } = await supabaseAdmin
          .from("workspaces")
          .update({ plan_tier: "pulse", paid_seats: 0, seat_cycle: "monthly" })
          .eq("id", workspaceId);

        if (wsError) console.error("Update workspace error:", wsError);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (!subscriptionId) break;

        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) console.error("Update past_due error:", error);
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
