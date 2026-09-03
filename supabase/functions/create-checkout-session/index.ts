import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  V2_SEAT_PRICE_IDS,
  V2_BOT_ADDON_PRICE_IDS,
} from "../_shared/stripeV2.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================================
// Pricing v3 — Modelo Windmill (single plan, per-seat)
// Líder + 3 liderados grátis. R$ 49,90/mês ou R$ 478,80/ano por seat adicional.
// Workspaces grandfathered (grandfather_until >= hoje) NÃO podem abrir checkout.
//
// Pricing v2 (workspaces com ui_version = 'v2'): assento R$ 10,00/mês sem bot,
// + add-on de bot R$ 19,90/mês por assento (4h/mês). Ver _shared/stripeV2.ts.
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

    const userEmail = user.email!;

    const body = await req.json().catch(() => ({}));
    const seatCycle: SeatCycle = (body.seatCycle ?? body.cycle ?? "monthly") as SeatCycle;
    if (!SEAT_PRICE_IDS[seatCycle]) {
      return new Response(JSON.stringify({ error: "Ciclo inválido. Use monthly ou annual." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Workspace do usuário (Owner)
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from("workspaces")
      .select("id, grandfather_until, paid_seats")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (wsError || !workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bloquear checkout se workspace está em período grandfathered
    const grandfatherUntil = (workspace as any).grandfather_until as string | null;
    const isGrandfathered = !!grandfatherUntil && new Date(grandfatherUntil) >= new Date(new Date().toDateString());
    if (isGrandfathered) {
      return new Response(
        JSON.stringify({
          blocked: true,
          reason: "grandfathered",
          grandfather_until: grandfatherUntil,
          message: `Você é Early Adopter até ${grandfatherUntil}. Nada a pagar.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calcular seats pagos = total de liderados − 3 free (mínimo 1 para checkout)
    const { count: memberCount, error: countErr } = await supabaseAdmin
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id);

    if (countErr) {
      console.error("Count members error:", countErr);
    }

    const total = memberCount ?? 0;
    const requestedSeats: number | undefined = body.seats;
    const seatsToPay = Math.max(1, requestedSeats ?? (total - FREE_SEATS));

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

    // Customer Stripe (busca por email, cria se não existir)
    const searchRes = await fetch(
      `https://api.stripe.com/v1/customers/search?query=email:'${userEmail}'`,
      { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } }
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
          "metadata[user_id]": user.id,
        }),
      });
      const createData = await createRes.json();
      customerId = createData.id;
    }

    console.log("Creating per-seat checkout:", {
      customerId,
      workspaceId: workspace.id,
      seatCycle,
      seatsToPay,
    });

    const isV2 = ((workspace as any).ui_version as string | null) === "v2";
    const seatPriceId = isV2 ? V2_SEAT_PRICE_IDS[seatCycle] : SEAT_PRICE_IDS[seatCycle];

    // Add-on de bot: só existe no v2. quantity = assentos que já vão ativar bot
    // no momento do checkout (0 é válido → nenhum line item de add-on).
    const rawBotSeats = Number(body.botSeats ?? 0);
    const botSeats = isV2 && Number.isFinite(rawBotSeats)
      ? Math.max(0, Math.min(Math.floor(rawBotSeats), seatsToPay))
      : 0;

    const params = new URLSearchParams({
      mode: "subscription",
      customer: customerId,
      "line_items[0][price]": seatPriceId,
      "line_items[0][quantity]": String(seatsToPay),
      allow_promotion_codes: "true",
      success_url: "https://rhitmo.co/billing?success=true",
      cancel_url: "https://rhitmo.co/billing",
      "metadata[workspace_id]": workspace.id,
      "metadata[seat_cycle]": seatCycle,
      "metadata[paid_seats]": String(seatsToPay),
      "metadata[ui_version]": isV2 ? "v2" : "v1",
      "metadata[bot_addon_seats]": String(botSeats),
      "subscription_data[metadata][workspace_id]": workspace.id,
      "subscription_data[metadata][seat_cycle]": seatCycle,
      "subscription_data[metadata][ui_version]": isV2 ? "v2" : "v1",
    });

    if (botSeats > 0) {
      params.set("line_items[1][price]", V2_BOT_ADDON_PRICE_IDS[seatCycle]);
      params.set("line_items[1][quantity]", String(botSeats));
    }


    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const session = await sessionRes.json();

    if (session.error) {
      console.error("Stripe error:", session.error);
      return new Response(JSON.stringify({ error: session.error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ url: session.url, seats: seatsToPay, seat_cycle: seatCycle }),
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
