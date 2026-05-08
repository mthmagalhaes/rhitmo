import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================================
// update-subscription — sincroniza quantity/cycle da subscription per-seat.
// Body opcional:
//   { action: 'sync_seats' }            → recalcula quantity por team_members
//   { action: 'change_cycle', seatCycle: 'monthly'|'annual' } → muda o ciclo
// Workspaces grandfathered são no-op.
// ============================================================================
const FREE_SEATS = 3;
const SEAT_PRICE_IDS: Record<"monthly" | "annual", string> = {
  monthly: "price_1TUqnLIF4fHxJpjH3WthrrBs",
  annual: "price_1TUqnmIF4fHxJpjHG44CIrIL",
};
type SeatCycle = keyof typeof SEAT_PRICE_IDS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action: "sync_seats" | "change_cycle" =
      body.action ?? (body.seatCycle ? "change_cycle" : "sync_seats");
    const newCycleRaw = (body.seatCycle ?? body.cycle) as SeatCycle | undefined;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: workspace, error: wsError } = await supabaseAdmin
      .from("workspaces")
      .select("id, grandfather_until, paid_seats, seat_cycle")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (wsError || !workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const grandfatherUntil = (workspace as any).grandfather_until as string | null;
    const isGrandfathered = !!grandfatherUntil && new Date(grandfatherUntil) >= new Date(new Date().toDateString());
    if (isGrandfathered) {
      return new Response(
        JSON.stringify({ noop: true, reason: "grandfathered", grandfather_until: grandfatherUntil }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("workspace_id", workspace.id)
      .in("status", ["trialing", "active", "past_due"])
      .maybeSingle();

    if (!subscription?.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ noop: true, reason: "no_active_subscription" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
    const stripeSubId = subscription.stripe_subscription_id;

    const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${stripeSubId}`, {
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    const stripeSub = await subRes.json();
    if (stripeSub.error) {
      return new Response(JSON.stringify({ error: "Failed to fetch subscription" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const itemId = stripeSub.items?.data?.[0]?.id;
    if (!itemId) {
      return new Response(JSON.stringify({ error: "No subscription item found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determinar quantity (sempre recontamos)
    const { count: memberCount } = await supabaseAdmin
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id);
    const seatsToPay = Math.max(1, (memberCount ?? 0) - FREE_SEATS);

    // Determinar price (mantém o atual em sync_seats; troca em change_cycle)
    let targetPriceId = stripeSub.items?.data?.[0]?.price?.id as string;
    let targetCycle: SeatCycle =
      ((workspace as any).seat_cycle as SeatCycle) || "monthly";

    if (action === "change_cycle") {
      if (!newCycleRaw || !SEAT_PRICE_IDS[newCycleRaw]) {
        return new Response(JSON.stringify({ error: "seatCycle inválido (monthly|annual)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetPriceId = SEAT_PRICE_IDS[newCycleRaw];
      targetCycle = newCycleRaw;
    }

    const updateParams = new URLSearchParams({
      [`items[0][id]`]: itemId,
      [`items[0][price]`]: targetPriceId,
      [`items[0][quantity]`]: String(seatsToPay),
      proration_behavior: "create_prorations",
    });

    const updateRes = await fetch(`https://api.stripe.com/v1/subscriptions/${stripeSubId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: updateParams,
    });
    const updatedSub = await updateRes.json();
    if (updatedSub.error) {
      console.error("Stripe update error:", updatedSub.error);
      return new Response(JSON.stringify({ error: updatedSub.error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refletir no DB (webhook também faz, mas evitamos lag)
    await supabaseAdmin
      .from("workspaces")
      .update({ paid_seats: seatsToPay, seat_cycle: targetCycle })
      .eq("id", workspace.id);

    console.log("Subscription synced:", { stripeSubId, seatsToPay, targetCycle });

    return new Response(
      JSON.stringify({ success: true, paid_seats: seatsToPay, seat_cycle: targetCycle }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
