// Regra única de direito ao bot de reunião no modelo v3 (bolsa de horas do LÍDER:
// add-on ativo ou teste de 14 dias). Usada pelo envio manual (schedule-recall-bot)
// e pelo envio automático da agenda (fetch-calendar-events), para que nenhum
// caminho mande bot sem direito.
// deno-lint-ignore-file no-explicit-any

export const V3_ADDON_HOURS = 6;
export const V3_TRIAL_HOURS = 6;

export type BotEntitlement =
  | { applies: false }
  | {
    applies: true;
    allowed: boolean;
    code?: "v3_no_bot_available" | "v3_addon_hours_cap" | "v3_trial_hours_cap";
    message?: string;
    basis: "addon" | "trial" | "none" | "grandfathered";
    hoursUsed: number;
    hoursCap: number;
    workspaceId: string;
  };

const WS_FIELDS = "id, billing_model, grandfather_until, trial_ends_at";

export async function checkV3BotEntitlement(admin: any, userId: string): Promise<BotEntitlement> {
  const { data: owned } = await admin.from("workspaces").select(WS_FIELDS).eq("owner_id", userId);
  const { data: led } = await admin.from("teams").select(`workspaces(${WS_FIELDS})`).eq("leader_user_id", userId);
  const candidates: any[] = [...(owned ?? []), ...((led ?? []).map((t: any) => t.workspaces).filter(Boolean))];
  const ws = candidates.find((c) => c?.billing_model === "v3");
  if (!ws) return { applies: false };

  const workspaceId = ws.id as string;
  const grandfathered = !!ws.grandfather_until &&
    new Date(ws.grandfather_until) >= new Date(new Date().toDateString());
  if (grandfathered) {
    return { applies: true, allowed: true, basis: "grandfathered", hoursUsed: 0, hoursCap: Infinity, workspaceId };
  }

  const { data: addonRow } = await admin
    .from("seat_addons")
    .select("id, included_hours")
    .eq("workspace_id", workspaceId)
    .eq("leader_user_id", userId)
    .eq("addon_type", "bot")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const trialEndsAt = ws.trial_ends_at ? new Date(ws.trial_ends_at) : null;
  const trialActive = !!trialEndsAt && trialEndsAt.getTime() > Date.now();

  if (!addonRow && !trialActive) {
    return {
      applies: true,
      allowed: false,
      code: "v3_no_bot_available",
      basis: "none",
      hoursUsed: 0,
      hoursCap: 0,
      workspaceId,
      message:
        "O teste de 14 dias terminou e não há add-on de bot ativo. Ative o bot de reunião do líder (R$ 29,90/mês, 6h) em Assinatura, ou conecte um note taker (Granola ou Fireflies) para esta reunião não depender do bot.",
    };
  }

  const basis: "addon" | "trial" = addonRow ? "addon" : "trial";
  const hoursCap = addonRow
    ? Number(addonRow.included_hours ?? V3_ADDON_HOURS) || V3_ADDON_HOURS
    : V3_TRIAL_HOURS;

  const windowStart = addonRow
    ? (() => {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    })()
    : new Date(trialEndsAt!.getTime() - 14 * 24 * 60 * 60 * 1000);

  const { data: leaderTeams } = await admin
    .from("teams").select("id").eq("workspace_id", workspaceId).eq("leader_user_id", userId);
  const teamIds = (leaderTeams ?? []).map((t: any) => t.id);
  let hoursUsed = 0;
  if (teamIds.length > 0) {
    const { data: members } = await admin.from("team_members").select("id").in("team_id", teamIds);
    const memberIds = (members ?? []).map((m: any) => m.id);
    if (memberIds.length > 0) {
      const { data: usage } = await admin
        .from("bot_usage_events")
        .select("machine_minutes")
        .eq("workspace_id", workspaceId)
        .in("member_id", memberIds)
        .gte("created_at", windowStart.toISOString());
      hoursUsed = (usage ?? []).reduce((s: number, r: any) => s + Number(r.machine_minutes ?? 0), 0) / 60;
    }
  }

  if (hoursCap - hoursUsed <= 0) {
    return {
      applies: true,
      allowed: false,
      code: basis === "addon" ? "v3_addon_hours_cap" : "v3_trial_hours_cap",
      basis,
      hoursUsed,
      hoursCap,
      workspaceId,
      message: basis === "addon"
        ? `As ${hoursCap}h de bot do seu add-on acabaram neste ciclo (${hoursUsed.toFixed(1)}h usadas). Espere a renovação do ciclo ou conecte um note taker (Granola ou Fireflies) para esta reunião.`
        : `As ${hoursCap}h de bot do teste de 14 dias acabaram (${hoursUsed.toFixed(1)}h usadas). Ative o bot de reunião do líder (R$ 29,90/mês, 6h) em Assinatura, ou conecte um note taker.`,
    };
  }

  return { applies: true, allowed: true, basis, hoursUsed, hoursCap, workspaceId };
}
