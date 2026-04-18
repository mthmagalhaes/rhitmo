import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Pro is the only paid plan now. Three billing cycles, no monthly.
// Behavior change shipped 18/04/2026: Mensal removed in favor of cycles >= 90 dias
// to align billing with the time required for real leadership behavior change.
const PRO_PRICE_IDS: Record<string, string> = {
  quarterly: "price_1TNNnEIF4fHxJpjHA4cMp1tm",   // R$ 267 / 3 meses
  semiannual: "price_1TNNnXIF4fHxJpjH6uHkOIIJ",  // R$ 504 / 6 meses
  annual: "price_1TNNnlIF4fHxJpjHfVwPUqAb",      // R$ 948 / ano
};

type BillingCycle = keyof typeof PRO_PRICE_IDS;

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

    const userId = user.id;
    const userEmail = user.email!;

    // Accept { plan: 'pro', billingCycle: 'quarterly'|'semiannual'|'annual' }.
    // For backwards compatibility, default to 'annual' if not specified.
    const body = await req.json().catch(() => ({}));
    const plan: string = body.plan ?? "pro";
    const billingCycle: BillingCycle = (body.billingCycle ?? body.cycle ?? "annual") as BillingCycle;

    if (plan !== "pro") {
      return new Response(
        JSON.stringify({ error: "Apenas o plano Pro está disponível para auto-checkout. Para Enterprise, fale com vendas." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!PRO_PRICE_IDS[billingCycle]) {
      return new Response(JSON.stringify({ error: "Ciclo de faturamento inválido. Use quarterly, semiannual ou annual." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get workspace
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (wsError || !workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

    // Search for existing Stripe customer
    const searchRes = await fetch(
      `https://api.stripe.com/v1/customers/search?query=email:'${userEmail}'`,
      {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      }
    );
    const searchData = await searchRes.json();
    let customerId: string;

    if (searchData.data?.length > 0) {
      customerId = searchData.data[0].id;
    } else {
      const createRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: userEmail,
          "metadata[workspace_id]": workspace.id,
          "metadata[user_id]": userId,
        }),
      });
      const createData = await createRes.json();
      customerId = createData.id;
    }

    console.log("Creating checkout session:", { plan, billingCycle, customerId, workspaceId: workspace.id });

    const params = new URLSearchParams({
      mode: "subscription",
      customer: customerId,
      "line_items[0][price]": PRO_PRICE_IDS[billingCycle],
      "line_items[0][quantity]": "1",
      allow_promotion_codes: "true",
      success_url: "https://rhitmo.co/billing?success=true",
      cancel_url: "https://rhitmo.co/billing",
      "metadata[workspace_id]": workspace.id,
      "metadata[billing_cycle]": billingCycle,
      "subscription_data[metadata][workspace_id]": workspace.id,
      "subscription_data[metadata][billing_cycle]": billingCycle,
    });

    // 14-day trial only for the entry tier (quarterly).
    if (billingCycle === "quarterly") {
      params.set("subscription_data[trial_period_days]", "14");
    }

    const sessionRes = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      }
    );
    const session = await sessionRes.json();

    if (session.error) {
      console.error("Stripe error:", session.error);
      return new Response(JSON.stringify({ error: session.error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
