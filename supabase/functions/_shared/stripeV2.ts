/**
 * Preços Rhitmo (live, BRL) e helpers Stripe compartilhados.
 *
 * Modelo comercial v3 (09/2026):
 *  - Assento: R$ 10,00/mês (R$ 96,00/ano) — cobrado para TODO mundo, inclusive o líder.
 *  - Add-on Bot do LÍDER: R$ 29,90/mês (R$ 287,04/ano), inclui 6h de bot/ciclo.
 *  - Entrada: 14 dias de teste sem cartão (workspaces.trial_ends_at).
 *
 * Workspaces com `billing_model = 'legacy'` mantêm o add-on antigo por liderado
 * (R$ 19,90 / 4h) e o plano "líder + 3 grátis".
 */

export const V2_SEAT_PRICE_IDS = {
  monthly: "price_1UBQHhIF4fHxJpjH6lOhfvCe",
  annual: "price_1UBQJBIF4fHxJpjH24Oz1jCh",
} as const;

/** Add-on atual: bot do líder, 6h por ciclo. */
export const V2_BOT_ADDON_PRICE_IDS = {
  monthly: "price_1UHUfsIF4fHxJpjH7DPp50TN",
  annual: "price_1UHUglIF4fHxJpjHWn4xjTim",
} as const;

/** Add-on antigo (por liderado, 4h) — reconhecido para assinaturas vigentes. */
export const LEGACY_BOT_ADDON_PRICE_IDS = {
  monthly: "price_1UBQHmIF4fHxJpjHJwdAr0Jg",
  annual: "price_1UBQKeIF4fHxJpjHQl72KrZw",
} as const;

export const V2_ADDON_INCLUDED_HOURS = 6;
export const LEGACY_ADDON_INCLUDED_HOURS = 4;

export type BillingCycle = "monthly" | "annual";

export function isV2SeatPrice(priceId?: string | null): boolean {
  return priceId === V2_SEAT_PRICE_IDS.monthly || priceId === V2_SEAT_PRICE_IDS.annual;
}

export function isV2BotAddonPrice(priceId?: string | null): boolean {
  return (
    priceId === V2_BOT_ADDON_PRICE_IDS.monthly ||
    priceId === V2_BOT_ADDON_PRICE_IDS.annual ||
    priceId === LEGACY_BOT_ADDON_PRICE_IDS.monthly ||
    priceId === LEGACY_BOT_ADDON_PRICE_IDS.annual
  );
}

export function cycleFromV2Price(priceId?: string | null): BillingCycle | null {
  if (
    priceId === V2_SEAT_PRICE_IDS.monthly ||
    priceId === V2_BOT_ADDON_PRICE_IDS.monthly ||
    priceId === LEGACY_BOT_ADDON_PRICE_IDS.monthly
  ) {
    return "monthly";
  }
  if (
    priceId === V2_SEAT_PRICE_IDS.annual ||
    priceId === V2_BOT_ADDON_PRICE_IDS.annual ||
    priceId === LEGACY_BOT_ADDON_PRICE_IDS.annual
  ) {
    return "annual";
  }
  return null;
}

const STRIPE_API = "https://api.stripe.com/v1";

export async function stripeFetch<T = Record<string, unknown>>(
  path: string,
  init: { method?: string; body?: URLSearchParams } = {},
): Promise<T> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");

  const res = await fetch(`${STRIPE_API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: init.body,
  });

  const json = await res.json();
  if (!res.ok || json?.error) {
    throw new Error(json?.error?.message ?? `Stripe ${path} falhou (${res.status})`);
  }
  return json as T;
}

export interface StripeSubscriptionItem {
  id: string;
  quantity?: number;
  price?: { id?: string };
}

export interface StripeSubscription {
  id: string;
  status: string;
  cancel_at_period_end?: boolean;
  trial_end?: number | null;
  current_period_end?: number | null;
  metadata?: Record<string, string>;
  items?: { data: StripeSubscriptionItem[] };
}

export function findSeatItem(sub: StripeSubscription): StripeSubscriptionItem | undefined {
  return sub.items?.data?.find((i) => isV2SeatPrice(i.price?.id));
}

export function findBotAddonItem(sub: StripeSubscription): StripeSubscriptionItem | undefined {
  return sub.items?.data?.find((i) => isV2BotAddonPrice(i.price?.id));
}
