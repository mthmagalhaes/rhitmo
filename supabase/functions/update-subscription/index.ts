import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_IDS: Record<string, string> = {
  pro: "price_1TCQeZIF4fHxJpjH7w0wOhaf",
  business: "price_1TCQf0IF4fHxJpjH4Bx2aIbg",
};

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

    const { newPlan, quantity = 1 } = await req.json();

    if (!newPlan || !PRICE_IDS[newPlan]) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (newPlan === "business" && quantity < 3) {
      return new Response(
        JSON.stringify({ error: "O plano Business requer no mínimo 3 líderes." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get workspace
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (wsError || !workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current subscription from DB
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("workspace_id", workspace.id)
      .in("status", ["trialing", "active", "past_due"])
      .maybeSingle();

    if (subError || !subscription?.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
    const stripeSubId = subscription.stripe_subscription_id;

    // Fetch current subscription from Stripe to get item ID
    const subRes = await fetch(
      `https://api.stripe.com/v1/subscriptions/${stripeSubId}`,
      { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } }
    );
    const stripeSub = await subRes.json();

    if (stripeSub.error) {
      console.error("Stripe fetch error:", stripeSub.error);
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

    // Update subscription in Stripe
    const updateParams = new URLSearchParams({
      [`items[0][id]`]: itemId,
      [`items[0][price]`]: PRICE_IDS[newPlan],
      [`items[0][quantity]`]: String(quantity),
      proration_behavior: "create_prorations",
    });

    console.log("Updating subscription:", { stripeSubId, newPlan, quantity, itemId });

    const updateRes = await fetch(
      `https://api.stripe.com/v1/subscriptions/${stripeSubId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: updateParams,
      }
    );
    const updatedSub = await updateRes.json();

    if (updatedSub.error) {
      console.error("Stripe update error:", updatedSub.error);
      return new Response(JSON.stringify({ error: updatedSub.error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Subscription updated successfully:", updatedSub.id);

    // Webhook will handle DB sync via customer.subscription.updated
    return new Response(
      JSON.stringify({ success: true, plan: newPlan, quantity }),
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
