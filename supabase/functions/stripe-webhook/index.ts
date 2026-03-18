import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PRICE_TO_PLAN: Record<string, string> = {
  // Licensed prices (current)
  "price_1TCQeZIF4fHxJpjH7w0wOhaf": "pro",
  "price_1TCQf0IF4fHxJpjH4Bx2aIbg": "business",
  // Metered prices (legacy)
  "price_1TC52fIF4fHxJpjHPaJXH14r": "pro",
  "price_1TCPcjIF4fHxJpjHWtZucdwy": "business",
  // Legacy prices (backward compat)
  "price_1TB0QgIF4fHxJpjHoIlCeHP6": "pro",
  "price_1TB0QgIF4fHxJpjH032DMzZH": "business",
};

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

        // Update workspace plan_tier
        const { error: wsError } = await supabaseAdmin
          .from("workspaces")
          .update({ plan_tier: planTier })
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

        const { error: wsError } = await supabaseAdmin
          .from("workspaces")
          .update({ plan_tier: planTier })
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
          .update({ plan_tier: "pulse" })
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
