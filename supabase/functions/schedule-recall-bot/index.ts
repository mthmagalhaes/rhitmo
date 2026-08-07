import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RECALL_API_KEY = Deno.env.get("RECALL_API_KEY");

  if (!RECALL_API_KEY) {
    return new Response(JSON.stringify({ error: "RECALL_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.id;

    // Parse body
    const body = await req.json();
    const { meeting_id, meeting_url, member_id, start_time, trigger_source } = body;

    // 'manual' = botão "Transcrever" antes da reunião.
    // 'manual_retroactive' = botão "Enviar bot agora" quando a reunião já começou
    // (ou o bot automático não entrou). joinAt vira agora+30s nesse caso.
    // 'auto_calendar' = fetch-calendar-events agendando 2min antes do start.
    const triggerSource: "manual" | "manual_retroactive" | "auto_calendar" =
      trigger_source === "auto_calendar"
        ? "auto_calendar"
        : trigger_source === "manual_retroactive"
        ? "manual_retroactive"
        : "manual";

    if (!meeting_url || !start_time) {
      return new Response(JSON.stringify({ error: "meeting_url and start_time are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check bot meeting cap based on plan
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve o plano considerando TODOS os workspaces do usuário: os que ele
    // possui E os que ele lidera. Antes olhávamos só owner_id primeiro, então
    // um líder com workspace legado "pulse" (ex.: Douglas / Tharyane) era
    // bloqueado mesmo liderando time em workspace enterprise+beta.
    const { data: ownedWorkspaces } = await supabaseAdmin
      .from("workspaces")
      .select("plan_tier, is_beta_user")
      .eq("owner_id", userId);

    const { data: ledTeams } = await supabaseAdmin
      .from("teams")
      .select("workspaces(plan_tier, is_beta_user)")
      .eq("leader_user_id", userId);

    // Caps por plano. Pro/Business/Enterprise = bot ilimitado.
    // "business" é legado (clientes fundadores); "enterprise" é o tier atual
    // do Faster — sua ausência aqui só não causou incidente porque o workspace
    // também tem is_beta_user = true.
    const BOT_CAPS: Record<string, number> = {
      pulse: 0,
      pro: Infinity,
      business: Infinity,
      enterprise: Infinity,
    };

    const candidates: Array<{ plan_tier: string | null; is_beta_user: boolean | null }> = [
      ...(ownedWorkspaces ?? []),
      ...((ledTeams ?? [])
        .map((t: any) => t.workspaces)
        .filter(Boolean) as Array<{ plan_tier: string | null; is_beta_user: boolean | null }>),
    ];

    const isBeta = candidates.some((c) => c?.is_beta_user === true);
    const bestCap = candidates.reduce(
      (acc, c) => Math.max(acc, BOT_CAPS[c?.plan_tier ?? "pulse"] ?? 0),
      0,
    );
    const maxBotMeetings = isBeta ? Infinity : bestCap;

    if (maxBotMeetings === 0) {
      return new Response(JSON.stringify({ error: "Seu plano não inclui transcrição com bot. Faça upgrade para Pro." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (maxBotMeetings !== Infinity) {
      // Count bots scheduled this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: botCount } = await supabaseAdmin
        .from("recall_bots")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .neq("status", "error")
        .gte("created_at", startOfMonth.toISOString());

      if ((botCount || 0) >= maxBotMeetings) {
        return new Response(JSON.stringify({ error: `Limite de ${maxBotMeetings} reuniões com bot atingido este mês. Faça upgrade para aumentar o limite.` }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check if bot already scheduled for this meeting (by meeting_id or meeting_url).
    // Estados "finais sem sucesso" (skipped_no_leader, error, unrecoverable, done)
    // NÃO bloqueiam um novo envio — é exatamente o caso de resgate manual em que
    // o líder chegou atrasado depois do bot automático ter sido removido.
    const TERMINAL_OR_RECOVERABLE = ["error", "skipped_no_leader", "unrecoverable", "done"];
    const LIVE_STATUSES = ["scheduled", "joining", "in_waiting_room", "in_call_recording", "recording", "in_call_not_recording", "processing"];

    if (meeting_id) {
      const { data: existing } = await supabaseAdmin
        .from("recall_bots")
        .select("id, status")
        .eq("user_id", userId)
        .eq("meeting_id", meeting_id)
        .in("status", LIVE_STATUSES)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "Bot already scheduled for this meeting", bot: existing }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback dedup by meeting_url — só bloqueia se já existe bot VIVO.
    // Bots em estado terminal (skipped_no_leader, error, done, unrecoverable) são histórico,
    // e o líder pode (e deve poder) reenviar manualmente.
    const { data: existingByUrl } = await supabaseAdmin
      .from("recall_bots")
      .select("id, status")
      .eq("user_id", userId)
      .eq("meeting_url", meeting_url)
      .in("status", LIVE_STATUSES)
      .maybeSingle();

    if (existingByUrl) {
      return new Response(JSON.stringify({ error: "Bot already scheduled for this meeting URL", bot: existingByUrl }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Schedule bot via Recall.ai API.
    // - auto_calendar / manual antes do início: join 2min antes do start (scheduled bot).
    // - manual_retroactive: bot ad-hoc REAL (omitimos join_at). Quando join_at é null
    //   ou < 10min no futuro, a Recall trata como ad-hoc e o bot entra "agora".
    //   Limite: só permite resgate se start_time está dentro dos últimos 45min.
    const startMs = new Date(start_time).getTime();
    const nowMs = Date.now();
    const minutesSinceStart = (nowMs - startMs) / 60_000;

    if (triggerSource === "manual_retroactive" && minutesSinceStart > 45) {
      return new Response(JSON.stringify({
        error: "A reunião começou há mais de 45 minutos. Não dá pra recuperar com bot retroativo.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Bot agendado normal: join 2min antes; se já estourou esse horário (mas
    // ainda não é resgate), usar ad-hoc também.
    const idealJoin = startMs - 2 * 60 * 1000;
    const isAdhoc = triggerSource === "manual_retroactive" || idealJoin <= nowMs;
    const joinAt = isAdhoc ? null : new Date(idealJoin).toISOString();

    const recallPayload: Record<string, unknown> = {
      meeting_url: meeting_url,
      bot_name: "Rhitmo",
      chat: {
        on_bot_join: {
          send_to: "everyone",
          message: "👋 Olá! Sou o assistente Rhitmo. Esta reunião está sendo transcrita para fins de anotações e desenvolvimento profissional. Se tiver dúvidas, fale com seu líder.",
          pin: true,
        },
      },
      recording_config: {
        transcript: {
          provider: {
            recallai_streaming: {
              mode: "prioritize_accuracy",
              language_code: "auto",
            },
          },
        },
      },
      automatic_leave: {
        // 600s é o teto da Recall pra Google Meet — dá margem real pro host aceitar.
        waiting_room_timeout: 600,
        in_call_not_recording_timeout: 180,
        noone_joined_timeout: 300,
      },
    };
    if (joinAt) recallPayload.join_at = joinAt;

    // Retry com backoff curto pros transientes/ad-hoc pool da Recall (429/502/503/504/507).
    async function callRecallWithRetry(maxAttempts = 3): Promise<Response> {
      let attempt = 0;
      let lastResp: Response | null = null;
      while (attempt < maxAttempts) {
        attempt++;
        const resp = await fetch("https://us-west-2.recall.ai/api/v1/bot/", {
          method: "POST",
          headers: {
            "Authorization": `Token ${RECALL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(recallPayload),
        });
        if (resp.ok) return resp;
        const transient = [429, 502, 503, 504, 507].includes(resp.status);
        lastResp = resp;
        if (!transient || attempt >= maxAttempts) return resp;
        const retryAfter = Number(resp.headers.get("Retry-After"));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 8000)
          : 1500 * attempt;
        console.warn(`Recall ${resp.status} on attempt ${attempt}/${maxAttempts}, retrying in ${waitMs}ms`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
      return lastResp!;
    }

    const recallResponse = await callRecallWithRetry();
    const recallData = await recallResponse.json().catch(() => ({}));

    if (!recallResponse.ok) {
      console.error("Recall.ai API error:", recallResponse.status, recallData);
      const rawReason = JSON.stringify(recallData ?? {}).toLowerCase();
      const isCredit = rawReason.includes("insufficient_credit_balance") || rawReason.includes("credit");
      const userMsg = isCredit
        ? "A conta de transcrição do Rhitmo está sem saldo. Avise o time do Rhitmo — não é limitação do seu plano."
        : recallResponse.status === 507
        ? "Sem capacidade ad-hoc no momento. Tente de novo em alguns segundos."
        : recallResponse.status === 429
        ? "Muitas solicitações ao mesmo tempo. Aguarde alguns segundos e tente de novo."
        : recallResponse.status >= 500
        ? "Falha temporária do serviço de bots. Tente de novo."
        : "Não foi possível enviar o bot.";

      // Deixa rastro para o card "Próximas 1:1s" e para o suporte.
      await supabaseAdmin.from("recall_bots").insert({
        user_id: userId,
        meeting_id: meeting_id || null,
        member_id: member_id || null,
        meeting_url: meeting_url,
        status: "error",
        scheduled_at: joinAt ?? new Date(nowMs).toISOString(),
        leader_email: authUser.email || null,
        trigger_source: triggerSource,
        error_message: `Falha ao agendar bot (${recallResponse.status}): ${JSON.stringify(recallData).slice(0, 300)}`,
      });

      return new Response(JSON.stringify({ error: userMsg, details: recallData, status: recallResponse.status }), {
        status: recallResponse.status === 507 || recallResponse.status === 429 ? recallResponse.status : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save bot record with leader email for presence detection
    const leaderEmail = authUser.email || null;

    const { data: botRecord, error: insertError } = await supabaseAdmin
      .from("recall_bots")
      .insert({
        user_id: userId,
        meeting_id: meeting_id || null,
        member_id: member_id || null,
        recall_bot_id: recallData.id,
        meeting_url: meeting_url,
        status: isAdhoc ? "joining" : "scheduled",
        scheduled_at: joinAt ?? new Date(nowMs).toISOString(),
        leader_email: leaderEmail,
        trigger_source: triggerSource,
      })
      .select("id, status, scheduled_at")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Bot scheduled but failed to save record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Bot scheduled: ${recallData.id} for meeting ${meeting_id || meeting_url} (provider: recallai_streaming/auto)`);

    return new Response(JSON.stringify({ success: true, bot: botRecord, recall_bot_id: recallData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
